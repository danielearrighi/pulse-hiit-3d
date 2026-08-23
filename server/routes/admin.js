const express = require('express');
const db = require('../db/db');

const router = express.Router();

// Middleware to enforce Admin role
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  const isDaniele = req.session.user.username && req.session.user.username.toLowerCase() === 'daniele';
  if (req.session.user.role !== 'admin' && !isDaniele) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

// GET /api/admin/stats - Database overview statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const usersCount = await db.query('SELECT COUNT(*) FROM users');
    const stdExCount = await db.query('SELECT COUNT(*) FROM exercises WHERE is_standard = TRUE');
    const customExCount = await db.query('SELECT COUNT(*) FROM exercises WHERE is_standard = FALSE');
    const plansCount = await db.query('SELECT COUNT(*) FROM plans');

    const stdCount = parseInt(stdExCount.rows[0].count, 10);
    const customCount = parseInt(customExCount.rows[0].count, 10);

    res.json({
      users: parseInt(usersCount.rows[0].count, 10),
      exercises: stdCount + customCount,
      standardExercises: stdCount,
      customExercises: customCount,
      plans: parseInt(plansCount.rows[0].count, 10)
    });
  } catch (err) {
    console.error('Fetch admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch database statistics.' });
  }
});

// GET /api/admin/backup - Download complete JSON backup
router.get('/backup', requireAdmin, async (req, res) => {
  try {
    const usersRes = await db.query('SELECT id, username, email, password_hash, role, created_at FROM users ORDER BY created_at ASC');
    const customExercisesRes = await db.query('SELECT * FROM exercises WHERE is_standard = FALSE ORDER BY created_at ASC');
    const allExercisesRes = await db.query('SELECT * FROM exercises ORDER BY created_at ASC');
    const plansRes = await db.query('SELECT * FROM plans ORDER BY created_at ASC');
    const userAssignedPlansRes = await db.query('SELECT * FROM user_assigned_plans ORDER BY assigned_at ASC');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `exercise_planner_backup_${timestamp}.json`;

    const fullBackup = {
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      database: 'PostgreSQL 18',
      users: usersRes.rows,
      custom_exercises: customExercisesRes.rows,
      all_exercises: allExercisesRes.rows,
      plans: plansRes.rows,
      user_assigned_plans: userAssignedPlansRes.rows
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(fullBackup, null, 2));
  } catch (err) {
    console.error('Admin backup error:', err);
    res.status(500).json({ error: 'Failed to generate database backup.' });
  }
});

const { seedStandardExercises } = require('../db/seed');

// POST /api/admin/restore - Restore/Import complete JSON backup
router.post('/restore', requireAdmin, async (req, res) => {
  const pool = db.getPool();
  const client = await pool.connect();

  try {
    const payload = req.body;
    if (!payload) {
      client.release();
      return res.status(400).json({ error: 'Missing backup data payload.' });
    }

    let users = [];
    let exercises = [];
    let plans = [];
    let userAssignedPlans = [];

    if (Array.isArray(payload)) {
      exercises = payload;
    } else {
      if (Array.isArray(payload.users)) users = payload.users;
      if (Array.isArray(payload.all_exercises)) {
        exercises = payload.all_exercises;
      } else if (Array.isArray(payload.custom_exercises)) {
        exercises = payload.custom_exercises;
      }
      if (Array.isArray(payload.plans)) plans = payload.plans;
      if (Array.isArray(payload.user_assigned_plans)) userAssignedPlans = payload.user_assigned_plans;
    }

    if (users.length === 0 && exercises.length === 0 && plans.length === 0) {
      client.release();
      return res.status(400).json({ error: 'No valid user, exercise, or plan entries found in backup file.' });
    }

    await client.query('BEGIN');

    // 1. Full clean / wipe of all existing data (user_assigned_plans, plans, exercises, users)
    await client.query('DELETE FROM user_assigned_plans');
    await client.query('DELETE FROM plans');
    await client.query('DELETE FROM exercises');
    await client.query('DELETE FROM users');

    // 2. Restore Users
    let restoredUsers = 0;
    for (const u of users) {
      if (u.id && u.username) {
        await client.query(`
          INSERT INTO users (id, username, email, password_hash, role, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          u.id,
          u.username,
          u.email || `${u.username}@example.com`,
          u.password_hash || '$2a$10$defaultplaceholderhash',
          u.role || 'user',
          u.created_at || new Date().toISOString()
        ]);
        restoredUsers++;
      }
    }

    // Always ensure user 'daniele' has admin role if present
    await client.query("UPDATE users SET role = 'admin' WHERE LOWER(username) = 'daniele'");

    // Fetch valid user IDs from inserted users
    const usersRes = await client.query('SELECT id, username, email, role FROM users');
    const validUserIds = new Set(usersRes.rows.map(u => u.id));
    const danieleUser = usersRes.rows.find(u => u.username && u.username.toLowerCase() === 'daniele');
    const defaultAdminUser = danieleUser || usersRes.rows.find(u => u.role === 'admin') || usersRes.rows[0];
    const defaultUserId = defaultAdminUser ? defaultAdminUser.id : null;

    // 3. Restore Exercises
    for (const ex of exercises) {
      if (!ex.id || !ex.name) continue;
      const keyframesJson = typeof ex.keyframes === 'string' ? ex.keyframes : JSON.stringify(ex.keyframes);
      let targetUserId = ex.user_id;
      if (ex.is_standard) {
        targetUserId = null;
      } else if (!targetUserId || !validUserIds.has(targetUserId)) {
        targetUserId = defaultUserId;
      }

      await client.query(`
        INSERT INTO exercises (id, user_id, name, category, is_standard, is_private, keyframes, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          keyframes = EXCLUDED.keyframes,
          is_private = EXCLUDED.is_private,
          is_standard = EXCLUDED.is_standard,
          notes = EXCLUDED.notes
      `, [
        ex.id,
        targetUserId,
        ex.name,
        ex.category || 'Full Body',
        Boolean(ex.is_standard),
        Boolean(ex.is_private),
        keyframesJson,
        ex.notes || null,
        ex.created_at || new Date().toISOString()
      ]);
    }

    // Ensure standard exercises are always present
    await seedStandardExercises(client);

    // Count total exercises
    const countExRes = await client.query('SELECT COUNT(*) FROM exercises');
    const restoredExercises = parseInt(countExRes.rows[0].count, 10);

    // 4. Restore Plans
    let restoredPlans = 0;
    for (const p of plans) {
      if (!p.id || !p.name || !p.structure) continue;
      const structureJson = typeof p.structure === 'string' ? p.structure : JSON.stringify(p.structure);
      let targetUserId = p.user_id;
      if (!targetUserId || !validUserIds.has(targetUserId)) {
        targetUserId = defaultUserId;
      }

      await client.query(`
        INSERT INTO plans (id, user_id, name, description, is_public, structure, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_public = EXCLUDED.is_public,
          structure = EXCLUDED.structure
      `, [
        p.id,
        targetUserId,
        p.name,
        p.description || null,
        Boolean(p.is_public),
        structureJson,
        p.created_at || new Date().toISOString()
      ]);
      restoredPlans++;
    }

    // 5. Restore User Assigned Plans
    let restoredAssignedPlans = 0;
    for (const uap of userAssignedPlans) {
      if (uap.user_id && uap.plan_id && validUserIds.has(uap.user_id)) {
        await client.query(`
          INSERT INTO user_assigned_plans (user_id, plan_id, assigned_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, plan_id) DO NOTHING
        `, [
          uap.user_id,
          uap.plan_id,
          uap.assigned_at || new Date().toISOString()
        ]);
        restoredAssignedPlans++;
      }
    }

    await client.query('COMMIT');
    client.release();

    // Maintain session for the current user if possible
    if (req.session && req.session.user) {
      const match = usersRes.rows.find(u => u.id === req.session.user.id || (u.username && u.username.toLowerCase() === req.session.user.username?.toLowerCase()));
      if (match) {
        req.session.user = { id: match.id, username: match.username, email: match.email, role: match.role };
      } else if (defaultAdminUser) {
        req.session.user = { id: defaultAdminUser.id, username: defaultAdminUser.username, email: defaultAdminUser.email, role: defaultAdminUser.role };
      }
    }

    res.json({
      success: true,
      message: 'Backup completo ripristinato con successo nel database PostgreSQL.',
      restored: {
        users: restoredUsers,
        exercises: restoredExercises,
        plans: restoredPlans,
        assignedPlans: restoredAssignedPlans
      }
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    client.release();
    console.error('Admin restore error:', err);
    res.status(500).json({ error: 'Failed to restore backup: ' + err.message });
  }
});

module.exports = router;
