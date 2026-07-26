import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { api, Source } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAreaProps {
  notebookId: string | null;
  onCitationClick?: (sourceId: string) => void;
}

export default function ChatArea({ notebookId, onCitationClick }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset chat when notebook changes
    setMessages([]);
    setInput('');
    if (notebookId) {
      api.sources.list(notebookId).then(setSources).catch(console.error);
    }
  }, [notebookId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !notebookId) return;

    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Add an empty assistant message to stream into
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('No readable stream available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkString = decoder.decode(value, { stream: true });
          const lines = chunkString.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '');
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  lastMsg.content += data.text;
                  return updated;
                });
              } catch (e) {
                console.error('Error parsing stream chunk:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Sorry, an error occurred while processing your request.';
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Helper to render citations
  const renderCitations = (content: string) => {
    // We will parse `[Document X | Source ID: xyz]` or similar and turn it into a clickable component
    const parts = content.split(/(\[Document \d+ \| Source ID: [a-zA-Z0-9-]+\])/g);
    
    return parts.map((part, i) => {
      const match = part.match(/\[Document (\d+) \| Source ID: ([a-zA-Z0-9-]+)\]/);
      if (match) {
        const docNum = match[1];
        const sourceId = match[2];
        return (
          <button 
            key={i} 
            onClick={() => onCitationClick && onCitationClick(sourceId)}
            className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Doc {docNum}
          </button>
        );
      }
      return <span key={i}><ReactMarkdown>{part}</ReactMarkdown></span>;
    });
  };

  if (!notebookId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
        <p>Select a notebook to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-4">
            <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <p className="max-w-sm">Ask questions based on your uploaded knowledge base. Try asking to summarize a document or extract key insights.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-800'}`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-[15px]">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {renderCitations(msg.content)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleSubmit} className="flex space-x-4 max-w-4xl mx-auto relative">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-full pl-6 pr-12 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[15px]"
            placeholder={sources.length === 0 ? "Add sources first to ask questions..." : "Ask anything about your knowledge base..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping || sources.length === 0}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping || sources.length === 0}
            className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-3">AskKB can make mistakes. Verify important information against your sources.</p>
      </div>
    </div>
  );
}
