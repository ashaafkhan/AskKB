import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import notebookRoutes from './api/notebooks';

dotenv.config({ path: '../.env' }); // Load from root

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/notebooks', notebookRoutes);

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
