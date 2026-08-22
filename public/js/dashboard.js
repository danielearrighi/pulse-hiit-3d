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

  render() {
    const container = document.getElementById('plansGrid');
    if (!container) return;

    const t = window.t || (k => k);
    const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele'));
    const isSuperUser = this.currentUser && this.currentUser.role === 'superuser';
    const canManageAll = isAdmin || isSuperUser;

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

    container.innerHTML = this.plans.map(p => {
      const groups = p.structure.groups || [];
      const groupsCount = groups.length;
      let totalExercises = 0;
      let totalRounds = 0;
      groups.forEach(g => {
        const reps = g.repetitions || 1;
        totalRounds += reps;
        totalExercises += (g.items || []).length * reps;
      });

      const canEditOrDelete = this.currentUser && (p.user_id === this.currentUser.id || canManageAll);

      const publicBadgeHtml = p.is_public
        ? `<span class="md-badge md-badge-public"><span class="material-symbols-rounded" style="font-size: 13px;">public</span> ${t('dashboard.public_badge', { defaultValue: 'Pubblica' })}</span>`
        : `<span class="md-badge md-badge-private"><span class="material-symbols-rounded" style="font-size: 13px;">lock</span> ${t('dashboard.private_badge', { defaultValue: 'Personale' })}</span>`;

      return `
        <div class="plan-card md-ripple-surface">
          <div>
            <div class="plan-card__header">
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <h3 class="plan-card__title">${this.escapeHtml(p.name)}</h3>
                ${p.author_name ? `
                  <div style="font-size: 0.76rem; color: var(--md-sys-color-on-surface-variant); display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-rounded" style="font-size: 14px;">person</span>
                    <span>${this.escapeHtml(p.author_name)}</span>
                  </div>
                ` : ''}
              </div>
              <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                ${publicBadgeHtml}
                <span class="md-badge md-badge-tertiary">HIIT</span>
              </div>
            </div>
            ${p.description ? `<p class="plan-card__desc">${this.escapeHtml(p.description)}</p>` : '<p class="plan-card__desc" style="opacity: 0.5; font-style: italic;">Nessuna descrizione</p>'}
            
            <div class="plan-card__stats">
              <span class="md-chip">
                <span class="material-symbols-rounded" style="font-size: 16px;">repeat</span>
                ${groupsCount} circuiti (${totalRounds} ${t('dashboard.rounds')})
              </span>
              <span class="md-chip">
                <span class="material-symbols-rounded" style="font-size: 16px;">bolt</span>
                ${totalExercises} ${t('dashboard.exercises_count')}
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
    }).join('');
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
