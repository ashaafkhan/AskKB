import { Router } from 'express';
import multer from 'multer';
import { db } from '../db';
import { extractPDF } from '../ingestion/extractors/pdf';
import { extractText } from '../ingestion/extractors/text';
import { extractWeb } from '../ingestion/extractors/web';
import { extractYouTube } from '../ingestion/extractors/youtube';
import { extractVTT } from '../ingestion/extractors/vtt';
import { chunkBlocks } from '../ingestion/chunker';
import { embedTexts } from '../rag/embedder';
import { upsertVectors, deleteSourceVectors } from '../vectorstore/qdrant';

const upload = multer({ dest: 'uploads/' }); // Temporary local storage
const router = Router({ mergeParams: true }); // mergeParams to access :notebookId

router.post('/', upload.single('file'), async (req, res) => {
  const { notebookId } = req.params;
  const { type, url } = req.body;
  const file = req.file;

  if (!notebookId || !type) {
    return res.status(400).json({ error: 'notebookId and type are required' });
  }

  try {
    // 1. Register source as uploading
    let title = 'Unknown Source';
    let originalRef = '';

    if (type === 'web' || type === 'youtube') {
      if (!url) return res.status(400).json({ error: 'url is required for this type' });
      title = url;
      originalRef = url;
    } else {
      if (!file) return res.status(400).json({ error: 'file is required for this type' });
      title = file.originalname;
      originalRef = file.path;
    }

    const source = await db.source.create({
      data: {
        notebookId,
        type,
        title,
        originalRef,
        status: 'uploading',
      }
    });

    res.status(202).json(source);

    // 2. Process extraction asynchronously
    // In a real app this would be a background job (bullmq/celery)
    processExtraction(source.id, type, originalRef).catch(console.error);

  } catch (error) {
    console.error('Error adding source:', error);
    res.status(500).json({ error: 'Failed to add source' });
  }
});

router.get('/', async (req, res) => {
  const { notebookId } = req.params;
  try {
    const sources = await db.source.findMany({
      where: { notebookId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sources);
  } catch (error) {
    console.error('Error listing sources:', error);
    res.status(500).json({ error: 'Failed to list sources' });
  }
});

async function processExtraction(sourceId: string, type: string, ref: string) {
  try {
    await db.source.update({ where: { id: sourceId }, data: { status: 'extracting' } });

    let extractedBlocks: any[] = [];

    switch (type) {
      case 'pdf':
        extractedBlocks = await extractPDF(ref);
        break;
      case 'text':
        extractedBlocks = await extractText(ref);
        break;
      case 'web':
        extractedBlocks = await extractWeb(ref);
        break;
      case 'youtube':
        extractedBlocks = await extractYouTube(ref);
        break;
      case 'vtt':
        extractedBlocks = await extractVTT(ref);
        break;
      default:
        throw new Error(`Unsupported source type: ${type}`);
    }

    // Stage 3: Chunking
    await db.source.update({ where: { id: sourceId }, data: { status: 'chunking' } });
    const chunks = chunkBlocks(extractedBlocks);

    // Stage 3: Embedding
    await db.source.update({ where: { id: sourceId }, data: { status: 'embedding' } });
    
    // Batch process embeddings if chunks array is very large, but for demo we just do one batch.
    // Gemini has a limit on batch size, let's chunk the chunks array into batches of 100.
    const BATCH_SIZE = 100;
    const pointsToUpsert = [];
    
    const source = await db.source.findUnique({ where: { id: sourceId } });
    const notebookId = source?.notebookId || '';

    // First, clear old chunks if re-indexing (idempotency)
    await deleteSourceVectors(sourceId);
    await db.chunk.deleteMany({ where: { sourceId } });

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const textsToEmbed = batch.map(c => c.text);
      
      const embeddings = await embedTexts(textsToEmbed);
      
      // Save chunks to DB and construct Qdrant points
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const vector = embeddings[j];
        
        await db.chunk.create({
          data: {
            id: chunk.id,
            sourceId,
            notebookId,
            content: chunk.text,
            orderIndex: chunk.orderIndex,
            locationMetadata: chunk.metadata,
          }
        });

        pointsToUpsert.push({
          id: chunk.id,
          vector,
          payload: {
            source_id: sourceId,
            notebook_id: notebookId,
            text: chunk.text,
            ...chunk.metadata
          }
        });
      }
    }

    // Store embeddings in Vector DB
    await upsertVectors(pointsToUpsert);

    await db.source.update({ 
      where: { id: sourceId }, 
      data: { 
        status: 'ready',
      } 
    });

  } catch (error: any) {
    console.error(`Extraction failed for source ${sourceId}:`, error);
    await db.source.update({ 
      where: { id: sourceId }, 
      data: { 
        status: 'failed',
        errorMessage: error.message 
      } 
    });
  }
}

export default router;
