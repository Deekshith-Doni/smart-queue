import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import queueRoutes from './routes/queueRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

export function createApp() {
  const app = express();

  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' },
  });

  const tokenLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many token requests. Please wait a moment and retry.' },
  });

  app.use(express.json());
  app.use(cors({ origin: allowedOrigins }));
  app.use(morgan('dev'));

  if (process.env.NODE_ENV !== 'test') {
    app.use('/api/admin/login', loginLimiter);
    app.use('/api/queue/token', tokenLimiter);
  }

  app.use('/api/queue', queueRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((err, req, res, next) => {
    console.error('Error:', err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ error: message });
  });

  return app;
}
