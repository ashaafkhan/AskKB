import { embedTexts } from './embedder';
import { queryVectors } from '../vectorstore/qdrant';

export interface RetrievedContext {
  id: string;
  sourceId: string;
  text: string;
  metadata: Record<string, any>;
  score: number;
}

export async function retrieveContext(query: string, notebookId: string, limit: number = 5): Promise<RetrievedContext[]> {
  // 1. Embed the query
  const embeddings = await embedTexts([query]);
  const queryVector = embeddings[0];

  // 2. Search Qdrant
  const results = await queryVectors(queryVector, notebookId, limit);

  // 3. Format results
  return results.map(result => ({
    id: result.id as string,
    sourceId: result.payload?.source_id as string || '',
    text: result.payload?.text as string || '',
    metadata: result.payload || {},
    score: result.score
  }));
}
