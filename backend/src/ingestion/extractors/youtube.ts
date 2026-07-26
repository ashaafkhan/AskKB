import { YoutubeTranscript } from 'youtube-transcript';
import { ExtractedBlock } from './types';

export async function extractYouTube(url: string): Promise<ExtractedBlock[]> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    
    // We group cues into chunks later, or we can just return each cue as a block
    // returning each cue as a block with its timestamp allows the chunker in Stage 3 
    // to group them together.
    
    return transcript.map(cue => ({
      text: cue.text,
      metadata: {
        start_seconds: cue.offset / 1000,
        duration: cue.duration / 1000,
      }
    }));
  } catch (error: any) {
    throw new Error(`Failed to extract YouTube transcript: ${error.message || 'No captions available'}`);
  }
}
