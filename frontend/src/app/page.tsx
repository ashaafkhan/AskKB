"use client";

import { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { api, Notebook } from '@/lib/api';
import NotebookList from '@/components/NotebookList';
import SourceManager from '@/components/SourceManager';
import ChatArea from '@/components/ChatArea';
import SourceViewer from '@/components/SourceViewer';
import BonusPanel from '@/components/BonusPanel';

export default function Home() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [isBonusPanelOpen, setIsBonusPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state

  useEffect(() => {
    fetchNotebooks();
  }, []);

  useEffect(() => {
    setActiveSourceId(null);
    setIsBonusPanelOpen(false);
    setSidebarOpen(false); // Close sidebar on mobile when changing notebook
  }, [activeNotebookId]);

  const fetchNotebooks = async () => {
    try {
      const data = await api.notebooks.list();
      setNotebooks(data);
      if (data.length > 0 && !activeNotebookId) {
        setActiveNotebookId(data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load notebooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotebook = async (name: string) => {
    try {
      const newNb = await api.notebooks.create(name);
      setNotebooks([newNb, ...notebooks]);
      setActiveNotebookId(newNb.id);
      toast.success('Notebook created');
    } catch (err) {
      toast.error('Error creating notebook');
    }
  };

  const handleUpdateNotebook = async (id: string, name: string) => {
    try {
      await api.notebooks.update(id, name);
      setNotebooks(notebooks.map(nb => nb.id === id ? { ...nb, name } : nb));
      toast.success('Notebook updated');
    } catch (err) {
      toast.error('Error updating notebook');
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
      toast.success('Notebook deleted');
    } catch (err) {
      toast.error('Error deleting notebook');
    }
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
      <Toaster position="top-right" />
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Rail (Notebooks & Sources) */}
      <aside className={`fixed md:relative z-50 w-64 border-r border-gray-200 bg-white flex flex-col h-full flex-shrink-0 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">AskKB</h1>
          <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(false)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
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
        
        <div className="flex-1 overflow-y-auto">
          <SourceManager notebookId={activeNotebookId} />
        </div>

        {/* Bonus Panel Toggle */}
        {activeNotebookId && (
          <div className="p-4 border-t border-gray-200 bg-blue-50/50">
            <button
              onClick={() => {
                setActiveSourceId(null);
                setIsBonusPanelOpen(true);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className="w-full py-2 px-3 bg-white border border-blue-200 text-blue-700 text-sm font-medium rounded-md shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <span>Bonus Features</span>
            </button>
          </div>
        )}
      </aside>

      {/* Center - Chat */}
      <section className="flex-1 flex flex-col min-w-0 bg-white relative h-full">
        <div className="md:hidden flex items-center p-3 border-b border-gray-200 bg-white">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <span className="ml-3 font-medium text-gray-800">AskKB Chat</span>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ChatArea 
            notebookId={activeNotebookId} 
            onCitationClick={(id) => {
              setIsBonusPanelOpen(false);
              setActiveSourceId(id);
            }} 
          />
        </div>
      </section>

      {/* Right - Source Viewer or Bonus Panel (Collapsible) */}
      <aside className={`${(activeSourceId || isBonusPanelOpen) ? 'w-full md:w-[350px] border-l border-gray-200' : 'w-0 border-l-0'} absolute md:relative right-0 bg-white flex flex-col h-full flex-shrink-0 transition-all duration-300 overflow-hidden z-30 shadow-2xl md:shadow-none`}>
        {activeSourceId && (
          <SourceViewer 
            notebookId={activeNotebookId} 
            sourceId={activeSourceId} 
            onClose={() => setActiveSourceId(null)}
          />
        )}
        {!activeSourceId && isBonusPanelOpen && (
          <BonusPanel 
            notebookId={activeNotebookId}
            onClose={() => setIsBonusPanelOpen(false)}
          />
        )}
      </aside>
    </main>
  );
}
