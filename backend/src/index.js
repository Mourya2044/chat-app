import express, { json, urlencoded } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import initializeDatabase from './config/initDb.js';
import routes from './routes/routes.js';
import { authenticateSocket } from './middleware/auth.js';
import setupSocket from './socket/socketHandler.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true, limit: '50mb' }));

// API routes
app.use('/api', routes);

// Socket.io setup
const io = new Server(httpServer, {
  cors: corsOptions,
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB for file transfers
});

io.use(authenticateSocket);
setupSocket(io);

// Start server
const PORT = process.env.PORT || 5000;

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

