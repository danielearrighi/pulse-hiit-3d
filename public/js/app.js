/**
 * Main Client Application Manager with i18n Integration
 */

class App {
  constructor() {
    this.currentUser = null;
    this.exercises = [];
    this.exercisesMap = {};
    this.plans = [];

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

  initLanguageListener() {
    window.addEventListener('languageChanged', () => {
      this.updateAuthUI();
      this.renderDashboard();
      this.renderLibrary();
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
    if (!userSection) return;

    const t = window.t;
    if (this.currentUser) {
      userSection.innerHTML = `
        <span style="font-weight: 600; font-size: 0.9rem; color: var(--accent-cyan);">👤 ${this.escapeHtml(this.currentUser.username)}</span>
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
            <span class="meta-pill">⚡ ${groupsCount} ${t('builder.circuit_groups')}</span>
            <span class="meta-pill">🏃 ${totalExercises} ${t('dashboard.exercises_count')}</span>
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
      const badgeText = ex.is_standard ? t('library.standard_badge') : (ex.is_private ? t('library.private_badge') : t('library.custom_badge'));

      return `
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
            <h4 style="font-size: 1.2rem; font-weight: 700;">${this.escapeHtml(displayName)}</h4>
            <span class="badge badge-${(ex.category || '').toLowerCase().replace(/\s+/g, '')}">${this.escapeHtml(displayCategory)}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            ${badgeText} • ${ex.keyframes ? ex.keyframes.length : 0} Pos
          </div>
          <button class="btn btn-secondary preview-ex-btn" data-exid="${ex.id}" style="width: 100%; font-size: 0.85rem;">
            ${t('library.preview_btn')}
          </button>
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
  }

  showPreviewModal(exercise) {
    const modal = document.getElementById('previewModal');
    const displayName = this.getTranslatedExerciseName(exercise);
    document.getElementById('previewModalTitle').innerText = displayName;
    modal.classList.add('active');

    const canvas = document.getElementById('previewCanvas');
    const mannequin = new Mannequin(canvas);

    if (exercise.keyframes && exercise.keyframes.length > 0) {
      mannequin.setKeyframes(exercise.keyframes);
      mannequin.playAnimation();
    }

    const closeHandler = () => {
      mannequin.stopAnimation();
      modal.classList.remove('active');
      document.getElementById('previewModalCloseBtn').removeEventListener('click', closeHandler);
    };

    document.getElementById('previewModalCloseBtn').addEventListener('click', closeHandler);
  }

  initMannequinEditor() {
    const canvas = document.getElementById('mannequinCanvas');
    if (!canvas) return;

    const t = window.t;

    this.mannequinEditor = new Mannequin(canvas, {
      enableAnchors: true,
      onPoseChange: (updatedPose) => {
        if (this.editorKeyframes[this.activeKeyframeIndex]) {
          this.editorKeyframes[this.activeKeyframeIndex] = { ...updatedPose };
        }
        this.updatePresetButtonsHighlight(updatedPose);
      }
    });

    this.editorKeyframes = [this.mannequinEditor.getDefaultPose()];
    this.activeKeyframeIndex = 0;
    this.renderKeyframeStrip();
    this.updatePresetButtonsHighlight(this.editorKeyframes[0]);

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetType = e.currentTarget.getAttribute('data-preset');
        const presetPose = this.mannequinEditor.getPosePreset(presetType);

        this.mannequinEditor.applyPose(presetPose);

        if (this.editorKeyframes[this.activeKeyframeIndex]) {
          this.editorKeyframes[this.activeKeyframeIndex] = { ...presetPose };
        }

        this.updatePresetButtonsHighlight(presetPose);
      });
    });

    document.getElementById('addKeyframeBtn').addEventListener('click', () => {
      const currentPose = { ...this.mannequinEditor.currentPose };
      this.editorKeyframes.push(currentPose);
      this.activeKeyframeIndex = this.editorKeyframes.length - 1;
      this.renderKeyframeStrip();
      this.updatePresetButtonsHighlight(currentPose);
    });

    document.getElementById('previewAnimBtn').addEventListener('click', () => {
      if (this.mannequinEditor.isAnimating) {
        this.mannequinEditor.stopAnimation();
        document.getElementById('previewAnimBtn').innerText = t('editor.preview_anim');
      } else {
        this.mannequinEditor.setKeyframes(this.editorKeyframes);
        this.mannequinEditor.playAnimation();
        document.getElementById('previewAnimBtn').innerText = '⏸ ' + t('player.pause');
      }
    });

    const resetCamBtn = document.getElementById('resetCameraBtn');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => {
        if (this.mannequinEditor) {
          this.mannequinEditor.resetCamera();
        }
      });
    }

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

      if (this.editorKeyframes.length < 2) {
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
            keyframes: this.editorKeyframes
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save exercise.');

        alert(t('editor.ex_saved'));
        document.getElementById('exNameInput').value = '';
        await this.fetchExercises();
        this.switchTab('library');
      } catch (err) {
        alert(err.message);
      }
    });
  }

  renderKeyframeStrip() {
    const strip = document.getElementById('keyframesStrip');
    if (!strip) return;
    const t = window.t;

    strip.innerHTML = '';
    let draggedIdx = null;

    this.editorKeyframes.forEach((kf, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `keyframe-thumb ${idx === this.activeKeyframeIndex ? 'active' : ''}`;
      thumb.setAttribute('draggable', 'true');
      thumb.setAttribute('data-idx', idx);

      thumb.innerHTML = `
        <span>Pos #${idx + 1}</span>
        <div class="kf-actions-group">
          <button class="kf-action-btn duplicate" title="Duplicate Keyframe" data-idx="${idx}">📋</button>
          ${this.editorKeyframes.length > 1 ? `<button class="kf-action-btn delete" title="Delete Keyframe" data-idx="${idx}">✕</button>` : ''}
        </div>
      `;

      thumb.addEventListener('click', (e) => {
        const dupBtn = e.target.closest('.duplicate');
        const delBtn = e.target.closest('.delete');

        if (dupBtn) {
          e.stopPropagation();
          const targetIdx = parseInt(dupBtn.getAttribute('data-idx'), 10);
          const clonedPose = JSON.parse(JSON.stringify(this.editorKeyframes[targetIdx]));
          this.editorKeyframes.push(clonedPose);
          this.activeKeyframeIndex = this.editorKeyframes.length - 1;
          this.renderKeyframeStrip();
          this.mannequinEditor.applyPose(this.editorKeyframes[this.activeKeyframeIndex]);
          this.updatePresetButtonsHighlight(this.editorKeyframes[this.activeKeyframeIndex]);
          return;
        }

        if (delBtn) {
          e.stopPropagation();
          const targetIdx = parseInt(delBtn.getAttribute('data-idx'), 10);
          this.editorKeyframes.splice(targetIdx, 1);
          if (this.activeKeyframeIndex >= this.editorKeyframes.length) {
            this.activeKeyframeIndex = Math.max(0, this.editorKeyframes.length - 1);
          }
          this.renderKeyframeStrip();
          if (this.editorKeyframes[this.activeKeyframeIndex]) {
            this.mannequinEditor.applyPose(this.editorKeyframes[this.activeKeyframeIndex]);
            this.updatePresetButtonsHighlight(this.editorKeyframes[this.activeKeyframeIndex]);
          }
          return;
        }

        this.activeKeyframeIndex = idx;
        this.renderKeyframeStrip();
        if (this.editorKeyframes[idx]) {
          this.mannequinEditor.applyPose(this.editorKeyframes[idx]);
          this.updatePresetButtonsHighlight(this.editorKeyframes[idx]);
        }
      });

      thumb.addEventListener('dragstart', (e) => {
        draggedIdx = idx;
        thumb.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', idx);
      });

      thumb.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedIdx !== null && draggedIdx !== idx) {
          thumb.classList.add('drag-over');
        }
      });

      thumb.addEventListener('dragleave', () => {
        thumb.classList.remove('drag-over');
      });

      thumb.addEventListener('drop', (e) => {
        e.preventDefault();
        thumb.classList.remove('drag-over');
        if (draggedIdx !== null && draggedIdx !== idx) {
          const [movedKf] = this.editorKeyframes.splice(draggedIdx, 1);
          this.editorKeyframes.splice(idx, 0, movedKf);
          this.activeKeyframeIndex = idx;
          this.renderKeyframeStrip();
          if (this.editorKeyframes[idx]) {
            this.mannequinEditor.applyPose(this.editorKeyframes[idx]);
          }
        }
      });

      thumb.addEventListener('dragend', () => {
        thumb.classList.remove('dragging');
        strip.querySelectorAll('.keyframe-thumb').forEach(el => el.classList.remove('drag-over'));
        draggedIdx = null;
      });

      strip.appendChild(thumb);
    });
  }

  isPoseMatch(p1, p2) {
    if (!p1 || !p2 || !this.mannequinEditor) return false;
    const keys = Object.keys(this.mannequinEditor.baseNodePositions);
    return keys.every(k => {
      const o1 = p1[k] || { x: 0, y: 0, z: 0 };
      const o2 = p2[k] || { x: 0, y: 0, z: 0 };
      return Math.abs((o1.x || 0) - (o2.x || 0)) < 0.02 &&
             Math.abs((o1.y || 0) - (o2.y || 0)) < 0.02 &&
             Math.abs((o1.z || 0) - (o2.z || 0)) < 0.02;
    });
  }

  updatePresetButtonsHighlight(pose) {
    if (!this.mannequinEditor) return;
    const current = pose || (this.editorKeyframes && this.editorKeyframes[this.activeKeyframeIndex]);
    if (!current) return;

    const isStanding = this.isPoseMatch(current, this.mannequinEditor.getStandingPose());
    const isFaceDown = this.isPoseMatch(current, this.mannequinEditor.getLyingFaceDownPose());
    const isFaceUp = this.isPoseMatch(current, this.mannequinEditor.getLyingFaceUpPose());

    document.querySelectorAll('.preset-btn').forEach(btn => {
      const p = btn.getAttribute('data-preset');
      if (p === 'standing') btn.classList.toggle('active', isStanding);
      else if (p === 'face-down') btn.classList.toggle('active', isFaceDown);
      else if (p === 'face-up') btn.classList.toggle('active', isFaceUp);
    });
  }

  escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
