// Smart Queue Management System - Backend Server
// Interview-friendly: MVC structure, JWT-protected admin APIs, robust queue logic

import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import seedAdminIfNeeded from './config/seedAdmin.js';
import { createApp } from './app.js';
import { initSocket } from './socket.js';

dotenv.config();

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

initSocket(io);

// Connect to MongoDB
connectDB();

// Seed initial admin on first run based on env vars (safe for demos)
seedAdminIfNeeded();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server with Socket.io running on port ${PORT}`);
});
