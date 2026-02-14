// JWT middleware: protects admin-only APIs
import jwt from 'jsonwebtoken';

export default function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authorization token missing' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET not configured' });

    const payload = jwt.verify(token, secret);
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Attach user info for downstream handlers if needed
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
