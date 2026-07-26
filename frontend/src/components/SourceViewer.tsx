import { useEffect, useState } from 'react';
import { api, Source } from '@/lib/api';

interface SourceViewerProps {
  notebookId: string | null;
  sourceId: string | null;
  onClose: () => void;
}

export default function SourceViewer({ notebookId, sourceId, onClose }: SourceViewerProps) {
  const [source, setSource] = useState<Source | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (notebookId && sourceId) {
      setLoading(true);
      api.sources.getContent(notebookId, sourceId)
        .then(data => {
          setSource(data.source);
          setContent(data.content);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setSource(null);
      setContent('');
    }
  }, [notebookId, sourceId]);

  if (!sourceId) {
    return (
      <div className="flex-1 p-8 text-sm text-gray-500 text-center flex items-center justify-center">
        <p>Click a citation in the chat to view the source document here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500 animate-pulse">Loading source...</p>
        </div>
      ) : source ? (
        <>
          <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50">
            <div className="pr-4">
              <h3 className="font-medium text-gray-800 text-sm truncate" title={source.title}>{source.title}</h3>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{source.type}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            {source.type === 'web' || source.type === 'youtube' ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <a href={source.title} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center space-x-1">
                  <span>Open Original Link</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
              </div>
            ) : null}
            
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-sans leading-relaxed text-[13px]">
              {content || <span className="italic text-gray-400">No extracted content available.</span>}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-500">Source not found.</p>
        </div>
      )}
    </div>
  );
}
