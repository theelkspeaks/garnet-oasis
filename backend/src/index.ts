import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@garnet-oasis/shared';

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Configure Socket.IO
const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send connection confirmation
  socket.emit('connected', { sessionId: socket.id });
  
  // Handle room joining
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    
    const room = io.sockets.adapter.rooms.get(roomId);
    const participants = room ? Array.from(room) : [];
    
    socket.emit('room-joined', { roomId, participants });
    socket.to(roomId).emit('participant-joined', { participantId: socket.id });
    
    console.log(`Client ${socket.id} joined room ${roomId}`);
  });
  
  // Handle room leaving
  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    socket.data.roomId = undefined;
    
    socket.emit('room-left', { roomId });
    socket.to(roomId).emit('participant-left', { participantId: socket.id });
    
    console.log(`Client ${socket.id} left room ${roomId}`);
  });
  
  // Handle generic actions
  socket.on('action', (data) => {
    // Broadcast action to other clients in the same room
    if (socket.data.roomId) {
      socket.to(socket.data.roomId).emit('action-accepted', data);
      socket.emit('action-accepted', data);
    }
  });
  
  // Handle ping
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('participant-left', { participantId: socket.id });
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
    socket.emit('error', {
      timestamp: Date.now(),
      error: 'An error occurred',
      code: 'UNKNOWN_ERROR',
    });
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO server ready`);
});

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  let socketIOClosed = false;
  let httpServerClosed = false;
  let shutdownComplete = false;
  let socketIOTimeout: NodeJS.Timeout;
  let httpServerTimeout: NodeJS.Timeout;
  let checkInterval: NodeJS.Timeout;
  
  const tryExit = () => {
    if (socketIOClosed && httpServerClosed && !shutdownComplete) {
      shutdownComplete = true;
      if (socketIOTimeout) clearTimeout(socketIOTimeout);
      if (httpServerTimeout) clearTimeout(httpServerTimeout);
      if (checkInterval) clearInterval(checkInterval);
      console.log('✅ Graceful shutdown complete');
      // Use synchronous exit to ensure it happens immediately
      process.exit(0);
    }
  };
  
  // Fallback timeout for Socket.IO close (very short for fast shutdown)
  socketIOTimeout = setTimeout(() => {
    if (isShuttingDown && !socketIOClosed) {
      console.log('Socket.IO server closed (timeout)');
      socketIOClosed = true;
      tryExit();
    }
  }, 25);
  
  // Fallback timeout for HTTP server close (very short for fast shutdown)
  httpServerTimeout = setTimeout(() => {
    if (isShuttingDown && !httpServerClosed) {
      console.log('HTTP server closed (no active connections)');
      httpServerClosed = true;
      tryExit();
    }
  }, 25);
  
  // Close Socket.IO connections first (they might have active connections)
  try {
    io.close(() => {
      if (!socketIOClosed) {
        console.log('Socket.IO server closed');
        socketIOClosed = true;
        tryExit();
      }
    });
  } catch (error) {
    console.log('Socket.IO server closed (error handled)');
    socketIOClosed = true;
    tryExit();
  }
  
  // Then close HTTP server
  try {
    httpServer.close(() => {
      if (!httpServerClosed) {
        console.log('HTTP server closed');
        httpServerClosed = true;
        tryExit();
      }
    });
  } catch (error) {
    console.log('HTTP server closed (error handled)');
    httpServerClosed = true;
    tryExit();
  }
  
  // Also check periodically in case callbacks don't fire (very frequent)
  checkInterval = setInterval(() => {
    tryExit();
  }, 5);
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    if (isShuttingDown) {
      console.error('⚠️ Forced shutdown after timeout');
      process.exit(1);
    }
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

