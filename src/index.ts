import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import { initializeConfig } from './config/manager.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/user.js';
import adsRoutes from './routes/ads.js';
import botRoutes from './routes/bot.js';

dotenv.config();

// Connect to MongoDB
connectDB().then(() => {
  // Initialize dynamic configuration
  initializeConfig();
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ads-config', adsRoutes);
app.use('/api/bot', botRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/taskwave'}`);
});
