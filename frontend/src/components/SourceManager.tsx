import { useEffect, useState } from 'react';
import { api, Source } from '@/lib/api';
import AddSourceModal from './AddSourceModal';

interface SourceManagerProps {
  notebookId: string | null;
}

export default function SourceManager({ notebookId }: SourceManagerProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSources = async () => {
    if (!notebookId) return;
    setLoading(true);
    try {
      const data = await api.sources.list(notebookId);
      setSources(data);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for status updates every 3 seconds if any source is uploading/extracting
  useEffect(() => {
    fetchSources();
    
    let interval: NodeJS.Timeout;
    if (notebookId) {
      interval = setInterval(() => {
        setSources((currentSources) => {
          const needsPolling = currentSources.some(s => ['uploading', 'extracting', 'chunking', 'embedding'].includes(s.status));
          if (needsPolling) {
            api.sources.list(notebookId).then(setSources).catch(console.error);
          }
          return currentSources;
        });
      }, 3000);
    }
    
    return () => clearInterval(interval);
  }, [notebookId]);

  if (!notebookId) {
    return null;
  }

  const getStatusColor = (status: string) => {
    if (status === 'ready') return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    return 'bg-yellow-500 animate-pulse';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 border-t border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Sources</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 hover:bg-gray-50 flex items-center space-x-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Add</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && sources.length === 0 ? (
          <p className="text-xs text-center text-gray-400 mt-4">Loading sources...</p>
        ) : sources.length === 0 ? (
          <p className="text-xs text-center text-gray-400 mt-4 px-4">Add a source to start asking questions</p>
        ) : (
          <ul className="space-y-1">
            {sources.map(source => (
              <li key={source.id} className="group flex flex-col p-2 rounded hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(source.status)}`} title={source.status}></span>
                    <span className="text-sm text-gray-700 truncate">{source.title}</span>
                  </div>
                  <div className="hidden group-hover:flex items-center space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        api.sources.reindex(notebookId, source.id).then(fetchSources).catch(console.error);
                      }}
                      className="text-gray-400 hover:text-blue-500" title="Re-index"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm('Delete source?')) {
                          api.sources.remove(notebookId, source.id).then(fetchSources).catch(console.error);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500" title="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
                {source.status === 'failed' && source.errorMessage && (
                  <div className="flex items-center justify-between mt-1 ml-4">
                    <p className="text-xs text-red-500 truncate">{source.errorMessage}</p>
                    <button onClick={(e) => { e.stopPropagation(); api.sources.reindex(notebookId, source.id).then(fetchSources); }} className="text-xs text-blue-500 hover:underline">Retry</button>
                  </div>
                )}
                {['uploading', 'extracting', 'chunking', 'embedding'].includes(source.status) && (
                  <p className="text-xs text-yellow-600 mt-1 ml-4">{source.status}...</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddSourceModal 
        notebookId={notebookId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdded={fetchSources}
      />
    </div>
  );
}
