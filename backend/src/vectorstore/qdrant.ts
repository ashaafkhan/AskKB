import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = 'askkb_chunks';
const VECTOR_SIZE = 768; // Gemini text-embedding-004 vector size

export async function initVectorStore() {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    if (!exists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
    }
  } catch (err) {
    console.error('Error initializing Qdrant:', err);
  }
}

export async function upsertVectors(points: { id: string, vector: number[], payload: any }[]) {
  if (points.length === 0) return;
  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });
}

export async function deleteSourceVectors(sourceId: string) {
  await client.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [
        {
          key: 'source_id',
          match: { value: sourceId }
        }
      ]
    }
  });
}

export async function queryVectors(vector: number[], notebookId: string, limit: number = 5) {
  const result = await client.search(COLLECTION_NAME, {
    vector,
    limit,
    filter: {
      must: [
        {
          key: 'notebook_id',
          match: { value: notebookId }
        }
      ]
    },
    with_payload: true,
  });

  return result;
}
