"use client";

import { useEffect, useState } from 'react';
import { api, Notebook } from '@/lib/api';
import NotebookList from '@/components/NotebookList';

export default function Home() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    try {
      const data = await api.notebooks.list();
      setNotebooks(data);
      if (data.length > 0 && !activeNotebookId) {
        setActiveNotebookId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotebook = async (name: string) => {
    try {
      const newNb = await api.notebooks.create(name);
      setNotebooks([newNb, ...notebooks]);
      setActiveNotebookId(newNb.id);
    } catch (err) {
      console.error(err);
      alert('Error creating notebook');
    }
  };

  const handleUpdateNotebook = async (id: string, name: string) => {
    try {
      await api.notebooks.update(id, name);
      setNotebooks(notebooks.map(nb => nb.id === id ? { ...nb, name } : nb));
    } catch (err) {
      console.error(err);
      alert('Error updating notebook');
    }
  };

  const handleDeleteNotebook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notebook?')) return;
    try {
      await api.notebooks.delete(id);
      setNotebooks(notebooks.filter(nb => nb.id !== id));
      if (activeNotebookId === id) {
        setActiveNotebookId(notebooks[0]?.id || null);
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting notebook');
    }
  };

  const activeNotebook = notebooks.find(nb => nb.id === activeNotebookId);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
      {/* Left Rail */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">AskKB</h1>
        </div>
        
        <NotebookList 
          notebooks={notebooks}
          activeId={activeNotebookId}
          loading={loading}
          onSelect={setActiveNotebookId}
          onCreate={handleCreateNotebook}
          onUpdate={handleUpdateNotebook}
          onDelete={handleDeleteNotebook}
        />
      </aside>

      {/* Center - Chat */}
      <section className="flex-1 flex flex-col bg-gray-50 relative">
        {activeNotebook ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <p className="text-lg">Chat UI will be built in Stage 6.</p>
            <p className="text-sm">Currently viewing: <span className="font-semibold text-gray-700">{activeNotebook.name}</span></p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            {loading ? 'Loading...' : 'Create your first notebook to get started.'}
          </div>
        )}
      </section>

      {/* Right - Source Viewer (Placeholder) */}
      <aside className="w-80 border-l border-gray-200 bg-white flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold text-gray-700">Source Viewer</h2>
        </div>
        <div className="flex-1 p-4 text-sm text-gray-500 text-center flex items-center justify-center">
          Source Viewer panel (Stage 7)
        </div>
      </aside>
    </main>
  );
}
