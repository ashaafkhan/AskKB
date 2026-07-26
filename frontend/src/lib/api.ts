const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export interface Notebook {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sources: any[]; // define source type later
}

export const api = {
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
};
