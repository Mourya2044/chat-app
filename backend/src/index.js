import express, { json, urlencoded, static as staticMiddleware } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

import initializeDatabase from './config/initDb.js';
import routes from './routes/routes.js';
import { authenticateSocket } from './middleware/auth.js';
import setupSocket from './socket/socketHandler.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// const UPLOAD_DIR = join(__dirname, '../../uploads');

app.use('/uploads', staticMiddleware(join(__dirname, '../uploads')));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Socket.io setup
const io = new Server(httpServer, {
  cors: corsOptions,
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for file transfers
});

io.use(authenticateSocket);
setupSocket(io);

// Start server
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await initializeDatabase();
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Socket.io ready`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default { app, io };
