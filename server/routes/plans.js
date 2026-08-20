const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/db');

const router = express.Router();

// GET /api/plans - Get user's saved HIIT plans
router.get('/', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Log in to view your HIIT plans.' });
    }

    const userId = req.session.user.id;
    const result = await db.query(
      'SELECT * FROM plans WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const plans = result.rows.map(p => ({
      ...p,
      structure: typeof p.structure === 'string' ? JSON.parse(p.structure) : p.structure
    }));

    res.json({ plans });
  } catch (err) {
    console.error('Fetch plans error:', err);
    res.status(500).json({ error: 'Failed to fetch plans.' });
  }
});

// GET /api/plans/:id - Get specific HIIT plan
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM plans WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const plan = result.rows[0];
    plan.structure = typeof plan.structure === 'string' ? JSON.parse(plan.structure) : plan.structure;

    res.json({ plan });
  } catch (err) {
    console.error('Fetch plan detail error:', err);
    res.status(500).json({ error: 'Failed to fetch plan.' });
  }
});

// POST /api/plans - Create a new HIIT plan
router.post('/', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'You must be logged in to create a plan.' });
    }

    const { name, description, groups } = req.body;

    if (!name || !groups || !Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({ error: 'Plan name and at least one exercise group are required.' });
    }

    // Validate groups structure
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!g.title || typeof g.repetitions !== 'number' || g.repetitions < 1) {
        return res.status(400).json({ error: `Group #${i + 1} must have a title and at least 1 repetition.` });
      }
      if (!g.items || !Array.isArray(g.items) || g.items.length === 0) {
        return res.status(400).json({ error: `Group #${i + 1} (${g.title}) must contain at least one exercise.` });
      }
      for (let j = 0; j < g.items.length; j++) {
        const item = g.items[j];
        if (!item.exercise_id || !item.type || !['reps', 'duration'].includes(item.type) || !item.target_value) {
          return res.status(400).json({ error: `Invalid exercise configuration in group ${g.title}, item #${j + 1}.` });
        }
      }
    }

    const planId = uuidv4();
    const userId = req.session.user.id;
    const structure = { groups };

    await db.query(
      `INSERT INTO plans (id, user_id, name, description, structure)
       VALUES ($1, $2, $3, $4, $5)`,
      [planId, userId, name.trim(), description ? description.trim() : '', JSON.stringify(structure)]
    );

    res.status(201).json({
      message: 'HIIT Plan created successfully!',
      plan: {
        id: planId,
        user_id: userId,
        name: name.trim(),
        description: description ? description.trim() : '',
        structure
      }
    });
  } catch (err) {
    console.error('Create plan error:', err);
    res.status(500).json({ error: 'Failed to create plan.' });
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

    const check = await db.query('SELECT user_id FROM plans WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    if (check.rows[0].user_id !== userId) {
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
