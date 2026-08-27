/**
 * Centralized API service for communicating with Express.js backend
 */

export const api = {
  // Auth endpoints
  async getMe() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch (err) {
      console.warn('[API] Get auth error:', err);
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
    if (!res.ok) throw new Error(data.error || 'Login fallito');
    return data.user;
  },

  async register(username, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registrazione fallita');
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
      console.error('[API] Fetch exercises error:', err);
      return [];
    }
  },

  async getExerciseById(id) {
    const res = await fetch(`/api/exercises/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Esercizio non trovato');
    return data.exercise;
  },

  async createExercise(exerciseData) {
    const res = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exerciseData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile salvare l\'esercizio');
    return data.exercise;
  },

  async updateExercise(id, exerciseData) {
    const res = await fetch(`/api/exercises/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exerciseData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile aggiornare l\'esercizio');
    return data.exercise;
  },

  async getExerciseUsage(id) {
    try {
      const res = await fetch(`/api/exercises/${id}/usage`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.plans || [];
    } catch (err) {
      console.error('[API] Fetch exercise usage error:', err);
      return [];
    }
  },

  async deleteExercise(id) {
    const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile eliminare l\'esercizio');
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
      console.error('[API] Fetch plans error:', err);
      return [];
    }
  },

  async getPlanById(id) {
    const res = await fetch(`/api/plans/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Scheda non trovata');
    return data.plan;
  },

  async createPlan(planData) {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile salvare la scheda');
    return data.plan;
  },

  async updatePlan(id, planData) {
    const res = await fetch(`/api/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile aggiornare la scheda');
    return data.plan;
  },

  async deletePlan(id) {
    const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile eliminare la scheda');
    return data;
  },

  // Users / Admin endpoints
  async getUsers() {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile recuperare gli utenti');
    return data.users || [];
  },

  async updateUserRole(id, role) {
    const res = await fetch(`/api/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile aggiornare il ruolo');
    return data;
  },

  async deleteUser(id) {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile eliminare l\'utente');
    return data;
  },

  async updateUserPassword(id, password) {
    const res = await fetch(`/api/users/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile aggiornare la password');
    return data;
  },

  async getUserAssignedPlans(userId) {
    const res = await fetch(`/api/users/${userId}/plans`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile recuperare le schede assegnate');
    return data;
  },

  async updateUserAssignedPlans(userId, planIds) {
    const res = await fetch(`/api/users/${userId}/plans`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_ids: planIds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile aggiornare le schede assegnate');
    return data;
  },

  // Database Backup & Restore endpoints
  async getAdminStats() {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Impossibile recuperare le statistiche del database');
    return data;
  },

  async restoreBackup(backupJson) {
    const res = await fetch('/api/admin/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof backupJson === 'string' ? backupJson : JSON.stringify(backupJson)
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      if (!res.ok) {
        throw new Error(`Errore HTTP ${res.status}: ${res.statusText}`);
      }
      throw e;
    }
    if (!res.ok) throw new Error(data.error || 'Impossibile ripristinare il backup');
    return data;
  }
};

export default api;
