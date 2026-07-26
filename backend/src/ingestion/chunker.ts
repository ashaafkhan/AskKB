import { ExtractedBlock } from './extractors/types';
import { v4 as uuidv4 } from 'uuid';

export interface Chunk {
  id: string;
  text: string;
  metadata: Record<string, any>;
  orderIndex: number;
}

const TARGET_CHUNK_SIZE_CHARS = 2000; // ~500 tokens (4 chars/token approx)
const OVERLAP_CHARS = 200; // ~50 tokens overlap

export function chunkBlocks(blocks: ExtractedBlock[]): Chunk[] {
  const chunks: Chunk[] = [];
  let currentOrder = 0;

  for (const block of blocks) {
    let currentText = block.text;
    
    // If block is small enough, keep it as one chunk (common for VTT/YouTube cues)
    if (currentText.length <= TARGET_CHUNK_SIZE_CHARS) {
      chunks.push({
        id: uuidv4(),
        text: currentText,
        metadata: { ...block.metadata },
        orderIndex: currentOrder++
      });
      continue;
    }

    // Split large text blocks (e.g., PDF pages, Web articles)
    let startIndex = 0;
    while (startIndex < currentText.length) {
      let endIndex = startIndex + TARGET_CHUNK_SIZE_CHARS;
      
      // Try to find a sentence boundary (period, newline) to split cleanly
      if (endIndex < currentText.length) {
        const boundarySearch = currentText.substring(endIndex - 100, endIndex + 100);
        const match = boundarySearch.match(/[.!?\n]/);
        if (match && match.index !== undefined) {
          endIndex = (endIndex - 100) + match.index + 1;
        }
      } else {
        endIndex = currentText.length;
      }

      const chunkText = currentText.substring(startIndex, endIndex);
      chunks.push({
        id: uuidv4(),
        text: chunkText,
        metadata: { ...block.metadata, char_start: startIndex, char_end: endIndex },
        orderIndex: currentOrder++
      });

      startIndex = endIndex - OVERLAP_CHARS;
      if (startIndex < 0) startIndex = 0;
      
      // Prevent infinite loop if we make no forward progress
      if (endIndex <= startIndex) break;
    }
  }

  return chunks;
}
