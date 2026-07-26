"use client";

import { useEffect, useState } from 'react';
import { api, Notebook } from '@/lib/api';
import NotebookList from '@/components/NotebookList';
import SourceManager from '@/components/SourceManager';
import ChatArea from '@/components/ChatArea';
import SourceViewer from '@/components/SourceViewer';

export default function Home() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  useEffect(() => {
    setActiveSourceId(null); // Reset when notebook changes
  }, [activeNotebookId]);

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
        
        {/* Source Manager Area */}
        <SourceManager notebookId={activeNotebookId} />
      </aside>

      {/* Center - Chat */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <ChatArea notebookId={activeNotebookId} onCitationClick={(id) => setActiveSourceId(id)} />
      </main>

      {/* Right - Source Viewer */}
      <aside className="w-80 border-l border-gray-200 bg-white flex flex-col h-full flex-shrink-0 transition-all duration-300">
        <SourceViewer 
          notebookId={activeNotebookId} 
          sourceId={activeSourceId} 
          onClose={() => setActiveSourceId(null)}
        />
      </aside>
    </main>
  );
}
