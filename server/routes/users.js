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

// GET /api/users - List all registered users (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// PATCH /api/users/:id/role - Update a user's role (Admin only)
router.patch('/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "user" or "admin".' });
    }

    const check = await db.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

    // If target user is current session user, update session as well
    if (req.session.user.id === id) {
      req.session.user.role = role;
    }

    res.json({ message: 'User role updated successfully.', user: { id, role } });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// DELETE /api/users/:id - Delete a user (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.session.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account from the control panel.' });
    }

    const check = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete user (cascade deletes user's custom exercises and plans)
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    // Clean up any remaining references to deleted exercises in plans structure
    const plansResult = await db.query('SELECT id, structure FROM plans');
    const exResult = await db.query('SELECT id FROM exercises');
    const validExIds = new Set(exResult.rows.map(r => r.id));

    for (const plan of plansResult.rows) {
      let structure = typeof plan.structure === 'string' ? JSON.parse(plan.structure) : plan.structure;
      let modified = false;

      if (structure && Array.isArray(structure.groups)) {
        for (const group of structure.groups) {
          if (Array.isArray(group.items)) {
            const initialLen = group.items.length;
            group.items = group.items.filter(item => validExIds.has(item.exercise_id));
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

    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
