import { useState } from 'react';
import { Notebook } from '@/lib/api';

interface NotebookListProps {
  notebooks: Notebook[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function NotebookList({
  notebooks,
  activeId,
  loading,
  onSelect,
  onCreate,
  onUpdate,
  onDelete
}: NotebookListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNbName.trim()) return;
    onCreate(newNbName.trim());
    setNewNbName('');
    setIsCreating(false);
  };

  const handleEditSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onUpdate(id, editName.trim());
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Notebooks</h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="text-gray-400 hover:text-gray-600 focus:outline-none"
          title="Add Notebook"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="mt-2">
          <input
            autoFocus
            type="text"
            placeholder="Notebook name..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={newNbName}
            onChange={(e) => setNewNbName(e.target.value)}
            onBlur={() => setIsCreating(false)}
          />
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading notebooks...</p>
      ) : notebooks.length === 0 && !isCreating ? (
        <p className="text-sm text-gray-400">No notebooks yet.</p>
      ) : (
        <ul className="space-y-1">
          {notebooks.map(nb => (
            <li key={nb.id} className={`group flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer ${activeId === nb.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => onSelect(nb.id)}>
              {editingId === nb.id ? (
                <form 
                  onSubmit={(e) => handleEditSubmit(e, nb.id)} 
                  className="flex-1 mr-2"
                >
                  <input
                    autoFocus
                    type="text"
                    className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={(e) => handleEditSubmit(e, nb.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </form>
              ) : (
                <span className="truncate flex-1">{nb.name}</span>
              )}

              <div className="hidden group-hover:flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => {
                    setEditingId(nb.id);
                    setEditName(nb.name);
                  }}
                  className="text-gray-400 hover:text-blue-500"
                  title="Rename"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button 
                  onClick={() => onDelete(nb.id)}
                  className="text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
