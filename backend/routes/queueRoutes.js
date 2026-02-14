import express from 'express';
import { generateToken, getStatus } from '../controllers/queueController.js';

const router = express.Router();

// User APIs (no auth)
router.post('/token', generateToken);
router.get('/status', getStatus);

export default router;
