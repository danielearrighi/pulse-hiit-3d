const express = require('express');
const db = require('../db/db');

const router = express.Router();

const VALID_EVENTS = ['STARTPLAN', 'ENDPLAN'];

// Admin-only guard (mirrors the Admin panel access rules)
function requireAdmin(req, res, next) {
  const user = (req.session && req.session.user) || req.user;
  if (!user) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  const isDaniele = user.username && user.username.toLowerCase() === 'daniele';
  if (user.role !== 'admin' && !isDaniele) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function formatIsoTimestamp(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * POST /api/logs
 * Records a plan lifecycle event. Works for both logged-in and anonymous users:
 * the "user" column stores the username when authenticated, otherwise the client IP.
 */
router.post('/', async (req, res) => {
  try {
    const { description, event } = req.body || {};

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Plan description is required.' });
    }
    if (!event || !VALID_EVENTS.includes(event)) {
      return res.status(400).json({ error: `Event must be one of: ${VALID_EVENTS.join(', ')}.` });
    }

    const sessionUser = (req.session && req.session.user) || req.user;
    const userRef = sessionUser && sessionUser.username ? sessionUser.username : getClientIp(req);

    await db.query(
      'INSERT INTO exercise_logs ("user", description, event) VALUES ($1, $2, $3)',
      [userRef, description.trim().slice(0, 255), event]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Record exercise log error:', err);
    res.status(500).json({ error: 'Failed to record log entry.' });
  }
});

/**
 * GET /api/logs
 * Returns aggregated log statistics plus the most recent events (admin only).
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const totalsRes = await db.query(`
      SELECT
        COUNT(DISTINCT "user")::int AS distinct_users,
        COUNT(*) FILTER (WHERE event = 'STARTPLAN')::int AS started,
        COUNT(*) FILTER (WHERE event = 'ENDPLAN')::int AS ended
      FROM exercise_logs
    `);

    const plansRes = await db.query(`
      SELECT description,
        COUNT(DISTINCT "user")::int AS distinct_users,
        COUNT(*) FILTER (WHERE event = 'STARTPLAN')::int AS started,
        COUNT(*) FILTER (WHERE event = 'ENDPLAN')::int AS ended
      FROM exercise_logs
      WHERE description IS NOT NULL
      GROUP BY description
      ORDER BY started DESC, description ASC
    `);

    const recentRes = await db.query(`
      SELECT "user", description, event, created_at
      FROM exercise_logs
      ORDER BY created_at DESC, id DESC
      LIMIT 200
    `);

    res.json({
      totals: totalsRes.rows[0] || { distinct_users: 0, started: 0, ended: 0 },
      plans: plansRes.rows,
      recent: recentRes.rows.map((r) => ({ ...r, created_at: formatIsoTimestamp(r.created_at) }))
    });
  } catch (err) {
    console.error('Fetch exercise logs error:', err);
    res.status(500).json({ error: 'Failed to fetch log statistics.' });
  }
});

module.exports = router;
