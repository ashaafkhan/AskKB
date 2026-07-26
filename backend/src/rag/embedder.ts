import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  // Gemini API currently supports embedContent for single text, 
  // or batchEmbedContents for multiple. We will use batchEmbedContents.
  try {
    const requests = texts.map(text => ({
      content: { role: 'user', parts: [{ text }] }
    }));
    
    const result = await model.batchEmbedContents({
      requests
    });
    
    return result.embeddings.map(e => e.values);
  } catch (error) {
    console.error('Error embedding texts with Gemini:', error);
    throw error;
  }
}
