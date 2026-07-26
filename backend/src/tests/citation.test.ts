import { buildSystemPrompt } from '../rag/prompt';

describe('Citation Correctness', () => {
  it('correctly maps chunks to citation tags in the system prompt', () => {
    const mockContext = [
      {
        id: 'chunk-1',
        sourceId: 'source-abc',
        text: 'This is the first piece of knowledge.',
        metadata: {},
        score: 0.99
      },
      {
        id: 'chunk-2',
        sourceId: 'source-def',
        text: 'This is the second piece of knowledge.',
        metadata: {},
        score: 0.88
      }
    ];

    const prompt = buildSystemPrompt(mockContext);

    // The prompt MUST contain the explicit citation format for the LLM to follow.
    expect(prompt).toContain('[Document 1 | Source ID: source-abc]');
    expect(prompt).toContain('This is the first piece of knowledge.');
    
    expect(prompt).toContain('[Document 2 | Source ID: source-def]');
    expect(prompt).toContain('This is the second piece of knowledge.');

    // The instructions should explicitly demand using the context
    expect(prompt).toContain('using ONLY the information in the provided context');
  });
});
