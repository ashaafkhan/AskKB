import { retrieveContext } from '../rag/retriever';
import * as qdrant from '../vectorstore/qdrant';
import * as embedder from '../rag/embedder';

// Mock dependencies
jest.mock('../vectorstore/qdrant');
jest.mock('../rag/embedder');

describe('Notebook Isolation Guarantee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('must strictly filter vector search by notebookId', async () => {
    const mockQuery = 'What is React?';
    const mockNotebookId = 'notebook-123';
    
    // Mock the embedding result
    const mockVector = [0.1, 0.2, 0.3];
    (embedder.embedTexts as jest.Mock).mockResolvedValue([mockVector]);

    // Mock qdrant query Vectors
    (qdrant.queryVectors as jest.Mock).mockResolvedValue([]);

    await retrieveContext(mockQuery, mockNotebookId, 5);

    // Verify that embedTexts was called with the query
    expect(embedder.embedTexts).toHaveBeenCalledWith([mockQuery]);

    // **CRITICAL ISOLATION ASSERTION**:
    // Verify that queryVectors was called exactly with the provided notebookId
    // If it was called without a notebookId, isolation is broken.
    expect(qdrant.queryVectors).toHaveBeenCalledWith(
      mockVector, 
      mockNotebookId, 
      5
    );
  });
});
