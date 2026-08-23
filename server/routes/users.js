const express = require('express');
const bcrypt = require('bcryptjs');
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

// PATCH / PUT /api/users/:id/role - Update a user's role (Admin only)
const handleUpdateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'superuser', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "user", "superuser", or "admin".' });
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
};
router.patch('/:id/role', requireAdmin, handleUpdateRole);
router.put('/:id/role', requireAdmin, handleUpdateRole);

// PATCH / PUT /api/users/:id/password - Update a user's password directly (Admin only)
const handleUpdatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({ error: 'Password cannot be empty.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const check = await db.query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, id]);

    res.json({ message: 'Password updated successfully.', user: { id, username: check.rows[0].username } });
  } catch (err) {
    console.error('Update user password error:', err);
    res.status(500).json({ error: 'Failed to update user password.' });
  }
};
router.patch('/:id/password', requireAdmin, handleUpdatePassword);
router.put('/:id/password', requireAdmin, handleUpdatePassword);

// GET /api/users/:id/plans - List all admin/superuser-created plans with is_assigned status for user (Admin only)
router.get('/:id/plans', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const userCheck = await db.query('SELECT id, username, email, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Fetch all plans created by Admin or SuperUser
    const plansResult = await db.query(
      `SELECT p.id, p.name, p.description, p.is_public, p.structure, p.created_at, p.user_id,
              u.username as author_name, u.role as author_role,
              CASE WHEN uap.plan_id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned
       FROM plans p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN user_assigned_plans uap ON uap.plan_id = p.id AND uap.user_id = $1
       WHERE u.role IN ('admin', 'superuser') OR LOWER(u.username) = 'daniele'
       ORDER BY p.name ASC`,
      [id]
    );

    const plans = plansResult.rows.map(p => ({
      ...p,
      is_public: Boolean(p.is_public),
      is_assigned: Boolean(p.is_assigned),
      structure: typeof p.structure === 'string' ? JSON.parse(p.structure) : p.structure
    }));

    res.json({
      user: userCheck.rows[0],
      plans
    });
  } catch (err) {
    console.error('Fetch user assignable plans error:', err);
    res.status(500).json({ error: 'Failed to fetch user plans.' });
  }
});

// PUT /api/users/:id/plans - Update assigned plans for user (Admin only)
router.put('/:id/plans', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const planIds = req.body.plan_ids || req.body.planIds || [];

    if (!Array.isArray(planIds)) {
      return res.status(400).json({ error: 'plan_ids must be an array.' });
    }

    const userCheck = await db.query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify all planIds exist and are created by admin/superuser
    let validPlanIds = [];
    if (planIds.length > 0) {
      const validCheck = await db.query(
        `SELECT p.id FROM plans p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = ANY($1::text[]) AND (u.role IN ('admin', 'superuser') OR LOWER(u.username) = 'daniele')`,
        [planIds]
      );
      validPlanIds = validCheck.rows.map(r => r.id);
    }

    // Delete existing assignments for this user
    await db.query('DELETE FROM user_assigned_plans WHERE user_id = $1', [id]);

    // Insert new assignments
    for (const planId of validPlanIds) {
      await db.query(
        'INSERT INTO user_assigned_plans (user_id, plan_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, planId]
      );
    }

    res.json({
      message: 'User assigned plans updated successfully.',
      assignedPlanIds: validPlanIds
    });
  } catch (err) {
    console.error('Update user assigned plans error:', err);
    res.status(500).json({ error: 'Failed to update user assigned plans.' });
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
