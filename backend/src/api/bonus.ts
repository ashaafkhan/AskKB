import { Router } from 'express';
import Groq from 'groq-sdk';
import { db } from '../db';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const router = Router({ mergeParams: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /notebooks/:notebookId/bonus/roadmap
router.post('/roadmap', async (req, res) => {
  const { notebookId } = req.params;

  try {
    // 1. Fetch YouTube sources and their chunks
    const sources = await db.source.findMany({
      where: { notebookId, type: 'youtube' },
      include: { chunks: { orderBy: { orderIndex: 'asc' } } }
    });

    if (sources.length === 0) {
      return res.status(400).json({ error: 'No YouTube sources found in this notebook.' });
    }

    // 2. Prepare context for the LLM
    let context = 'Available YouTube videos and their transcripts:\n\n';
    sources.forEach(source => {
      const videoId = (source.metadata as any)?.videoId || '';
      context += `[Video Title: ${source.title} | Video ID: ${videoId}]\n`;
      source.chunks.slice(0, 20).forEach(chunk => { // Limit to avoid hitting token limits
        const start = (chunk.locationMetadata as any)?.start_seconds || 0;
        context += `(At ${start}s): ${chunk.content}\n`;
      });
      context += '\n';
    });

    // 3. Call LLM to generate roadmap
    const prompt = `You are an expert curriculum designer. Based on the following YouTube transcripts, create a step-by-step learning roadmap. 
Format your output in Markdown.
For each step, explain what to learn, and provide a deep link to the exact video timestamp. 
Format the links exactly like this: [Watch Video](https://youtube.com/watch?v=VIDEO_ID&t=START_SECONDSs) replacing VIDEO_ID and START_SECONDS with the correct values from the context.

Context:
${context}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      temperature: 0.3,
    });

    const roadmap = completion.choices[0]?.message?.content || 'Failed to generate roadmap.';
    res.json({ roadmap });

  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

// POST /notebooks/:notebookId/bonus/podcast
router.post('/podcast', async (req, res) => {
  const { notebookId } = req.params;

  try {
    // 1. Fetch all sources to summarize
    const sources = await db.source.findMany({
      where: { notebookId },
      include: { chunks: { orderBy: { orderIndex: 'asc' }, take: 10 } } // Sample a bit from each source
    });

    if (sources.length === 0) {
      return res.status(400).json({ error: 'No sources found in this notebook.' });
    }

    let context = 'Notebook Sources Overview:\n\n';
    sources.forEach(s => {
      context += `Source: ${s.title}\n`;
      s.chunks.forEach(c => context += `${c.content}\n`);
      context += '\n';
    });

    // 2. Generate Podcast Script
    const prompt = `You are a podcast host summarizing a set of documents for your listeners. 
Write a short, engaging 1-minute monologue (around 150-200 words) summarizing the key themes from the following sources.
Do not include any stage directions, sound effects, or introductory formatting (e.g. "Host:"). Just output the exact words to be spoken.

Sources:
${context}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      temperature: 0.7,
    });

    const script = completion.choices[0]?.message?.content || 'Welcome to the podcast. Today we have no topics to discuss.';

    // 3. Call Google Cloud TTS via REST API
    const googleTtsKey = process.env.GOOGLE_TTS_API_KEY;
    if (!googleTtsKey) {
      // If no TTS key, just return the script as text for testing
      return res.json({ script, audioBase64: null, warning: 'GOOGLE_TTS_API_KEY not provided.' });
    }

    const ttsResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleTtsKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: script },
        voice: { languageCode: 'en-US', name: 'en-US-Journey-F' }, // Using a nice voice
        audioConfig: { audioEncoding: 'MP3' }
      })
    });

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error('Google TTS error:', errText);
      throw new Error('Google TTS API failed');
    }

    const ttsData = await ttsResponse.json();
    
    // ttsData.audioContent is a base64 encoded string
    res.json({ script, audioBase64: ttsData.audioContent });

  } catch (error) {
    console.error('Error generating podcast:', error);
    res.status(500).json({ error: 'Failed to generate podcast' });
  }
});

export default router;
