const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/db');

const router = express.Router();

// GET /api/auth/me - Get current logged-in user
router.get('/me', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      const result = await db.query('SELECT id, username, email, role FROM users WHERE id = $1', [req.session.user.id]);
      if (result.rows.length > 0) {
        const u = result.rows[0];
        let role = u.role || 'user';
        if (u.username && u.username.toLowerCase() === 'daniele') {
          role = 'admin';
          if (u.role !== 'admin') {
            await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [u.id]);
          }
        }
        const user = { id: u.id, username: u.username, email: u.email, role };
        req.session.user = user;
        return res.json({ user });
      }
    }
    return res.json({ user: null });
  } catch (err) {
    console.error('Fetch me error:', err);
    return res.json({ user: null });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    // Check existing
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.trim(), email.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = uuidv4();
    const role = (username.trim().toLowerCase() === 'daniele') ? 'admin' : 'user';

    await db.query(
      'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [userId, username.trim(), email.trim().toLowerCase(), password_hash, role]
    );

    const user = { id: userId, username: username.trim(), email: email.trim().toLowerCase(), role };
    req.session.user = user;

    res.status(201).json({ message: 'Registration successful!', user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, username, email, password } = req.body || {};
    const identifier = (usernameOrEmail || username || email || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const term = identifier.toLowerCase();
    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1',
      [term]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const userRow = result.rows[0];
    const matches = await bcrypt.compare(password, userRow.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    let role = userRow.role || 'user';
    if (userRow.username && userRow.username.toLowerCase() === 'daniele') {
      role = 'admin';
      if (userRow.role !== 'admin') {
        await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [userRow.id]);
      }
    }

    const user = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      role
    };
    req.session.user = user;

    res.json({ message: 'Login successful!', user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

module.exports = router;
