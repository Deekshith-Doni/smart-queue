import express from 'express';
import auth from '../middleware/auth.js';
import { adminLogin } from '../controllers/adminController.js';
import { moveToNextToken, resetQueue, getAnalytics, getWaitingTokens, getTimingStats, assignServiceTime, getAllTokens, getServiceTimes, setServiceTime } from '../controllers/queueController.js';

const router = express.Router();

// Public: login to obtain JWT
router.post('/login', adminLogin);

// Protected admin operations
router.post('/next', auth, moveToNextToken);
router.post('/reset', auth, resetQueue);
router.get('/analytics', auth, getAnalytics);
router.get('/waiting', auth, getWaitingTokens);
router.get('/timings', auth, getTimingStats);
router.post('/assign-time', auth, assignServiceTime);
router.get('/all-tokens', auth, getAllTokens);
router.get('/service-times', auth, getServiceTimes);
router.post('/service-times', auth, setServiceTime);

export default router;
