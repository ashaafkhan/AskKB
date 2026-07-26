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
                  <div className="flex items-center space-x-2 truncate">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(source.status)}`} title={source.status}></span>
                    <span className="text-sm text-gray-700 truncate">{source.title}</span>
                  </div>
                </div>
                {source.status === 'failed' && source.errorMessage && (
                  <p className="text-xs text-red-500 mt-1 ml-4 truncate">{source.errorMessage}</p>
                )}
                {['uploading', 'extracting'].includes(source.status) && (
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
