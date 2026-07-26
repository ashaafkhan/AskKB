import { Router } from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { retrieveContext } from '../rag/retriever';
import { buildSystemPrompt } from '../rag/prompt';
import { db } from '../db';

dotenv.config({ path: '../../.env' });

const router = Router({ mergeParams: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/', async (req, res) => {
  const { notebookId } = req.params;
  const { messages } = req.body; // Expects an array of { role, content }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Get the latest user message for retrieval
  const lastUserMessage = messages[messages.length - 1].content;

  try {
    // 1. Retrieve relevant context
    const context = await retrieveContext(lastUserMessage, notebookId, 5);

    // 2. Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // 3. Prepare messages for Groq
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // 4. Set up Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 5. Call Groq with streaming enabled
    const stream = await groq.chat.completions.create({
      messages: groqMessages,
      model: 'llama3-8b-8192', // Make sure this model is available, or use llama3-70b-8192
      temperature: 0.2,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // We can stringify and send as a data packet
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }

    // Send closing event
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error during chat stream:', error);
    res.status(500).json({ error: 'An error occurred during chat' });
  }
});

export default router;
