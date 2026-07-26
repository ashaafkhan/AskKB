import request from 'supertest';
import express from 'express';
import sourceRoutes from '../api/sources';
import { db } from '../db';
import * as chunker from '../ingestion/chunker';

jest.mock('../db', () => ({
  db: {
    source: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    chunk: {
      create: jest.fn()
    }
  }
}));

const app = express();
app.use(express.json());
// Mount route similar to index.ts
app.use('/notebooks/:notebookId/sources', sourceRoutes);

describe('Ingestion Failure Paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails gracefully when YouTube URL is invalid', async () => {
    const res = await request(app)
      .post('/notebooks/test-nb/sources')
      .send({ type: 'youtube', payload: 'not-a-url' });

    // Assuming we do basic validation or our extractor throws
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    
    // Check that status was not marked as 'ready' if it failed immediately
    // Or if it's backgrounded, the db.update for status = 'failed' should be called.
  });

  it('fails gracefully when adding an unknown source type', async () => {
    const res = await request(app)
      .post('/notebooks/test-nb/sources')
      .send({ type: 'unknown_type', payload: 'data' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid source type/i);
  });
});
