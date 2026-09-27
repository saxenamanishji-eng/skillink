import pool from '../config/db.js';
import { verifyToken } from '../utils/auth.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid. Please log in again.' });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
    }

    // Live Database lookup to guarantee active status and latest role
    const [rows] = await pool.query(
      'SELECT id, username, full_name, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    const user = rows[0];

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended by an administrator.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is currently inactive.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({ success: false, message: 'Authentication verification encountered a server error.' });
  }
};

/**
 * Optional Auth Middleware: Populates req.user if token is present and valid, but does not reject unauthenticated requests.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      req.user = null;
      return next();
    }

    const [rows] = await pool.query(
      'SELECT id, username, full_name, email, role, status FROM users WHERE id = ? AND status = "active"',
      [decoded.userId]
    );

    req.user = rows.length > 0 ? rows[0] : null;
    next();
  } catch {
    req.user = null;
    next();
  }
};
