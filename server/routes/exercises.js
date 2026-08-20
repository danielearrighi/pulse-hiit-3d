const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/db');

const router = express.Router();

// GET /api/exercises - list all available exercises for the session user (admins see all)
router.get('/', async (req, res) => {
  try {
    const user = req.session ? req.session.user : null;
    const userId = user ? user.id : null;
    const isAdmin = user && (user.role === 'admin' || (user.username && user.username.toLowerCase() === 'daniele'));

    let result;
    if (isAdmin) {
      result = await db.query(
        `SELECT e.*, u.username as author_name FROM exercises e
         LEFT JOIN users u ON e.user_id = u.id
         ORDER BY e.is_standard DESC, e.name ASC`
      );
    } else if (userId) {
      result = await db.query(
        `SELECT e.*, u.username as author_name FROM exercises e
         LEFT JOIN users u ON e.user_id = u.id
         WHERE e.is_standard = TRUE 
            OR (e.is_private = FALSE) 
            OR (e.user_id = $1)
         ORDER BY e.is_standard DESC, e.name ASC`,
        [userId]
      );
    } else {
      result = await db.query(
        `SELECT e.*, u.username as author_name FROM exercises e
         LEFT JOIN users u ON e.user_id = u.id
         WHERE e.is_standard = TRUE OR e.is_private = FALSE
         ORDER BY e.is_standard DESC, e.name ASC`
      );
    }

    // Ensure keyframes are parsed if returned as string
    const exercises = result.rows.map(ex => ({
      ...ex,
      keyframes: typeof ex.keyframes === 'string' ? JSON.parse(ex.keyframes) : ex.keyframes
    }));

    res.json({ exercises });
  } catch (err) {
    console.error('Fetch exercises error:', err);
    res.status(500).json({ error: 'Failed to fetch exercises.' });
  }
});

// POST /api/exercises - Create a new custom exercise with 3D mannequin keyframes
router.post('/', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'You must be logged in to create exercises.' });
    }

    const { name, category, is_private, keyframes } = req.body;

    if (!name || !category || !keyframes || !Array.isArray(keyframes) || keyframes.length === 0) {
      return res.status(400).json({ error: 'Exercise name, category, and at least one 3D keyframe position are required.' });
    }

    const id = uuidv4();
    const userId = req.session.user.id;
    const isPrivateBool = Boolean(is_private);

    await db.query(
      `INSERT INTO exercises (id, user_id, name, category, is_standard, is_private, keyframes)
       VALUES ($1, $2, $3, $4, FALSE, $5, $6)`,
      [id, userId, name.trim(), category.trim(), isPrivateBool, JSON.stringify(keyframes)]
    );

    const created = {
      id,
      user_id: userId,
      name: name.trim(),
      category: category.trim(),
      is_standard: false,
      is_private: isPrivateBool,
      keyframes
    };

    res.status(201).json({ message: 'Exercise created successfully!', exercise: created });
  } catch (err) {
    console.error('Create exercise error:', err);
    res.status(500).json({ error: 'Failed to create exercise.' });
  }
});

// GET /api/exercises/:id/usage - Check which plans use an exercise
router.get('/:id/usage', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { id } = req.params;
    const userId = req.session.user.id;

    const result = await db.query(
      'SELECT id, name, structure FROM plans WHERE user_id = $1',
      [userId]
    );

    const plansUsingExercise = [];

    for (const plan of result.rows) {
      const structure = typeof plan.structure === 'string' ? JSON.parse(plan.structure) : plan.structure;
      if (structure && Array.isArray(structure.groups)) {
        const isUsed = structure.groups.some(g =>
          Array.isArray(g.items) && g.items.some(i => i.exercise_id === id)
        );
        if (isUsed) {
          plansUsingExercise.push({ id: plan.id, name: plan.name });
        }
      }
    }

    res.json({ plans: plansUsingExercise });
  } catch (err) {
    console.error('Fetch exercise usage error:', err);
    res.status(500).json({ error: 'Failed to fetch exercise usage.' });
  }
});

// DELETE /api/exercises/:id - Delete a user's custom exercise
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { id } = req.params;
    const userId = req.session.user.id;

    // Check ownership
    const exResult = await db.query('SELECT * FROM exercises WHERE id = $1', [id]);
    if (exResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }

    const ex = exResult.rows[0];
    const user = req.session.user;
    const isAdmin = user && (user.role === 'admin' || (user.username && user.username.toLowerCase() === 'daniele'));

    if (ex.is_standard && !isAdmin) {
      return res.status(403).json({ error: 'Standard system exercises can only be deleted by an administrator.' });
    }

    if (!ex.is_standard && ex.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this exercise.' });
    }

    // Delete exercise from exercises table
    await db.query('DELETE FROM exercises WHERE id = $1', [id]);

    // Also remove exercise from any plans structure in DB
    const plansResult = await db.query('SELECT id, structure FROM plans');
    for (const plan of plansResult.rows) {
      let structure = typeof plan.structure === 'string' ? JSON.parse(plan.structure) : plan.structure;
      let modified = false;

      if (structure && Array.isArray(structure.groups)) {
        for (const group of structure.groups) {
          if (Array.isArray(group.items)) {
            const initialLen = group.items.length;
            group.items = group.items.filter(item => item.exercise_id !== id);
            if (group.items.length !== initialLen) {
              modified = true;
            }
          }
        }
      }

      if (modified) {
        await db.query(
          'UPDATE plans SET structure = $1 WHERE id = $2',
          [JSON.stringify(structure), plan.id]
        );
      }
    }

    res.json({ message: 'Exercise deleted successfully.' });
  } catch (err) {
    console.error('Delete exercise error:', err);
    res.status(500).json({ error: 'Failed to delete exercise.' });
  }
});

module.exports = router;
