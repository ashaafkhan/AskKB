import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { ExtractedBlock } from './types';

export async function extractWeb(url: string): Promise<ExtractedBlock[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }
  
  const html = await response.text();
  const doc = new JSDOM(html, { url });
  
  const reader = new Readability(doc.window.document);
  const article = reader.parse();
  
  if (!article) {
    throw new Error('Failed to parse article content from URL');
  }

  return [{
    text: article.textContent,
    metadata: { url, title: article.title }
  }];
}
