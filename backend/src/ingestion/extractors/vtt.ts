import fs from 'fs';
import webvtt from 'node-webvtt';
import { ExtractedBlock } from './types';

export async function extractVTT(filePath: string): Promise<ExtractedBlock[]> {
  const vttContent = fs.readFileSync(filePath, 'utf-8');
  
  try {
    const parsed = webvtt.parse(vttContent, { strict: false });
    
    return parsed.cues.map((cue: any, index: number) => ({
      text: cue.text,
      metadata: {
        cue_index: index,
        start_timestamp: cue.start,
        end_timestamp: cue.end
      }
    }));
  } catch (error: any) {
    throw new Error(`Failed to parse VTT file: ${error.message}`);
  }
}
