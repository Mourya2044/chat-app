import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, username, email, avatar_url, bio, is_online FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows[0]) {
      console.error('Authentication error: User not found for ID', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Socket.io authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, username, email, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows[0]) {
      return next(new Error('User not found'));
    }

    socket.user = result.rows[0];
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

export { authenticate, authenticateSocket };
