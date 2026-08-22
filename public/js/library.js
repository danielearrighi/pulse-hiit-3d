(function() {
  if (window.library) return;

  class LibraryController {
    constructor() {
      this.exercises = [];
      this.plans = [];
      this.currentCategory = 'All';
      this.currentUser = null;
      this.previewMannequin = null;
      this.exerciseToDelete = null;
      this.eventsInitialized = false;
    }

  async init() {
    if (!document.getElementById('exercisesGrid')) return;

    this.currentUser = await window.API.getMe();
    await this.fetchData();

    if (!this.eventsInitialized) {
      this.initEvents();
      this.eventsInitialized = true;

      window.addEventListener('languageChanged', () => {
        if (!document.getElementById('exercisesGrid')) return;
        this.render();
      });

      window.addEventListener('authChanged', async (e) => {
        if (!document.getElementById('exercisesGrid')) return;
        this.currentUser = e.detail.user;
        await this.fetchData();
      });

      document.addEventListener('turbo:before-cache', () => {
        if (this.previewMannequin) {
          this.previewMannequin.destroy();
          this.previewMannequin = null;
        }
      });
    }
  }

  async fetchData() {
    this.exercises = await window.API.getExercises();
    if (this.currentUser) {
      this.plans = await window.API.getPlans();
    }
    this.render();
  }

  initEvents() {
    // Preview, Delete & Filter actions
    document.addEventListener('click', async (e) => {
      // Filter Chips
      const chip = e.target.closest('.filter-chips-bar .md-chip');
      if (chip) {
        document.querySelectorAll('.filter-chips-bar .md-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentCategory = chip.getAttribute('data-category') || 'All';
        this.render();
        return;
      }
      const previewBtn = e.target.closest('[data-action="preview-exercise"]');
      if (previewBtn) {
        const exId = previewBtn.getAttribute('data-exercise-id');
        const ex = this.exercises.find(item => item.id === exId);
        if (ex) this.openPreviewModal(ex);
      }

      const deleteBtn = e.target.closest('[data-action="delete-exercise"]');
      if (deleteBtn) {
        const exId = deleteBtn.getAttribute('data-exercise-id');
        const ex = this.exercises.find(item => item.id === exId);
        if (ex) this.confirmDeleteExercise(ex);
      }

      if (e.target.closest('#previewModalCloseBtn') || e.target.closest('#previewModalDismissBtn')) {
        this.closePreviewModal();
      }

      if (e.target.closest('#confirmDeleteExBtn')) {
        if (this.exerciseToDelete) {
          try {
            await window.API.deleteExercise(this.exerciseToDelete.id);
            window.Material3.closeDialog('deleteExerciseDialog');
            window.Material3.showSnackbar('Esercizio eliminato con successo!');
            await this.fetchData();
          } catch (err) {
            window.Material3.showSnackbar(err.message || 'Impossibile eliminare l\'esercizio.');
          }
        }
      }

      if (e.target.closest('#cancelDeleteExBtn')) {
        window.Material3.closeDialog('deleteExerciseDialog');
      }
    });
  }

  openPreviewModal(exercise) {
    const titleEl = document.getElementById('previewModalTitle');
    const localizedName = exercise.is_standard
      ? ((window.t && window.t(`exercises.${exercise.name}`, { defaultValue: exercise.name })) || exercise.name)
      : exercise.name;
    const t = window.t || (k => k);
    if (titleEl) {
      const privateTagHtml = exercise.is_private ? `
        <span class="badge-private" style="font-size: 0.7rem; padding: 2px 7px; margin-left: 8px; vertical-align: middle;">
          <span class="material-symbols-rounded" style="font-size: 14px;">visibility_off</span>
          ${t('library.private_badge', { defaultValue: 'Privato' })}
        </span>
      ` : '';
      titleEl.innerHTML = `${localizedName} ${privateTagHtml}`;
    }

    const notesBox = document.getElementById('previewModalNotes');
    const notesText = document.getElementById('previewModalNotesText');
    if (notesBox && notesText) {
      if (exercise.notes && exercise.notes.trim()) {
        notesText.textContent = exercise.notes.trim();
        notesBox.style.display = 'block';
      } else {
        notesBox.style.display = 'none';
      }
    }

    window.Material3.openDialog('previewModalDialog');

    const editBtn = document.getElementById('previewModalEditBtn');
    if (editBtn) {
      const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele'));
      const isSuperUser = this.currentUser && this.currentUser.role === 'superuser';
      const isOwner = this.currentUser && exercise.user_id === this.currentUser.id;
      const canEdit = isAdmin || isSuperUser || isOwner;

      if (canEdit) {
        editBtn.href = `/editor?id=${exercise.id}`;
        editBtn.style.display = 'inline-flex';
      } else {
        editBtn.style.display = 'none';
      }
    }

    const canvas = document.getElementById('previewCanvas');
    if (!canvas) return;

    if (this.previewMannequin) {
      this.previewMannequin.destroy();
      this.previewMannequin = null;
    }

    this.previewMannequin = new Mannequin(canvas, {
      enableAnchors: false,
      isEditor: false
    });

    if (exercise.keyframes && exercise.keyframes.length > 0) {
      this.previewMannequin.setKeyframes(exercise.keyframes, 0.8);
      this.previewMannequin.play();
    } else {
      this.previewMannequin.loadPreset('squat');
      this.previewMannequin.play();
    }

    setTimeout(() => {
      if (this.previewMannequin) {
        this.previewMannequin.resize();
        this.previewMannequin.resetView();
      }
    }, 150);
  }

  closePreviewModal() {
    if (this.previewMannequin) {
      this.previewMannequin.stop();
    }
    window.Material3.closeDialog('previewModalDialog');
  }

  confirmDeleteExercise(exercise) {
    this.exerciseToDelete = exercise;

    const affectedPlans = this.plans.filter(p => {
      const groups = p.structure.groups || [];
      return groups.some(g => (g.items || []).some(i => i.exerciseId === exercise.id || i.exercise_id === exercise.id));
    });

    const descEl = document.getElementById('deleteExModalDesc');
    if (descEl) {
      if (affectedPlans.length > 0) {
        const planNames = affectedPlans.map(p => `• ${p.name}`).join('\n');
        descEl.innerHTML = `
          <strong style="color: var(--md-sys-color-error);">Attenzione!</strong> L'esercizio "<strong>${exercise.name}</strong>" è utilizzato nelle seguenti schede:<br><br>
          <pre style="background: var(--md-sys-color-surface-container); padding: 0.75rem; border-radius: 12px; font-family: inherit; font-size: 0.85rem;">${planNames}</pre><br>
          Se procedi, l'esercizio verrà rimosso anche da queste schede. Vuoi continuare?
        `;
      } else {
        descEl.textContent = `Sei sicuro di voler eliminare l'esercizio "${exercise.name}"?`;
      }
    }

    window.Material3.openDialog('deleteExerciseDialog');
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
    const container = document.getElementById('exercisesGrid');
    if (!container) return;

    const t = window.t || (k => k);

    const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele'));
    const isSuperUser = this.currentUser && this.currentUser.role === 'superuser';

    const createBtn = document.getElementById('libraryCreateExBtn');
    if (createBtn) {
      createBtn.style.display = 'inline-flex';
    }

    const filtered = this.exercises.filter(ex => {
      if (this.currentCategory === 'All') return true;
      return ex.category === this.currentCategory;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1.5rem; color: var(--md-sys-color-on-surface-variant);">
          <span class="material-symbols-rounded" style="font-size: 3.5rem; margin-bottom: 0.75rem; color: var(--md-sys-color-outline);">search_off</span>
          <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 0.5rem;" data-i18n="library.no_exercises">${t('library.no_exercises')}</h3>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(ex => {
      const localizedName = ex.is_standard
        ? ((window.t && window.t(`exercises.${ex.name}`, { defaultValue: ex.name })) || ex.name)
        : ex.name;
      const localizedCategory = (window.t && window.t(`categories.${ex.category}`, { defaultValue: ex.category || 'Full Body' })) || ex.category || 'Full Body';
      const isOwner = this.currentUser && ex.user_id === this.currentUser.id;
      const canManage = isAdmin || isSuperUser || isOwner;

      return `
        <div class="exercise-card md-ripple-surface">
          <div>
            <div class="exercise-card__top">
              <h3 class="exercise-card__title">${localizedName}</h3>
              ${ex.is_private ? `
                <span class="badge-private" title="${t('library.private_badge', { defaultValue: 'Privato' })}">
                  <span class="material-symbols-rounded" style="font-size: 15px;">visibility_off</span>
                  ${t('library.private_badge', { defaultValue: 'Privato' })}
                </span>
              ` : ''}
            </div>

            <div class="exercise-card__badges">
              <span class="md-chip" style="height: 28px; font-size: 0.78rem; padding: 0 0.75rem;">
                <span class="material-symbols-rounded" style="font-size: 15px;">fitness_center</span>
                ${localizedCategory}
              </span>
            </div>

            ${ex.notes && ex.notes.trim() ? `
              <div class="exercise-card__note" title="${this.escapeHtml(ex.notes)}">
                <span class="material-symbols-rounded" style="font-size: 16px; color: var(--md-sys-color-primary); flex-shrink: 0; margin-top: 1px;">sticky_note_2</span>
                <span class="exercise-card__note-text">${this.escapeHtml(ex.notes)}</span>
              </div>
            ` : ''}
          </div>

          <div class="exercise-card__footer">
            <button type="button" class="md-btn md-btn-filled" data-action="preview-exercise" data-exercise-id="${ex.id}" style="height: 38px; padding: 0 1rem; font-size: 0.85rem;">
              <span class="material-symbols-rounded filled" style="font-size: 18px;">play_arrow</span>
              <span data-i18n="library.preview_btn">${t('library.preview_btn')}</span>
            </button>

            <div style="display: flex; gap: 0.25rem; align-items: center;">
              ${canManage ? `
                <a href="/editor?id=${ex.id}" class="md-btn-icon" title="${t('library.edit_btn', { defaultValue: 'Modifica Esercizio' })}" aria-label="Modifica" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none; color: var(--md-sys-color-primary);">
                  <span class="material-symbols-rounded">edit</span>
                </a>
              ` : ''}

              ${canManage ? `
                <button type="button" class="md-btn-icon md-btn-danger" data-action="delete-exercise" data-exercise-id="${ex.id}" title="${t('library.delete_btn')}" aria-label="Elimina">
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

  window.library = new LibraryController();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.library.init();
    });
  } else {
    window.library.init();
  }
  document.addEventListener('turbo:load', () => {
    window.library.init();
  });
})();
