const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export interface Source {
  id: string;
  notebookId: string;
  type: 'pdf' | 'text' | 'web' | 'youtube' | 'vtt';
  title: string;
  status: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'ready' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export interface Notebook {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sources: Source[];
}

export const api = {
  sources: {
    list: async (notebookId: string): Promise<Source[]> => {
      const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/sources`);
      if (!res.ok) throw new Error('Failed to fetch sources');
      return res.json();
    },
    add: async (notebookId: string, type: string, fileOrUrl: File | string): Promise<Source> => {
      const formData = new FormData();
      formData.append('type', type);
      
      if (type === 'web' || type === 'youtube') {
        formData.append('url', fileOrUrl as string);
      } else {
        formData.append('file', fileOrUrl as File);
      }
      
      const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/sources`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to add source');
      return res.json();
    },
    remove: async (notebookId: string, sourceId: string): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/sources/${sourceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete source');
    },
    reindex: async (notebookId: string, sourceId: string): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/sources/${sourceId}/reindex`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to re-index source');
    },
    getContent: async (notebookId: string, sourceId: string): Promise<{source: Source, content: string}> => {
      const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/sources/${sourceId}/content`);
      if (!res.ok) throw new Error('Failed to fetch source content');
      return res.json();
    }
  },
  notebooks: {
    list: async (): Promise<Notebook[]> => {
      const res = await fetch(`${API_BASE_URL}/notebooks`);
      if (!res.ok) throw new Error('Failed to fetch notebooks');
      return res.json();
    },
    create: async (name: string): Promise<Notebook> => {
      const res = await fetch(`${API_BASE_URL}/notebooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create notebook');
      return res.json();
    },
    update: async (id: string, name: string): Promise<Notebook> => {
      const res = await fetch(`${API_BASE_URL}/notebooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to update notebook');
      return res.json();
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/notebooks/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete notebook');
    },
  },
  bonus: {
    generateRoadmap: async (notebookId: string): Promise<string> => {
      const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/bonus/roadmap`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate roadmap');
      }
      const data = await res.json();
      return data.roadmap;
    },
    generatePodcast: async (notebookId: string): Promise<{script: string, audioBase64: string | null}> => {
      const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/bonus/podcast`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate podcast');
      }
      return res.json();
    }
  }
};
