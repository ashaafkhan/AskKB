import { RetrievedContext } from './retriever';

export function buildSystemPrompt(context: RetrievedContext[]): string {
  let prompt = `You are a helpful AI assistant. You are answering a user's question based strictly on the provided context documents from their personal knowledge base.

Instructions:
1. Answer the question using ONLY the information in the provided context.
2. If the answer cannot be found in the context, politely state that you do not know based on the provided documents.
3. Cite your sources implicitly or explicitly if helpful (e.g., "According to [Document 1]...").

Context Documents:
------------------\n`;

  context.forEach((doc, index) => {
    prompt += `\n[Document ${index + 1} | Source ID: ${doc.sourceId}]\n${doc.text}\n`;
  });

  prompt += `\n------------------\nEnd of Context Documents.`;
  return prompt;
}
