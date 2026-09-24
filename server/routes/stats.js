const express = require('express');
const db = require('../db/db');

const router = express.Router();

function formatIsoTimestamp(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * GET /api/stats
 * Retrieves cumulative statistics for the current logged-in user
 */
router.get('/', async (req, res) => {
  try {
    const user = (req.session && req.session.user) || req.user;
    if (!user || !user.id) {
      return res.json({ completed_workouts: 0, total_minutes: 0, updated_at: null });
    }

    const result = await db.query(
      'SELECT completed_workouts, total_minutes, updated_at FROM user_exercise_stats WHERE user_id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ completed_workouts: 0, total_minutes: 0, updated_at: null });
    }

    const row = result.rows[0];
    return res.json({
      completed_workouts: parseInt(row.completed_workouts, 10) || 0,
      total_minutes: parseInt(row.total_minutes, 10) || 0,
      updated_at: formatIsoTimestamp(row.updated_at)
    });
  } catch (err) {
    console.error('Fetch user stats error:', err);
    return res.status(500).json({ error: 'Impossibile recuperare le statistiche utente.' });
  }
});

/**
 * POST /api/stats/complete
 * Records completion of a workout: increments completed_workouts by 1 and adds elapsed minutes
 */
router.post('/complete', async (req, res) => {
  try {
    const user = (req.session && req.session.user) || req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Utente non autenticato' });
    }

    const minutes = Math.max(1, parseInt(req.body.minutes, 10) || 1);

    const upsertSql = `
      INSERT INTO user_exercise_stats (user_id, completed_workouts, total_minutes, updated_at)
      VALUES ($1, 1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET
        completed_workouts = user_exercise_stats.completed_workouts + 1,
        total_minutes = user_exercise_stats.total_minutes + EXCLUDED.total_minutes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING completed_workouts, total_minutes, updated_at;
    `;

    const result = await db.query(upsertSql, [user.id, minutes]);
    const updated = result.rows[0];

    return res.json({
      success: true,
      completed_workouts: parseInt(updated.completed_workouts, 10),
      total_minutes: parseInt(updated.total_minutes, 10),
      updated_at: formatIsoTimestamp(updated.updated_at)
    });
  } catch (err) {
    console.error('Record workout completion error:', err);
    return res.status(500).json({ error: 'Impossibile salvare il completamento del workout.' });
  }
});

module.exports = router;
