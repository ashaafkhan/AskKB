import { Router } from 'express';
import multer from 'multer';
import { db } from '../db';
import { extractPDF } from '../ingestion/extractors/pdf';
import { extractText } from '../ingestion/extractors/text';
import { extractWeb } from '../ingestion/extractors/web';
import { extractYouTube } from '../ingestion/extractors/youtube';
import { extractVTT } from '../ingestion/extractors/vtt';

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

    // For Stage 2, we just successfully extract and save raw data to a JSON field (or pause).
    // The PRD implies it moves to 'chunking' or 'ready'. 
    // We will save to a temporary field or just set status to 'ready' (we will chunk in Stage 3).
    // For now, let's store the blocks in a temporary field if possible, or just mark 'ready'.
    // We'll set status to 'ready' (simulating end of pipeline for now) and save metadata.

    await db.source.update({ 
      where: { id: sourceId }, 
      data: { 
        status: 'ready',
        // In Stage 3 we will move this to Chunks and Vectors instead of dumping into metadata
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
