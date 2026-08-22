/**
 * Main Client Application Manager with i18n Integration
 */

class App {
  constructor() {
    this.currentUser = null;
    this.exercises = [];
    this.exercisesMap = {};
    this.plans = [];
    this.users = [];

    // Sub-controllers
    this.mannequinEditor = null;
    this.planBuilder = null;
    this.workoutPlayer = null;

    // Keyframe editor state
    this.editorKeyframes = [];
    this.activeKeyframeIndex = 0;

    this.init();
  }

  async init() {
    // Initialize i18n first
    if (window.i18n) {
      await window.i18n.init();
    }

    this.planBuilder = new PlanBuilder(this);
    this.workoutPlayer = new WorkoutPlayer(this);

    this.initNavigation();
    this.initAuthModal();
    this.initMannequinEditor();
    this.initLanguageListener();

    await this.checkAuthStatus();
    await this.fetchExercises();
    await this.fetchPlans();
  }

  isAdmin() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele');
  }

  initLanguageListener() {
    window.addEventListener('languageChanged', () => {
      this.updateAuthUI();
      this.renderDashboard();
      this.renderLibrary();
      if (this.isAdmin()) this.renderUsersTable();
      if (this.planBuilder) this.planBuilder.render();
      if (this.mannequinEditor) this.renderKeyframeStrip();
    });
  }

  initNavigation() {
    document.querySelectorAll('.tab-btn, .nav-bottom-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    document.getElementById('createPlanHeroBtn').addEventListener('click', () => {
      this.switchTab('builder');
    });

    document.getElementById('createExHeroBtn').addEventListener('click', () => {
      this.switchTab('editor');
    });
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab-btn, .nav-bottom-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `${tabId}Tab`);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'editor' && this.mannequinEditor) {
      setTimeout(() => this.mannequinEditor.onResize(), 100);
    }

    if (tabId === 'admin') {
      this.fetchUsers();
    }
  }

  initAuthModal() {
    const modal = document.getElementById('authModal');
    const openBtn = document.getElementById('openAuthModalBtn');
    const closeBtn = document.getElementById('authModalCloseBtn');

    if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    const tabAuthBtns = modal.querySelectorAll('.auth-tab-btn');
    tabAuthBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabAuthBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const mode = e.target.getAttribute('data-mode');
        document.getElementById('loginForm').style.display = mode === 'login' ? 'block' : 'none';
        document.getElementById('registerForm').style.display = mode === 'register' ? 'block' : 'none';
      });
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameOrEmail = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        this.currentUser = data.user;
        this.updateAuthUI();
        modal.classList.remove('active');
        await this.fetchExercises();
        await this.fetchPlans();
      } catch (err) {
        alert(err.message);
      }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('regUsername').value;
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        this.currentUser = data.user;
        this.updateAuthUI();
        modal.classList.remove('active');
        await this.fetchExercises();
        await this.fetchPlans();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  async checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      this.currentUser = data.user;
      this.updateAuthUI();
    } catch (e) {
      console.warn('Auth check failed:', e);
    }
  }

  updateAuthUI() {
    const userSection = document.getElementById('userAuthSection');
    const adminTabBtn = document.getElementById('adminTabBtn');
    const adminBottomTabBtn = document.getElementById('adminBottomTabBtn');
    const t = window.t;

    const isAdmin = this.isAdmin();
    if (adminTabBtn) adminTabBtn.style.display = isAdmin ? '' : 'none';
    if (adminBottomTabBtn) adminBottomTabBtn.style.display = isAdmin ? '' : 'none';

    if (!isAdmin && document.getElementById('adminTab') && document.getElementById('adminTab').classList.contains('active')) {
      this.switchTab('dashboard');
    }

    if (!userSection) return;

    if (this.currentUser) {
      const roleBadge = isAdmin ? ` <span class="badge badge-role-admin" style="font-size:0.7rem; vertical-align: middle;">ADMIN</span>` : '';
      userSection.innerHTML = `
        <span style="font-weight: 600; font-size: 0.9rem; color: var(--accent-cyan);">${this.escapeHtml(this.currentUser.username)}${roleBadge}</span>
        <button id="logoutBtn" class="btn btn-secondary" style="padding: 0.4rem 0.9rem; font-size: 0.85rem;">${t('app.auth.logout')}</button>
      `;
      document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        this.currentUser = null;
        this.updateAuthUI();
        await this.fetchExercises();
        await this.fetchPlans();
      });
    } else {
      userSection.innerHTML = `
        <button id="openAuthModalBtn" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.85rem;">${t('app.auth.login_register')}</button>
      `;
      document.getElementById('openAuthModalBtn').addEventListener('click', () => {
        document.getElementById('authModal').classList.add('active');
      });
    }
  }

  async fetchExercises() {
    try {
      const res = await fetch('/api/exercises');
      const data = await res.json();
      this.exercises = data.exercises || [];
      this.exercisesMap = {};
      this.exercises.forEach(ex => {
        this.exercisesMap[ex.id] = ex;
      });

      this.planBuilder.setAvailableExercises(this.exercises);
      this.renderLibrary();
    } catch (err) {
      console.error('Fetch exercises error:', err);
    }
  }

  async fetchPlans() {
    try {
      if (!this.currentUser) {
        this.plans = [];
        this.renderDashboard();
        return;
      }
      const res = await fetch('/api/plans');
      const data = await res.json();
      this.plans = data.plans || [];
      this.renderDashboard();
    } catch (err) {
      console.error('Fetch plans error:', err);
    }
  }

  renderDashboard() {
    const grid = document.getElementById('plansGrid');
    if (!grid) return;
    const t = window.t;

    if (!this.currentUser) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 0.5rem; font-size: 1.4rem;">${t('dashboard.empty_plans')}</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${t('dashboard.subtitle')}</p>
          <button class="btn btn-primary btn-lg" onclick="document.getElementById('authModal').classList.add('active')">${t('app.auth.login_register')}</button>
        </div>
      `;
      return;
    }

    if (this.plans.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 0.5rem;">${t('dashboard.empty_plans')}</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${t('dashboard.subtitle')}</p>
          <button class="btn btn-primary" onclick="app.switchTab('builder')">${t('dashboard.build_plan_btn')}</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.plans.map(p => {
      const groupsCount = (p.structure.groups || []).length;
      let totalExercises = 0;
      (p.structure.groups || []).forEach(g => {
        totalExercises += (g.items || []).length * (g.repetitions || 1);
      });

      return `
        <div class="glass-card">
          <div class="plan-card-header">
            <div class="plan-title">${this.escapeHtml(p.name)}</div>
            <button class="btn btn-danger delete-plan-btn" data-pid="${p.id}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">${t('dashboard.delete_plan')}</button>
          </div>
          <div class="plan-desc">${this.escapeHtml(p.description || '')}</div>
          <div class="plan-meta">
            <span class="meta-pill">${groupsCount} ${t('builder.circuit_groups')}</span>
            <span class="meta-pill">${totalExercises} ${t('dashboard.exercises_count')}</span>
          </div>
          <button class="btn btn-success btn-lg start-plan-btn" data-pid="${p.id}" style="width: 100%;">
            ${t('dashboard.start_workout')}
          </button>
        </div>
      `;
    }).join('');

    // Bind event listeners for plan start and delete
    grid.querySelectorAll('.start-plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pid = e.currentTarget.getAttribute('data-pid');
        const plan = this.plans.find(x => x.id === pid);
        if (plan) {
          this.workoutPlayer.startWorkout(plan, this.exercisesMap);
        }
      });
    });

    grid.querySelectorAll('.delete-plan-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const pid = e.currentTarget.getAttribute('data-pid');
        if (confirm(t('dashboard.delete_plan') + '?')) {
          try {
            await fetch(`/api/plans/${pid}`, { method: 'DELETE' });
            await this.fetchPlans();
          } catch (err) {
            alert('Error');
          }
        }
      });
    });
  }

  getTranslatedExerciseName(ex) {
    const t = window.t;
    if (ex.is_standard && t(`exercises.${ex.name}`) !== `exercises.${ex.name}`) {
      return t(`exercises.${ex.name}`);
    }
    return ex.name;
  }

  getTranslatedCategory(category) {
    const t = window.t;
    if (t(`categories.${category}`) !== `categories.${category}`) {
      return t(`categories.${category}`);
    }
    return category || '';
  }

  renderLibrary() {
    const grid = document.getElementById('exercisesGrid');
    if (!grid) return;
    const t = window.t;

    if (this.exercises.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">
          ${t('library.no_exercises')}
        </div>
      `;
      return;
    }

    grid.innerHTML = this.exercises.map(ex => {
      const displayName = this.getTranslatedExerciseName(ex);
      const displayCategory = this.getTranslatedCategory(ex.category);
      
      let badgeText = '';
      if (ex.is_standard) {
        badgeText = t('library.standard_badge');
      } else {
        const author = ex.author_name ? ` (${ex.author_name})` : '';
        if (ex.is_private) {
          badgeText = t('library.private_badge') + author;
        } else {
          badgeText = t('library.custom_badge') + author;
        }
      }

      const isAdmin = this.isAdmin();
      const canDelete = this.currentUser && ((!ex.is_standard && ex.user_id === this.currentUser.id) || isAdmin);

      return `
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
            <h4 style="font-size: 1.2rem; font-weight: 700;">${this.escapeHtml(displayName)}</h4>
            <span class="badge badge-${(ex.category || '').toLowerCase().replace(/\s+/g, '')}">${this.escapeHtml(displayCategory)}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            ${badgeText} • ${ex.keyframes ? ex.keyframes.length : 0} Pos
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary preview-ex-btn" data-exid="${ex.id}" style="flex: 1; font-size: 0.85rem;">
              ${t('library.preview_btn')}
            </button>
            ${canDelete ? `
              <button class="btn btn-danger delete-ex-btn" data-exid="${ex.id}" style="flex: 1; font-size: 0.85rem;">
                ${t('library.delete_btn')}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.preview-ex-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const exid = e.currentTarget.getAttribute('data-exid');
        const ex = this.exercisesMap[exid];
        if (ex) {
          this.showPreviewModal(ex);
        }
      });
    });

    grid.querySelectorAll('.delete-ex-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const exid = e.currentTarget.getAttribute('data-exid');
        const ex = this.exercisesMap[exid];
        if (ex) {
          await this.deleteExercise(ex);
        }
      });
    });
  }

  async deleteExercise(ex) {
    const t = window.t;
    const displayName = this.getTranslatedExerciseName(ex);

    try {
      const res = await fetch(`/api/exercises/${ex.id}/usage`);
      let plansUsingExercise = [];

      if (res.ok) {
        const data = await res.json();
        plansUsingExercise = data.plans || [];
      } else {
        plansUsingExercise = (this.plans || []).filter(p => {
          return (p.structure.groups || []).some(g => (g.items || []).some(item => item.exercise_id === ex.id));
        });
      }

      let confirmMsg = '';
      if (plansUsingExercise.length > 0) {
        const planListStr = plansUsingExercise.map(p => `• ${p.name}`).join('\n');
        confirmMsg = t('library.confirm_delete_with_plans_msg', {
          name: displayName,
          plans: planListStr
        });
      } else {
        confirmMsg = t('library.confirm_delete_msg', {
          name: displayName
        });
      }

      if (!confirm(confirmMsg)) {
        return;
      }

      const delRes = await fetch(`/api/exercises/${ex.id}`, {
        method: 'DELETE'
      });

      const delData = await delRes.json();
      if (!delRes.ok) {
        throw new Error(delData.error || t('library.delete_error'));
      }

      await this.fetchExercises();
      await this.fetchPlans();
    } catch (err) {
      alert(err.message || t('library.delete_error'));
    }
  }

  async fetchUsers() {
    try {
      if (!this.isAdmin()) return;
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        this.users = data.users || [];
        this.renderUsersTable();
      } else {
        console.error('Fetch users failed:', data.error);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  }

  renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    const t = window.t;

    if (this.users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            ${t('admin.no_users')}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.users.map(u => {
      const isSelf = this.currentUser && this.currentUser.id === u.id;
      const formattedDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : '-';

      return `
        <tr>
          <td>
            <div style="font-weight: 700;">${this.escapeHtml(u.username)}</div>
          </td>
          <td style="color: var(--text-muted);">${this.escapeHtml(u.email)}</td>
          <td>
            <select class="user-role-select" data-uid="${u.id}">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>${t('admin.role_user')}</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${t('admin.role_admin')}</option>
            </select>
          </td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${formattedDate}</td>
          <td style="text-align: right;">
            ${isSelf ? `
              <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">(${t('admin.cannot_delete_self')})</span>
            ` : `
              <button class="btn btn-danger delete-user-btn" data-uid="${u.id}" data-uname="${this.escapeHtml(u.username)}" style="padding: 0.35rem 0.75rem; font-size: 0.82rem;">
                ${t('admin.delete_user_btn')}
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Role change event listeners
    tbody.querySelectorAll('.user-role-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const uid = e.target.getAttribute('data-uid');
        const newRole = e.target.value;
        try {
          const res = await fetch(`/api/users/${uid}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to update role');

          if (this.currentUser && this.currentUser.id === uid) {
            this.currentUser.role = newRole;
            this.updateAuthUI();
            await this.fetchExercises();
          }
          await this.fetchUsers();
        } catch (err) {
          alert(err.message);
          await this.fetchUsers();
        }
      });
    });

    // Delete user event listeners
    tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const uid = e.currentTarget.getAttribute('data-uid');
        const uname = e.currentTarget.getAttribute('data-uname');
        const msg = t('admin.confirm_delete_user', { username: uname });

        if (confirm(msg)) {
          try {
            const res = await fetch(`/api/users/${uid}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete user');

            await this.fetchUsers();
            await this.fetchExercises();
            await this.fetchPlans();
          } catch (err) {
            alert(err.message);
          }
        }
      });
    });
  }

  showPreviewModal(exercise) {
    const modal = document.getElementById('previewModal');
    const displayName = this.getTranslatedExerciseName(exercise);
    document.getElementById('previewModalTitle').innerText = displayName;
    modal.classList.add('active');

    const canvas = document.getElementById('previewCanvas');
    const mannequin = new Mannequin(canvas, { isEditor: false });

    if (exercise.keyframes && exercise.keyframes.length > 0) {
      mannequin.setKeyframes(exercise.keyframes);
      mannequin.play();
    }

    const closeHandler = () => {
      mannequin.stop();
      mannequin.destroy();
      modal.classList.remove('active');
      document.getElementById('previewModalCloseBtn').removeEventListener('click', closeHandler);
    };

    document.getElementById('previewModalCloseBtn').addEventListener('click', closeHandler);
  }

  showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._toastTimer);
    t._toastTimer = setTimeout(() => t.classList.remove('show'), 1500);
  }

  initMannequinEditor() {
    const canvas = document.getElementById('mannequinCanvas');
    if (!canvas) return;

    const t = window.t;

    this.mannequinEditor = new Mannequin(canvas, {
      enableAnchors: true,
      isEditor: true,
      onKeyframeChange: () => {
        this.renderKeyframeStrip();
        this.syncScrubUI();
      },
      onPlaybackStep: () => {
        this.syncScrubUI();
      },
      onToast: (msg) => {
        this.showToast(msg);
      }
    });

    this.renderKeyframeStrip();

    // Base Poses buttons (stand, supine, prone)
    document.querySelectorAll('.seg button[data-base]').forEach(btn => {
      btn.addEventListener('click', () => {
        const baseId = btn.dataset.base;
        document.querySelectorAll('.seg button[data-base]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.classList.add('flash');
        setTimeout(() => btn.classList.remove('flash'), 220);
        this.mannequinEditor.applyBase(baseId);
      });
    });

    // Preset Exercises dropdown
    const presetSelect = document.getElementById('exercisePresetSelect');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.mannequinEditor.loadPreset(e.target.value);
          const nameMap = {
            squat: 'Squat',
            jack: 'Jumping Jacks',
            lunge: 'Affondi',
            burpee: 'Burpees'
          };
          this.showToast((nameMap[e.target.value] || e.target.value) + ' caricato');
          e.target.value = '';
        }
      });
    }

    // Play / Pause
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.mannequinEditor.togglePlay();
      });
    }

    // Duration slider
    const durInput = document.getElementById('dur');
    if (durInput) {
      durInput.addEventListener('input', (e) => {
        const d = parseFloat(e.target.value);
        this.mannequinEditor.duration = d;
        const durVal = document.getElementById('durVal');
        if (durVal) durVal.textContent = d.toFixed(2) + 's';
        const tempoVal = document.getElementById('tempoVal');
        if (tempoVal) tempoVal.textContent = Math.round(60 / Math.max(d * 2, 0.1));
      });
    }

    // Timeline Scrub slider
    const scrubInput = document.getElementById('scrub');
    if (scrubInput) {
      scrubInput.addEventListener('input', (e) => {
        this.mannequinEditor.stop();
        const L = Math.max(this.mannequinEditor.seq.length, 1);
        this.mannequinEditor.playPos = (parseInt(e.target.value, 10) / 1000) * L;
        const s = this.mannequinEditor.sampleAt(this.mannequinEditor.playPos);
        const scrubVal = document.getElementById('scrubVal');
        if (scrubVal && this.mannequinEditor.seq[s.i] !== undefined) {
          const nextIdx = (s.i + 1) % L;
          scrubVal.textContent = 'K' + (this.mannequinEditor.seq[s.i] + 1) + '→K' + (this.mannequinEditor.seq[nextIdx] + 1);
        }
      });
    }

    // History buttons: Undo & Redo
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', () => this.mannequinEditor.undo());

    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) redoBtn.addEventListener('click', () => this.mannequinEditor.redo());

    // Rig Toggles (symmetry, lockFeet, onion, autosave)
    document.querySelectorAll('.toggle[data-flag], [data-flag]').forEach(btn => {
      btn.addEventListener('click', () => {
        let f = btn.dataset.flag;
        if (f === 'sym') f = 'symmetry';
        if (!this.mannequinEditor) return;
        this.mannequinEditor.flags[f] = !this.mannequinEditor.flags[f];
        const isActive = !!this.mannequinEditor.flags[f];
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('on', isActive);
        if (f === 'onion') this.mannequinEditor.refreshGhost();
      });
    });


    // Reset Camera
    const resetCamBtn = document.getElementById('resetCameraBtn');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => {
        this.mannequinEditor.resetView();
      });
    }

    // Help Modal events
    const helpBtn = document.getElementById('editorHelpBtn');
    const helpModal = document.getElementById('editorHelpModal');
    const helpCloseBtn = document.getElementById('editorHelpCloseBtn');
    const helpOkBtn = document.getElementById('editorHelpOkBtn');

    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    }
    if (helpCloseBtn && helpModal) {
      helpCloseBtn.addEventListener('click', () => helpModal.classList.remove('active'));
    }
    if (helpOkBtn && helpModal) {
      helpOkBtn.addEventListener('click', () => helpModal.classList.remove('active'));
    }

    // Global Keydown shortcuts
    window.addEventListener('keydown', (e) => {
      const editorTab = document.getElementById('editorTab');
      if (!editorTab || !editorTab.classList.contains('active')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target && e.target.tagName) || '')) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.shiftKey ? this.mannequinEditor.redo() : this.mannequinEditor.undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.mannequinEditor.redo();
        return;
      }
      if (mod) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.mannequinEditor.togglePlay();
      } else if (e.key === 's' || e.key === 'S') {
        this.mannequinEditor.pushUndo();
        this.mannequinEditor.saveCurrent(false);
      } else if (e.key === 'd' || e.key === 'D') {
        this.mannequinEditor.cloneKey();
      } else if (e.key === 'r' || e.key === 'R') {
        this.mannequinEditor.reps = 0;
        const repCount = document.getElementById('repCount');
        if (repCount) repCount.textContent = '0';
      }
    });

    // Save Custom Exercise Form
    document.getElementById('saveExerciseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.currentUser) {
        alert(t('app.auth.login_register'));
        document.getElementById('authModal').classList.add('active');
        return;
      }

      const name = document.getElementById('exNameInput').value.trim();
      const category = document.getElementById('exCategorySelect').value;
      const isPrivate = document.getElementById('exPrivateCheck').checked;

      if (!name) {
        alert(t('editor.ex_name_placeholder'));
        return;
      }

      const keyframes = this.mannequinEditor.getKeyframes();
      if (keyframes.length < 2) {
        alert(t('editor.add_keyframes_alert'));
        return;
      }

      try {
        const res = await fetch('/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            is_private: isPrivate,
            keyframes: keyframes
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save exercise.');

        this.showToast(t('editor.ex_saved'));
        document.getElementById('exNameInput').value = '';
        await this.fetchExercises();
        this.switchTab('library');
      } catch (err) {
        alert(err.message);
      }
    });
  }

  syncScrubUI() {
    if (!this.mannequinEditor) return;
    const L = Math.max(this.mannequinEditor.seq.length, 1);
    const p = ((this.mannequinEditor.playPos % L) + L) % L;
    const scrub = document.getElementById('scrub');
    if (scrub) scrub.value = Math.round((p / L) * 1000);

    const i = Math.floor(p);
    const scrubVal = document.getElementById('scrubVal');
    if (scrubVal && this.mannequinEditor.seq[i] !== undefined) {
      const nextIdx = (i + 1) % L;
      scrubVal.textContent = 'K' + (this.mannequinEditor.seq[i] + 1) + '→K' + (this.mannequinEditor.seq[nextIdx] + 1);
    }
  }

  renderKeyframeStrip() {
    const strip = document.getElementById('keyframesStrip');
    if (!strip || !this.mannequinEditor) return;

    strip.innerHTML = '';
    const GAP = 8;
    const chipDrag = { id: -1, from: -1, to: -1, el: null, items: [], rects: [], x0: 0, y0: 0, active: false, timer: 0, suppress: false };

    const chipBegin = () => {
      this.mannequinEditor.stop();
      chipDrag.active = true;
      chipDrag.items = Array.prototype.slice.call(strip.querySelectorAll('.kf:not(.add)'));
      chipDrag.rects = chipDrag.items.map(el => el.getBoundingClientRect());
      if (chipDrag.el) chipDrag.el.classList.add('grabbing');
      chipDrag.items.forEach((el, idx) => {
        if (idx !== chipDrag.from) el.classList.add('sliding');
      });
    };

    const chipMove = (e) => {
      if (e.pointerId !== chipDrag.id) return;
      const dx = e.clientX - chipDrag.x0, dy = e.clientY - chipDrag.y0;
      if (!chipDrag.active) {
        if (Math.hypot(dx, dy) < 10) return;
        if (e.pointerType === 'touch') { chipEnd(); return; }
        chipBegin();
      }
      const R = chipDrag.rects, from = chipDrag.from;
      if (!R || !R[from]) return;
      const w = R[from].width + GAP;
      const center = R[from].left + R[from].width / 2 + dx;
      let to = 0;
      for (let i = 0; i < R.length; i++) {
        if (i !== from && center > R[i].left + R[i].width / 2) to++;
      }
      chipDrag.to = to;
      if (chipDrag.el) chipDrag.el.style.transform = 'translateX(' + dx + 'px) scale(1.05)';
      chipDrag.items.forEach((el, i) => {
        if (i === from) return;
        const sh = (from < i && i <= to) ? -w : (from > i && i >= to) ? w : 0;
        el.style.transform = sh ? 'translateX(' + sh + 'px)' : '';
      });
    };

    const chipEnd = () => {
      clearTimeout(chipDrag.timer);
      window.removeEventListener('pointermove', chipMove);
      window.removeEventListener('pointerup', chipUp);
      window.removeEventListener('pointercancel', chipUp);
      if (chipDrag.el) {
        chipDrag.el.classList.remove('grabbing');
        chipDrag.el.style.transform = '';
      }
      chipDrag.items.forEach(el => {
        el.classList.remove('sliding');
        el.style.transform = '';
      });
      chipDrag.active = false;
      chipDrag.items = [];
      chipDrag.rects = [];
      chipDrag.el = null;
      chipDrag.id = -1;
    };

    const chipUp = (e) => {
      if (e.pointerId !== chipDrag.id) return;
      const was = chipDrag.active, from = chipDrag.from, to = chipDrag.to;
      chipEnd();
      if (!was) return;
      chipDrag.suppress = true;
      setTimeout(() => { chipDrag.suppress = false; }, 60);
      if (to !== from && from >= 0 && to >= 0) {
        this.mannequinEditor.reorderKeys(from, to);
      } else {
        this.renderKeyframeStrip();
      }
    };

    const chipDown = (e, el, i) => {
      if (e.target.classList.contains('x')) return;
      if (e.button > 0) return;
      chipDrag.id = e.pointerId;
      chipDrag.from = i;
      chipDrag.to = i;
      chipDrag.el = el;
      chipDrag.x0 = e.clientX;
      chipDrag.y0 = e.clientY;
      chipDrag.active = false;

      window.addEventListener('pointermove', chipMove);
      window.addEventListener('pointerup', chipUp);
      window.addEventListener('pointercancel', chipUp);
      clearTimeout(chipDrag.timer);
      if (e.pointerType === 'touch') {
        chipDrag.timer = setTimeout(chipBegin, 300);
      }
    };

    this.mannequinEditor.keys.forEach((k, i) => {
      const el = document.createElement('div');
      el.className = 'kf' + (i === this.mannequinEditor.current ? ' active' : '');
      el.innerHTML = '<span class="dot"></span>K' + (i + 1) + (this.mannequinEditor.keys.length > 2 ? '<span class="x">×</span>' : '');

      el.addEventListener('pointerdown', ev => chipDown(ev, el, i));
      el.addEventListener('click', ev => {
        if (chipDrag.suppress) return;
        if (ev.target.classList.contains('x')) {
          this.mannequinEditor.deleteKey(i);
          return;
        }
        this.mannequinEditor.stop();
        if (i !== this.mannequinEditor.current) this.mannequinEditor.pushUndo();
        this.mannequinEditor.loadKey(i);
      });

      strip.appendChild(el);
    });

    // Add button (＋ Nuovo)
    const addBtn = document.createElement('div');
    addBtn.className = 'kf add';
    addBtn.innerHTML = '＋ Nuovo';
    addBtn.addEventListener('click', () => {
      this.mannequinEditor.stop();
      this.mannequinEditor.addKey();
    });
    strip.appendChild(addBtn);

    // Duplicate button (⧉ Clona)
    const cloneBtn = document.createElement('div');
    cloneBtn.className = 'kf add';
    cloneBtn.innerHTML = '⧉ Clona';
    cloneBtn.title = 'Copia il keyframe selezionato in fondo (D)';
    cloneBtn.addEventListener('click', () => {
      this.mannequinEditor.cloneKey();
    });
    strip.appendChild(cloneBtn);

    const poseVal = document.getElementById('poseVal');
    if (poseVal) poseVal.textContent = 'K' + (this.mannequinEditor.current + 1);

    this.mannequinEditor.updateHistoryUI();
  }

  escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

