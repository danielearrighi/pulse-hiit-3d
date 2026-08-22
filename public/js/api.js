/**
 * Centralized API Client for Pulse HIIT 3D
 */

const API = {
  // Auth endpoints
  async getMe() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch (err) {
      console.warn('Get auth error:', err);
      return null;
    }
  },

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: username, username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data.user;
  },

  async register(username, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data.user;
  },

  async logout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    return res.ok;
  },

  // Exercises endpoints
  async getExercises() {
    try {
      const res = await fetch('/api/exercises');
      const data = await res.json();
      return data.exercises || [];
    } catch (err) {
      console.error('Fetch exercises error:', err);
      return [];
    }
  },

  async getExerciseById(id) {
    const res = await fetch(`/api/exercises/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Exercise not found');
    return data.exercise;
  },

  async createExercise(exerciseData) {
    const res = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exerciseData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save exercise');
    return data.exercise;
  },

  async updateExercise(id, exerciseData) {
    const res = await fetch(`/api/exercises/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exerciseData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update exercise');
    return data.exercise;
  },

  async deleteExercise(id) {
    const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete exercise');
    return data;
  },

  // Plans endpoints
  async getPlans() {
    try {
      const res = await fetch('/api/plans');
      if (!res.ok) return [];
      const data = await res.json();
      return data.plans || [];
    } catch (err) {
      console.error('Fetch plans error:', err);
      return [];
    }
  },

  async getPlanById(id) {
    const res = await fetch(`/api/plans/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Plan not found');
    return data.plan;
  },

  async createPlan(planData) {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save plan');
    return data.plan;
  },

  async updatePlan(id, planData) {
    const res = await fetch(`/api/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update plan');
    return data.plan;
  },

  async deletePlan(id) {
    const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete plan');
    return data;
  },

  // Users / Admin endpoints
  async getUsers() {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
    return data.users || [];
  },

  async updateUserRole(id, role) {
    const res = await fetch(`/api/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update role');
    return data;
  },

  async deleteUser(id) {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete user');
    return data;
  },

  // Database Backup & Restore endpoints
  async getAdminStats() {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch database statistics');
    return data;
  },

  async restoreBackup(backupJson) {
    const res = await fetch('/api/admin/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof backupJson === 'string' ? backupJson : JSON.stringify(backupJson)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to restore backup');
    return data;
  }
};

window.API = API;
