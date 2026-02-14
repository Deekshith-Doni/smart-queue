// Queue controller: handles user token generation, status retrieval,
// and admin operations like progressing to next token and resetting.
import Queue from '../models/Queue.js';
import Counter from '../models/Counter.js';

// Helper: atomically get next token number
async function getNextTokenNumber() {
  const counter = await Counter.findOneAndUpdate(
    { name: 'queue' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return counter.seq;
}

// Helper: compute analytics
async function computeAnalytics() {
  const total = await Queue.countDocuments();
  const servedCount = await Queue.countDocuments({ status: 'served' });

  // Average waiting time (createdAt -> servedAt) in minutes
  const servedDocs = await Queue.find({ status: 'served' }).select('createdAt servedAt');
  let avgWaitMinutes = 0;
  if (servedDocs.length > 0) {
    const sumMs = servedDocs.reduce((sum, q) => {
      if (q.servedAt && q.createdAt) {
        const diff = q.servedAt.getTime() - q.createdAt.getTime();
        return sum + Math.max(diff, 0);
      }
      return sum;
    }, 0);
    avgWaitMinutes = Math.round((sumMs / servedDocs.length) / 60000);
  }

  return { totalTokensGenerated: total, tokensServed: servedCount, averageWaitingTime: avgWaitMinutes };
}

// POST /api/queue/token
export const generateToken = async (req, res, next) => {
  try {
    const { serviceType } = req.body;
    if (!serviceType) {
      return res.status(400).json({ error: 'serviceType is required' });
    }

    const tokenNumber = await getNextTokenNumber();

    const token = await Queue.create({ tokenNumber, serviceType, status: 'waiting' });

    res.status(201).json({
      message: 'Token generated successfully',
      tokenNumber: token.tokenNumber,
      serviceType: token.serviceType,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/queue/status?tokenNumber=123
export const getStatus = async (req, res, next) => {
  try {
    const userTokenNumber = req.query.tokenNumber ? Number(req.query.tokenNumber) : null;

    const currentServingDoc = await Queue.findOne({ status: 'serving' }).sort({ tokenNumber: 1 });
    const waitingCount = await Queue.countDocuments({ status: 'waiting' });

    // Estimated wait time: waitingCount * averageWaitingTime OR fallback 5 minutes per token
    const analytics = await computeAnalytics();
    const perTokenMinutes = analytics.averageWaitingTime || 5; // fallback conservative default
    const estimatedWaitTime = waitingCount * perTokenMinutes;

    // If userTokenNumber is provided, try to include its status
    let userToken = null;
    if (userTokenNumber) {
      const doc = await Queue.findOne({ tokenNumber: userTokenNumber });
      if (doc) {
        userToken = {
          tokenNumber: doc.tokenNumber,
          status: doc.status,
          serviceType: doc.serviceType,
        };
      }
    }

    res.json({
      currentServingToken: currentServingDoc?.tokenNumber || null,
      waitingCount,
      estimatedWaitTime, // minutes
      userToken,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/next
export const moveToNextToken = async (req, res, next) => {
  try {
    // Mark current serving as served
    const current = await Queue.findOne({ status: 'serving' });
    if (current) {
      current.status = 'served';
      current.servedAt = new Date();
      await current.save();
    }

    // Pick earliest waiting token
    const nextToken = await Queue.findOne({ status: 'waiting' }).sort({ tokenNumber: 1 });
    if (nextToken) {
      nextToken.status = 'serving';
      await nextToken.save();
      return res.json({ message: 'Moved to next token', currentServingToken: nextToken.tokenNumber });
    }

    // No waiting tokens; no current serving remains
    return res.json({ message: 'No waiting tokens', currentServingToken: null });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/reset
export const resetQueue = async (req, res, next) => {
  try {
    await Queue.deleteMany({});
    await Counter.findOneAndUpdate({ name: 'queue' }, { $set: { seq: 0 } }, { upsert: true });
    res.json({ message: 'Queue reset successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await computeAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/waiting
export const getWaitingTokens = async (req, res, next) => {
  try {
    const tokens = await Queue.find({ status: 'waiting' }).sort({ tokenNumber: 1 }).select('tokenNumber serviceType createdAt');
    res.json({ waiting: tokens });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/timings - provides detailed timing statistics for admin dashboard
export const getTimingStats = async (req, res, next) => {
  try {
    // Get all served tokens with timing info
    const servedTokens = await Queue.find({ status: 'served' })
      .sort({ servedAt: -1 })
      .select('tokenNumber serviceType createdAt servedAt')
      .limit(50); // Show last 50 served tokens for performance

    // Calculate timing metrics
    const durations = servedTokens
      .map((token) => {
        if (token.servedAt && token.createdAt) {
          const durationMs = token.servedAt.getTime() - token.createdAt.getTime();
          return Math.max(durationMs, 0) / 60000; // Convert to minutes
        }
        return 0;
      })
      .filter((d) => d > 0);

    let minTime = 0,
      maxTime = 0,
      medianTime = 0,
      avgTime = 0;

    if (durations.length > 0) {
      minTime = Math.min(...durations);
      maxTime = Math.max(...durations);
      avgTime = durations.reduce((a, b) => a + b, 0) / durations.length;

      // Calculate median
      const sorted = [...durations].sort((a, b) => a - b);
      medianTime =
        sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
    }

    res.json({
      timings: {
        averageTime: Math.round(avgTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100,
        medianTime: Math.round(medianTime * 100) / 100,
        totalServed: servedTokens.length,
      },
      recentServed: servedTokens.map((token) => ({
        tokenNumber: token.tokenNumber,
        serviceType: token.serviceType,
        duration: token.servedAt ? Math.round(((token.servedAt.getTime() - token.createdAt.getTime()) / 60000) * 100) / 100 : 0,
        servedAt: token.servedAt,
        assignedServiceTime: token.assignedServiceTime,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/assign-time - admin assigns expected service time to a token
export const assignServiceTime = async (req, res, next) => {
  try {
    const { tokenNumber, assignedServiceTime } = req.body;

    if (!tokenNumber || assignedServiceTime === undefined) {
      return res.status(400).json({ error: 'tokenNumber and assignedServiceTime are required' });
    }

    if (typeof assignedServiceTime !== 'number' || assignedServiceTime < 0) {
      return res.status(400).json({ error: 'assignedServiceTime must be a non-negative number (in minutes)' });
    }

    const token = await Queue.findOneAndUpdate(
      { tokenNumber },
      { $set: { assignedServiceTime } },
      { new: true }
    );

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json({
      message: 'Service time assigned successfully',
      tokenNumber: token.tokenNumber,
      assignedServiceTime: token.assignedServiceTime,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/all-tokens - returns all tokens (for admin UI dropdown/selection)
export const getAllTokens = async (req, res, next) => {
  try {
    const tokens = await Queue.find()
      .sort({ tokenNumber: 1 })
      .select('tokenNumber serviceType status assignedServiceTime createdAt');

    res.json({
      tokens,
    });
  } catch (err) {
    next(err);
  }
};
