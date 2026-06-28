import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { setupSocketEvents } from './events/socketEvents.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import userRoutes from './routes/users.js';
import sessionRoutes from './routes/sessions.js';
import aiRoutes from './routes/ai.js';
import fileRoutes from './routes/files.js';

const app = express();
const httpServer = createServer(app);

// Parse CORS origins (supports comma-separated list for multi-deploy)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// Connect to MongoDB but don't block server startup
connectDB().catch(err => {
  console.error('MongoDB connection failed (server will continue running):', err.message);
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({ origin: allowedOrigins }));

// Limit JSON body size to 10MB (for file uploads via base64)
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/files', fileRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'Server is running',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Global error handler (catches unhandled route errors)
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// Setup Socket.io events
setupSocketEvents(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed: ${allowedOrigins.join(', ')}`);
  console.log(`Socket.io available at http://localhost:${PORT}`);
});
