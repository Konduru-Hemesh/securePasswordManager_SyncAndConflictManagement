import express from 'express';
import cors from 'cors';
import vaultRoutes from './routes/vault';
import authRoutes from './routes/auth';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/vault', vaultRoutes);
app.use('/api/auth', authRoutes);

export default app;
