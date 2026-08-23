(function() {
  if (window.dashboard) return;

  class DashboardController {
    constructor() {
      this.plans = [];
      this.currentUser = null;
      this.planToDelete = null;
      this.eventsInitialized = false;
    }

  async init() {
    if (!document.getElementById('plansGrid')) return;

    this.currentUser = await window.API.getMe();
    await this.fetchPlans();

    if (!this.eventsInitialized) {
      this.initEvents();
      this.eventsInitialized = true;

      window.addEventListener('authChanged', async (e) => {
        if (!document.getElementById('plansGrid')) return;
        this.currentUser = e.detail.user;
        await this.fetchPlans();
      });

      window.addEventListener('languageChanged', () => {
        if (!document.getElementById('plansGrid')) return;
        this.render();
      });
    }
  }

  async fetchPlans() {
    this.plans = await window.API.getPlans();
    this.render();
  }

  initEvents() {
    document.addEventListener('click', async (e) => {
      // Start Workout button
      const startBtn = e.target.closest('[data-action="start-workout"]');
      if (startBtn) {
        const planId = startBtn.getAttribute('data-plan-id');
        const targetUrl = `/player?planId=${planId}`;
        if (window.Turbo) {
          window.Turbo.visit(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
      }

      // Share Plan button
      const shareBtn = e.target.closest('[data-action="share-plan"]');
      if (shareBtn) {
        const planId = shareBtn.getAttribute('data-plan-id');
        const shareUrl = `${window.location.origin}/player?planId=${planId}`;
        const t = window.t || (k => k);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
            window.Material3.showSnackbar(t('dashboard.plan_link_copied') || 'Link scheda copiato negli appunti! Condividilo con chi vuoi.');
          } else {
            prompt('Copia il link per condividere la scheda:', shareUrl);
          }
        } catch (err) {
          prompt('Copia il link per condividere la scheda:', shareUrl);
        }
      }

      // Edit Plan button
      const editBtn = e.target.closest('[data-action="edit-plan"]');
      if (editBtn) {
        const planId = editBtn.getAttribute('data-plan-id');
        const targetUrl = `/builder?id=${planId}`;
        if (window.Turbo) {
          window.Turbo.visit(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
      }

      // Delete Plan button
      const deleteBtn = e.target.closest('[data-action="delete-plan"]');
      if (deleteBtn) {
        const planId = deleteBtn.getAttribute('data-plan-id');
        const plan = this.plans.find(p => p.id === planId);
        this.planToDelete = plan;
        this.openDeleteDialog(plan);
      }

      // Confirm Delete in dialog
      if (e.target.closest('#confirmDeletePlanBtn')) {
        if (this.planToDelete) {
          try {
            await window.API.deletePlan(this.planToDelete.id);
            window.Material3.closeDialog('deletePlanDialog');
            window.Material3.showSnackbar('Scheda eliminata con successo');
            await this.fetchPlans();
          } catch (err) {
            window.Material3.showSnackbar(err.message || 'Errore durante l\'eliminazione');
          }
        }
      }

      if (e.target.closest('#cancelDeletePlanBtn')) {
        window.Material3.closeDialog('deletePlanDialog');
      }
    });
  }

  openDeleteDialog(plan) {
    if (!plan) return;
    const descEl = document.getElementById('deletePlanModalDesc');
    if (descEl) {
      descEl.textContent = `Sei sicuro di voler eliminare la scheda "${plan.name}"? L'operazione non è reversibile.`;
    }
    window.Material3.openDialog('deletePlanDialog');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderPlanCard(p, isAssignedContext = false) {
    const t = window.t || (k => k);
    const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele'));
    const isSuperUser = this.currentUser && this.currentUser.role === 'superuser';
    const canManageAll = isAdmin || isSuperUser;

    const groups = (p.structure && p.structure.groups) || [];
    const groupsCount = groups.length;
    let totalExercises = 0;
    let totalRounds = 0;
    let totalSeconds = 0;

    groups.forEach(g => {
      const reps = Math.max(1, parseInt(g.repetitions, 10) || 1);
      totalRounds += reps;
      const items = g.items || [];
      totalExercises += items.length * reps;

      let groupSeconds = 0;
      items.forEach(item => {
        const isReps = item.type === 'reps';
        const rawTarget = item.target !== undefined ? item.target : (item.target_value !== undefined ? item.target_value : (isReps ? 15 : 40));
        const targetVal = Math.max(0, parseInt(rawTarget, 10) || 0);

        // Se l'esercizio è in modalità "ripetizioni" considera 2 secondi a ripetizione
        const exerciseDuration = isReps ? (targetVal * 2) : targetVal;

        const rawRest = item.restAfter !== undefined ? item.restAfter : (item.rest_seconds !== undefined ? item.rest_seconds : (item.rest !== undefined ? item.rest : 20));
        const restDuration = Math.max(0, parseInt(rawRest, 10) || 0);

        groupSeconds += (exerciseDuration + restDuration);
      });

      totalSeconds += groupSeconds * reps;
    });

    const totalMinutes = totalSeconds > 0 ? Math.max(1, Math.round(totalSeconds / 60)) : 0;

    const canEditOrDelete = this.currentUser && (p.user_id === this.currentUser.id || canManageAll);

    let badgeHtml = '';
    if (p.is_assigned) {
      badgeHtml = `<span class="md-badge md-badge-assigned"><span class="material-symbols-rounded" style="font-size: 13px;">assignment_turned_in</span> ${t('dashboard.assigned_badge', { defaultValue: 'Assegnata' })}</span>`;
    } else if (p.is_public) {
      badgeHtml = `<span class="md-badge md-badge-public"><span class="material-symbols-rounded" style="font-size: 13px;">public</span> ${t('dashboard.public_badge', { defaultValue: 'Pubblica' })}</span>`;
    } else {
      badgeHtml = `<span class="md-badge md-badge-private"><span class="material-symbols-rounded" style="font-size: 13px;">lock</span> ${t('dashboard.private_badge', { defaultValue: 'Personale' })}</span>`;
    }

    let authorHtml = '';
    if (p.is_assigned && p.author_name) {
      authorHtml = `
        <div style="font-size: 0.76rem; color: var(--md-sys-color-on-surface-variant); display: flex; align-items: center; gap: 4px;">
          <span class="material-symbols-rounded" style="font-size: 14px; color: #81c784;">assignment_ind</span>
          <span>${t('dashboard.assigned_by', { defaultValue: 'Assegnata da' })} <strong>${this.escapeHtml(p.author_name)}</strong></span>
        </div>
      `;
    } else if (p.author_name) {
      authorHtml = `
        <div style="font-size: 0.76rem; color: var(--md-sys-color-on-surface-variant); display: flex; align-items: center; gap: 4px;">
          <span class="material-symbols-rounded" style="font-size: 14px;">person</span>
          <span>${this.escapeHtml(p.author_name)}</span>
        </div>
      `;
    }

    return `
      <div class="plan-card md-ripple-surface">
        <div>
          <div class="plan-card__header">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <h3 class="plan-card__title">${this.escapeHtml(p.name)}</h3>
              ${authorHtml}
            </div>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${badgeHtml}
              <span class="md-badge md-badge-tertiary">HIIT</span>
            </div>
          </div>
          ${p.description ? `<p class="plan-card__desc">${this.escapeHtml(p.description)}</p>` : '<p class="plan-card__desc" style="opacity: 0.5; font-style: italic;">Nessuna descrizione</p>'}
          
          <div class="plan-card__stats">
            <span class="md-chip">
              <span class="material-symbols-rounded" style="font-size: 16px;">schedule</span>
              ~${totalMinutes} min
            </span>
            <span class="md-chip">
              <span class="material-symbols-rounded" style="font-size: 16px;">repeat</span>
              ${groupsCount} circuiti (${totalRounds} ${t('dashboard.rounds', { defaultValue: 'giri' })})
            </span>
            <span class="md-chip">
              <span class="material-symbols-rounded" style="font-size: 16px;">bolt</span>
              ${totalExercises} ${t('dashboard.exercises_count', { defaultValue: 'esercizi' })}
            </span>
          </div>
        </div>

        <div class="plan-card__footer">
          <button class="md-btn md-btn-filled" data-action="start-workout" data-plan-id="${p.id}">
            <span class="material-symbols-rounded filled" style="font-size: 18px;">play_arrow</span>
            <span data-i18n="dashboard.start_workout">${t('dashboard.start_workout')}</span>
          </button>
          <div style="display: flex; gap: 0.25rem;">
            <button class="md-btn-icon" data-action="share-plan" data-plan-id="${p.id}" title="${t('dashboard.share_plan', { defaultValue: 'Condividi Scheda' })}" aria-label="Condividi">
              <span class="material-symbols-rounded">share</span>
            </button>
            ${canEditOrDelete ? `
              <button class="md-btn-icon" data-action="edit-plan" data-plan-id="${p.id}" title="Modifica Scheda" aria-label="Modifica">
                <span class="material-symbols-rounded">edit</span>
              </button>
              <button class="md-btn-icon md-btn-danger" data-action="delete-plan" data-plan-id="${p.id}" title="${t('dashboard.delete_plan')}" aria-label="Elimina">
                <span class="material-symbols-rounded">delete</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const container = document.getElementById('plansGrid');
    if (!container) return;

    const t = window.t || (k => k);

    if (!this.currentUser && this.plans.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1/-1;">
          <span class="material-symbols-rounded" style="font-size: 3rem; color: var(--md-sys-color-primary); margin-bottom: 0.75rem;">lock</span>
          <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;" data-i18n="dashboard.empty_plans">${t('dashboard.empty_plans')}</h3>
          <p style="color: var(--md-sys-color-on-surface-variant); max-width: 480px; margin: 0 auto 1.5rem auto;" data-i18n="dashboard.subtitle">${t('dashboard.subtitle')}</p>
          <button class="md-btn md-btn-filled" id="openAuthBtnHero">
            <span class="material-symbols-rounded">login</span>
            <span data-i18n="app.auth.login_register">${t('app.auth.login_register')}</span>
          </button>
        </div>
      `;

      document.getElementById('openAuthBtnHero')?.addEventListener('click', () => {
        window.Material3.openDialog('authSheetBackdrop');
      });
      return;
    }

    if (this.currentUser && this.plans.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1/-1;">
          <span class="material-symbols-rounded" style="font-size: 3rem; color: var(--md-sys-color-primary); margin-bottom: 0.75rem;">fitness_center</span>
          <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;" data-i18n="dashboard.empty_plans">${t('dashboard.empty_plans')}</h3>
          <p style="color: var(--md-sys-color-on-surface-variant); max-width: 480px; margin: 0 auto 1.5rem auto;" data-i18n="dashboard.subtitle">${t('dashboard.subtitle')}</p>
          <a href="/builder" class="md-btn md-btn-filled">
            <span class="material-symbols-rounded">add</span>
            <span data-i18n="dashboard.build_plan_btn">${t('dashboard.build_plan_btn')}</span>
          </a>
        </div>
      `;
      return;
    }

    // Separate plans for authenticated users
    if (this.currentUser) {
      const myAssignedPlans = this.plans.filter(p => p.is_assigned || (!p.is_public && p.user_id === this.currentUser.id));
      const publicPlans = this.plans.filter(p => p.is_public);

      let html = '';

      // Section 1: "Le tue schede" (Assigned or personal plans) - SOPRA le schede pubbliche
      if (myAssignedPlans.length > 0) {
        html += `
          <div class="dashboard-section" id="myPlansSection" style="grid-column: 1/-1; width: 100%;">
            <div class="dashboard-section__header">
              <div class="dashboard-section__title-wrap">
                <div class="dashboard-section__icon-wrap">
                  <span class="material-symbols-rounded">assignment_ind</span>
                </div>
                <div>
                  <h2 class="dashboard-section__title" data-i18n="dashboard.my_plans_title">${t('dashboard.my_plans_title', { defaultValue: 'Le tue schede' })}</h2>
                  <p class="dashboard-section__subtitle" data-i18n="dashboard.my_plans_subtitle">${t('dashboard.my_plans_subtitle', { defaultValue: 'Schede HIIT assegnate o create per te' })}</p>
                </div>
              </div>
              <span class="md-badge md-badge-primary" style="font-size: 0.8rem; padding: 2px 8px;">${myAssignedPlans.length}</span>
            </div>
            <div class="plans-grid">
              ${myAssignedPlans.map(p => this.renderPlanCard(p, true)).join('')}
            </div>
          </div>
        `;
      }

      // Section 2: "Schede pubbliche"
      html += `
        <div class="dashboard-section" id="publicPlansSection" style="grid-column: 1/-1; width: 100%;">
          <div class="dashboard-section__header">
            <div class="dashboard-section__title-wrap">
              <div class="dashboard-section__icon-wrap">
                <span class="material-symbols-rounded">public</span>
              </div>
              <div>
                <h2 class="dashboard-section__title" data-i18n="dashboard.public_plans_title">${t('dashboard.public_plans_title', { defaultValue: 'Schede pubbliche' })}</h2>
                <p class="dashboard-section__subtitle" data-i18n="dashboard.public_plans_subtitle">${t('dashboard.public_plans_subtitle', { defaultValue: 'Allenamenti HIIT della community disponibili per tutti' })}</p>
              </div>
            </div>
            <span class="md-badge md-badge-tertiary" style="font-size: 0.8rem; padding: 2px 8px;">${publicPlans.length}</span>
          </div>
          <div class="plans-grid">
            ${publicPlans.length > 0 ? publicPlans.map(p => this.renderPlanCard(p, false)).join('') : `
              <div class="empty-state-card" style="grid-column: 1/-1;">
                <span class="material-symbols-rounded" style="font-size: 2.5rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 0.5rem;">public_off</span>
                <p style="color: var(--md-sys-color-on-surface-variant); font-size: 0.95rem;" data-i18n="dashboard.no_public_plans">${t('dashboard.no_public_plans', { defaultValue: 'Nessuna scheda pubblica disponibile al momento.' })}</p>
              </div>
            `}
          </div>
        </div>
      `;

      container.innerHTML = html;
      return;
    }

    // Unauthenticated visitors: render public plans directly
    container.innerHTML = `
      <div class="dashboard-section" id="publicPlansSection" style="grid-column: 1/-1; width: 100%;">
        <div class="dashboard-section__header">
          <div class="dashboard-section__title-wrap">
            <div class="dashboard-section__icon-wrap">
              <span class="material-symbols-rounded">public</span>
            </div>
            <div>
              <h2 class="dashboard-section__title" data-i18n="dashboard.public_plans_title">${t('dashboard.public_plans_title', { defaultValue: 'Schede pubbliche' })}</h2>
              <p class="dashboard-section__subtitle" data-i18n="dashboard.public_plans_subtitle">${t('dashboard.public_plans_subtitle', { defaultValue: 'Allenamenti HIIT della community disponibili per tutti' })}</p>
            </div>
          </div>
          <span class="md-badge md-badge-tertiary" style="font-size: 0.8rem; padding: 2px 8px;">${this.plans.length}</span>
        </div>
        <div class="plans-grid">
          ${this.plans.map(p => this.renderPlanCard(p, false)).join('')}
        </div>
      </div>
    `;
  }
}

  window.dashboard = new DashboardController();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.dashboard.init();
    });
  } else {
    window.dashboard.init();
  }
  document.addEventListener('turbo:load', () => {
    window.dashboard.init();
  });
})();
