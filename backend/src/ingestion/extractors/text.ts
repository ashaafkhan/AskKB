import fs from 'fs';
import { ExtractedBlock } from './types';

export async function extractText(filePath: string): Promise<ExtractedBlock[]> {
  const text = fs.readFileSync(filePath, 'utf-8');
  
  // For plain text, we can return the whole text as one block, 
  // or split it by double newlines into paragraphs. 
  // Returning the whole text with char offsets for Stage 3 to chunk further is fine.
  
  return [{
    text,
    metadata: { char_start: 0, char_end: text.length }
  }];
}
