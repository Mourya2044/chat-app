import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be 3-50 characters' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, avatar_url, bio, created_at`,
      [username.toLowerCase(), email.toLowerCase(), password_hash]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({ user, token, message: 'Registration successful!' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const result = await pool.query(
      `SELECT id, username, email, password_hash, avatar_url, bio
       FROM users WHERE email = $1 OR username = $1`,
      [emailOrUsername.toLowerCase()]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1', [user.id]);

    const { password_hash, ...userWithoutPassword } = user;
    const token = generateToken(user.id);

    res.json({ user: userWithoutPassword, token, message: 'Login successful!' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// PATCH /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { bio, avatar_url } = req.body;
    const result = await pool.query(
      `UPDATE users SET bio = COALESCE($1, bio), avatar_url = COALESCE($2, avatar_url), updated_at = NOW()
       WHERE id = $3 RETURNING id, username, email, avatar_url, bio`,
      [bio, avatar_url, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1',
      [req.user.id]
    );
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { register, login, getMe, updateProfile, logout };
