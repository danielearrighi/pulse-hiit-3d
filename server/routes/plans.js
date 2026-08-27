const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/db');

const router = express.Router();

function canManagePublic(user) {
  if (!user) return false;
  const isAdmin = user.role === 'admin' || (user.username && user.username.toLowerCase() === 'daniele');
  const isSuper = user.role === 'superuser';
  return isAdmin || isSuper;
}

// GET /api/plans - Get HIIT plans:
// - Unauthenticated users see public plans
// - Regular users see public plans + their own plans + plans assigned to them
// - Admins and Superusers see all plans
router.get('/', async (req, res) => {
  try {
    const user = req.session ? req.session.user : null;
    const userId = user ? user.id : null;
    const isStaff = canManagePublic(user);

    let result;
    if (isStaff) {
      result = await db.query(
        `SELECT p.*, u.username as author_name,
                CASE WHEN uap.plan_id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned
         FROM plans p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN user_assigned_plans uap ON uap.plan_id = p.id AND uap.user_id = $1
         ORDER BY p.is_public DESC, p.created_at DESC`,
        [userId]
      );
    } else if (userId) {
      result = await db.query(
        `SELECT p.*, u.username as author_name,
                CASE WHEN uap.plan_id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned
         FROM plans p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN user_assigned_plans uap ON uap.plan_id = p.id AND uap.user_id = $1
         WHERE p.is_public = TRUE OR p.user_id = $1 OR uap.plan_id IS NOT NULL
         ORDER BY is_assigned DESC, p.is_public DESC, p.created_at DESC`,
        [userId]
      );
    } else {
      result = await db.query(
        `SELECT p.*, u.username as author_name, FALSE as is_assigned
         FROM plans p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.is_public = TRUE
         ORDER BY p.created_at DESC`
      );
    }

    const plans = result.rows.map(p => ({
      ...p,
      is_public: Boolean(p.is_public),
      is_assigned: Boolean(p.is_assigned),
      structure: typeof p.structure === 'string' ? JSON.parse(p.structure) : p.structure
    }));

    res.json({ plans });
  } catch (err) {
    console.error('Fetch plans error:', err);
    res.status(500).json({ error: 'Failed to fetch plans.' });
  }
});

// GET /api/plans/:id - Get specific HIIT plan (can be shared via direct link)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT p.*, u.username as author_name FROM plans p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const plan = result.rows[0];
    plan.is_public = Boolean(plan.is_public);
    plan.structure = typeof plan.structure === 'string' ? JSON.parse(plan.structure) : plan.structure;

    res.json({ plan });
  } catch (err) {
    console.error('Fetch plan detail error:', err);
    res.status(500).json({ error: 'Failed to fetch plan.' });
  }
});

function validateAndSanitizeGroups(groups) {
  if (!groups || !Array.isArray(groups) || groups.length === 0) {
    return { error: 'At least one exercise group is required.' };
  }

  const sanitizedGroups = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const repetitions = typeof g.repetitions === 'number' ? g.repetitions : parseInt(g.repetitions, 10);
    if (!g.title || isNaN(repetitions) || repetitions < 1) {
      return { error: `Group #${i + 1} must have a title and at least 1 repetition.` };
    }
    if (!g.items || !Array.isArray(g.items) || g.items.length === 0) {
      return { error: `Group #${i + 1} (${g.title}) must contain at least one exercise.` };
    }

    const sanitizedItems = [];
    for (let j = 0; j < g.items.length; j++) {
      const item = g.items[j];
      const exerciseId = item.exercise_id || item.exerciseId;
      const type = item.type;
      const rawTarget = item.target_value !== undefined ? item.target_value : item.target;
      const targetValue = typeof rawTarget === 'number' ? rawTarget : parseInt(rawTarget, 10);
      
      const rawRest = item.rest_seconds !== undefined ? item.rest_seconds : (item.restAfter !== undefined ? item.restAfter : 20);
      const restSeconds = typeof rawRest === 'number' ? rawRest : parseInt(rawRest, 10);

      if (!exerciseId || !type || !['reps', 'duration'].includes(type) || isNaN(targetValue) || targetValue <= 0) {
        return { error: `Invalid exercise configuration in group ${g.title}, item #${j + 1}.` };
      }

      sanitizedItems.push({
        id: item.id || `item-${Date.now()}-${j}`,
        exercise_id: exerciseId,
        exerciseId: exerciseId,
        name: item.name,
        category: item.category,
        type,
        target_value: targetValue,
        target: targetValue,
        rest_seconds: isNaN(restSeconds) ? 0 : Math.max(0, restSeconds),
        restAfter: isNaN(restSeconds) ? 0 : Math.max(0, restSeconds)
      });
    }

    sanitizedGroups.push({
      id: g.id || `group-${Date.now()}-${i}`,
      title: g.title.trim(),
      repetitions,
      items: sanitizedItems
    });
  }

  return { groups: sanitizedGroups };
}

// POST /api/plans - Create a new HIIT plan (only ADMIN / SUPER can make plans public)
router.post('/', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'You must be logged in to create a plan.' });
    }

    const { name, description, is_public } = req.body;
    const rawGroups = req.body.groups || (req.body.structure && req.body.structure.groups);

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Plan name is required.' });
    }

    const validation = validateAndSanitizeGroups(rawGroups);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const planId = uuidv4();
    const userId = req.session.user.id;
    const isStaff = canManagePublic(req.session.user);
    const isPublicBool = isStaff ? Boolean(is_public) : false;
    const structure = { groups: validation.groups };

    await db.query(
      `INSERT INTO plans (id, user_id, name, description, is_public, structure)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [planId, userId, name.trim(), description ? description.trim() : '', isPublicBool, JSON.stringify(structure)]
    );

    res.status(201).json({
      message: 'HIIT Plan created successfully!',
      plan: {
        id: planId,
        user_id: userId,
        name: name.trim(),
        description: description ? description.trim() : '',
        is_public: isPublicBool,
        structure
      }
    });
  } catch (err) {
    console.error('Create plan error:', err);
    res.status(500).json({ error: 'Failed to create plan.' });
  }
});

// PUT /api/plans/:id - Update an existing HIIT plan
router.put('/:id', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'You must be logged in to update a plan.' });
    }

    const { id } = req.params;
    const userId = req.session.user.id;
    const isStaff = canManagePublic(req.session.user);
    const { name, description, is_public } = req.body;
    const rawGroups = req.body.groups || (req.body.structure && req.body.structure.groups);

    const check = await db.query('SELECT user_id, is_public FROM plans WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const isOwner = check.rows[0].user_id === userId;
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Plan name is required.' });
    }

    const validation = validateAndSanitizeGroups(rawGroups);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const isPublicBool = isStaff
      ? (is_public !== undefined ? Boolean(is_public) : Boolean(check.rows[0].is_public))
      : false;

    const structure = { groups: validation.groups };

    await db.query(
      `UPDATE plans
       SET name = $1, description = $2, is_public = $3, structure = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name.trim(), description ? description.trim() : '', isPublicBool, JSON.stringify(structure), id]
    );

    res.json({
      message: 'HIIT Plan updated successfully!',
      plan: {
        id,
        user_id: check.rows[0].user_id,
        name: name.trim(),
        description: description ? description.trim() : '',
        is_public: isPublicBool,
        structure
      }
    });
  } catch (err) {
    console.error('Update plan error:', err);
    res.status(500).json({ error: 'Failed to update plan.' });
  }
});

// DELETE /api/plans/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { id } = req.params;
    const userId = req.session.user.id;
    const isStaff = canManagePublic(req.session.user);

    const check = await db.query('SELECT user_id FROM plans WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const isOwner = check.rows[0].user_id === userId;
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    await db.query('DELETE FROM plans WHERE id = $1', [id]);
    res.json({ message: 'Plan deleted successfully.' });
  } catch (err) {
    console.error('Delete plan error:', err);
    res.status(500).json({ error: 'Failed to delete plan.' });
  }
});

module.exports = router;
