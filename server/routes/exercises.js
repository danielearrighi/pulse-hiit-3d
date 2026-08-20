const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/db');

const router = express.Router();

// GET /api/exercises - list all available exercises for the session user
router.get('/', async (req, res) => {
  try {
    const userId = req.session && req.session.user ? req.session.user.id : null;

    let result;
    if (userId) {
      result = await db.query(
        `SELECT * FROM exercises 
         WHERE is_standard = TRUE 
            OR (is_private = FALSE) 
            OR (user_id = $1)
         ORDER BY is_standard DESC, name ASC`,
        [userId]
      );
    } else {
      result = await db.query(
        `SELECT * FROM exercises 
         WHERE is_standard = TRUE OR is_private = FALSE
         ORDER BY is_standard DESC, name ASC`
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
    if (ex.is_standard) {
      return res.status(403).json({ error: 'Standard exercises cannot be deleted.' });
    }

    if (ex.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this exercise.' });
    }

    await db.query('DELETE FROM exercises WHERE id = $1', [id]);
    res.json({ message: 'Exercise deleted successfully.' });
  } catch (err) {
    console.error('Delete exercise error:', err);
    res.status(500).json({ error: 'Failed to delete exercise.' });
  }
});

module.exports = router;
