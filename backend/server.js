// Smart Queue Management System - Backend Server
// Interview-friendly: MVC structure, JWT-protected admin APIs, robust queue logic

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import queueRoutes from './routes/queueRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import seedAdminIfNeeded from './config/seedAdmin.js';

dotenv.config();

const app = express();

// Middleware: parse JSON, enable CORS, request logging
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Connect to MongoDB
connectDB();

// Seed initial admin on first run based on env vars (safe for demos)
seedAdminIfNeeded();

// API routes
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler (keeps responses consistent)
// Note: In Express, throwing in async handlers is caught by this if next(err) is used
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
