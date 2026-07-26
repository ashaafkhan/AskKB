import { useState } from 'react';
import { api } from '@/lib/api';

interface AddSourceModalProps {
  notebookId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const TABS = [
  { id: 'pdf', label: 'PDF File' },
  { id: 'text', label: 'Plain Text' },
  { id: 'web', label: 'Web Link' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'vtt', label: 'VTT Transcript' },
];

export default function AddSourceModal({ notebookId, isOpen, onClose, onAdded }: AddSourceModalProps) {
  const [activeTab, setActiveTab] = useState('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (['web', 'youtube'].includes(activeTab)) {
        if (!url) throw new Error('URL is required');
        await api.sources.add(notebookId, activeTab, url);
      } else {
        if (!file) throw new Error('File is required');
        await api.sources.add(notebookId, activeTab, file);
      }
      onAdded();
      onClose();
      setFile(null);
      setUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to add source');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Add Source</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex border-b overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`px-4 py-2 text-sm whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveTab(tab.id); setError(''); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {['web', 'youtube'].includes(activeTab) ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={activeTab === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://example.com/article'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select {activeTab.toUpperCase()} File</label>
              <input
                type="file"
                required
                accept={activeTab === 'pdf' ? '.pdf' : activeTab === 'vtt' ? '.vtt' : '.txt'}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
              Cancel
            </button>
            <button disabled={isSubmitting} type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
