import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Create Notebook
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const notebook = await db.notebook.create({
      data: { name },
    });
    res.status(201).json(notebook);
  } catch (error) {
    console.error('Error creating notebook:', error);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
});

// List Notebooks
router.get('/', async (req, res) => {
  try {
    const notebooks = await db.notebook.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        sources: true, // Includes sources so frontend can display counts/status
      }
    });
    res.json(notebooks);
  } catch (error) {
    console.error('Error listing notebooks:', error);
    res.status(500).json({ error: 'Failed to fetch notebooks' });
  }
});

// Rename Notebook
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const notebook = await db.notebook.update({
      where: { id },
      data: { name },
    });
    res.json(notebook);
  } catch (error) {
    console.error('Error updating notebook:', error);
    res.status(500).json({ error: 'Failed to update notebook' });
  }
});

// Delete Notebook
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Cascading delete is handled by Prisma schema (onDelete: Cascade for Sources)
    // Note: In Stage 4, this should also delete vectors from Qdrant.
    await db.notebook.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
});

export default router;
