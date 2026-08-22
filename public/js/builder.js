/**
 * Plan Builder Page Controller (Material 3 UI)
 */

class BuilderController {
  constructor() {
    this.planId = new URLSearchParams(window.location.search).get('id');
    this.groups = [];
    this.availableExercises = [];
    this.currentUser = null;
  }

  async init() {
    this.currentUser = await window.API.getMe();
    this.availableExercises = await window.API.getExercises();
    this.updatePublicToggleVisibility();

    if (this.planId) {
      await this.loadExistingPlan(this.planId);
    } else {
      this.resetToDefault();
    }

    this.initEvents();

    window.addEventListener('languageChanged', () => {
      this.render();
    });

    window.addEventListener('authChanged', (e) => {
      this.currentUser = e.detail.user;
      this.updatePublicToggleVisibility();
    });
  }

  updatePublicToggleVisibility() {
    const isPublicGroup = document.getElementById('isPublicGroup');
    if (!isPublicGroup) return;
    const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele'));
    const isSuperUser = this.currentUser && this.currentUser.role === 'superuser';
    const canMakePublic = isAdmin || isSuperUser;
    isPublicGroup.style.display = canMakePublic ? 'block' : 'none';
  }

  resetToDefault() {
    this.groups = [];
    const isPublicInput = document.getElementById('planIsPublicInput');
    if (isPublicInput) isPublicInput.checked = false;
    this.addGroup();
  }

  async loadExistingPlan(id) {
    try {
      const plan = await window.API.getPlanById(id);
      if (plan) {
        document.getElementById('planNameInput').value = plan.name || '';
        document.getElementById('planDescInput').value = plan.description || '';
        const isPublicInput = document.getElementById('planIsPublicInput');
        if (isPublicInput) isPublicInput.checked = Boolean(plan.is_public);
        this.groups = plan.structure.groups || [];
        this.render();
        if (window.Material3) {
          window.Material3.initInputFloatingLabels();
        }
      }
    } catch (err) {
      window.Material3.showSnackbar('Impossibile caricare la scheda da modificare');
      this.resetToDefault();
    }
  }

  addGroup() {
    const groupNum = this.groups.length + 1;
    const t = window.t || (k => k);
    const group = {
      id: 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: t('builder.circuit_title', { num: groupNum }),
      repetitions: 1,
      items: []
    };

    if (this.availableExercises.length > 0) {
      const defaultEx = this.availableExercises[0];
      group.items.push({
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        exercise_id: defaultEx.id,
        exerciseId: defaultEx.id,
        name: defaultEx.name,
        category: defaultEx.category || 'Full Body',
        type: 'duration',
        target_value: 40,
        target: 40,
        rest_seconds: 20,
        restAfter: 20
      });
    }

    this.groups.push(group);
    this.render();
  }

  removeGroup(groupId) {
    this.groups = this.groups.filter(g => g.id !== groupId);
    this.render();
  }

  addExerciseToGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;

    if (this.availableExercises.length === 0) {
      window.Material3.showSnackbar('Nessun esercizio disponibile.');
      return;
    }

    const defaultEx = this.availableExercises[0];
    group.items.push({
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      exercise_id: defaultEx.id,
      exerciseId: defaultEx.id,
      name: defaultEx.name,
      category: defaultEx.category || 'Full Body',
      type: 'duration',
      target_value: 40,
      target: 40,
      rest_seconds: 20,
      restAfter: 20
    });

    this.render();
  }

  removeExerciseFromGroup(groupId, itemId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    group.items = group.items.filter(item => item.id !== itemId);
    this.render();
  }

  initEvents() {
    document.getElementById('addGroupBtn')?.addEventListener('click', () => {
      this.addGroup();
    });

    document.getElementById('savePlanBtn')?.addEventListener('click', () => {
      this.savePlan();
    });

    const container = document.getElementById('groupsContainer');
    if (!container) return;

    container.addEventListener('change', (e) => {
      const target = e.target;
      const groupId = target.getAttribute('data-group-id');
      const itemId = target.getAttribute('data-item-id');

      if (!groupId) return;
      const group = this.groups.find(g => g.id === groupId);
      if (!group) return;

      if (target.classList.contains('group-title-input')) {
        group.title = target.value;
      }
      if (target.classList.contains('group-reps-input')) {
        group.repetitions = Math.max(1, parseInt(target.value) || 1);
      }

      if (itemId) {
        const item = group.items.find(i => i.id === itemId);
        if (!item) return;

        if (target.classList.contains('item-exercise-select')) {
          const selectedEx = this.availableExercises.find(ex => ex.id === target.value);
          if (selectedEx) {
            item.exercise_id = selectedEx.id;
            item.exerciseId = selectedEx.id;
            item.name = selectedEx.name;
            item.category = selectedEx.category;
            this.render();
          }
        }

        if (target.classList.contains('item-type-select')) {
          item.type = target.value;
          const defaultTarget = item.type === 'reps' ? 15 : 40;
          item.target = defaultTarget;
          item.target_value = defaultTarget;
          this.render();
        }

        if (target.classList.contains('item-target-input')) {
          const val = Math.max(1, parseInt(target.value) || 1);
          item.target = val;
          item.target_value = val;
        }

        if (target.classList.contains('item-rest-input')) {
          const val = Math.max(0, parseInt(target.value) || 0);
          item.restAfter = val;
          item.rest_seconds = val;
        }
      }
    });

    container.addEventListener('click', (e) => {
      const addExBtn = e.target.closest('[data-action="add-exercise"]');
      if (addExBtn) {
        const groupId = addExBtn.getAttribute('data-group-id');
        this.addExerciseToGroup(groupId);
      }

      const removeGroupBtn = e.target.closest('[data-action="remove-group"]');
      if (removeGroupBtn) {
        const groupId = removeGroupBtn.getAttribute('data-group-id');
        this.removeGroup(groupId);
      }

      const removeItemBtn = e.target.closest('[data-action="remove-item"]');
      if (removeItemBtn) {
        const groupId = removeItemBtn.getAttribute('data-group-id');
        const itemId = removeItemBtn.getAttribute('data-item-id');
        this.removeExerciseFromGroup(groupId, itemId);
      }
    });
  }

  async savePlan() {
    if (!this.currentUser) {
      window.Material3.showSnackbar('Accedi prima di salvare la scheda HIIT');
      window.Material3.openDialog('authSheetBackdrop');
      return;
    }

    const name = document.getElementById('planNameInput').value.trim();
    const description = document.getElementById('planDescInput').value.trim();
    const t = window.t || (k => k);

    if (!name) {
      window.Material3.showSnackbar(t('builder.enter_name_alert') || 'Inserisci un nome per la scheda.');
      document.getElementById('planNameInput').focus();
      return;
    }

    let totalItems = 0;
    this.groups.forEach(g => {
      totalItems += (g.items || []).length;
    });

    if (totalItems === 0) {
      window.Material3.showSnackbar(t('builder.add_exercise_alert') || 'Aggiungi almeno un esercizio alla scheda.');
      return;
    }

    const isPublicInput = document.getElementById('planIsPublicInput');
    const isPublic = isPublicInput ? isPublicInput.checked : false;

    const payload = {
      name,
      description,
      is_public: isPublic,
      groups: this.groups
    };

    try {
      if (this.planId) {
        await window.API.updatePlan(this.planId, payload);
        window.Material3.showSnackbar('Scheda HIIT aggiornata con successo!');
      } else {
        await window.API.createPlan(payload);
        window.Material3.showSnackbar(t('builder.plan_saved') || 'Scheda HIIT salvata con successo!');
      }

      setTimeout(() => {
        window.location.href = '/';
      }, 900);
    } catch (err) {
      window.Material3.showSnackbar(err.message || 'Errore durante il salvataggio.');
    }
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
    const container = document.getElementById('groupsContainer');
    if (!container) return;
    const t = window.t || (k => k);

    if (this.groups.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--md-sys-color-on-surface-variant);">
          <p data-i18n="builder.no_groups">${t('builder.no_groups')}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.groups.map((group, gIdx) => {
      const itemsHtml = (group.items || []).map((item) => {
        const selectedEx = this.availableExercises.find(ex => ex.id === item.exerciseId || ex.id === item.exercise_id);
        const exOptions = this.availableExercises.map(ex => {
          const isSelected = (ex.id === item.exerciseId || ex.id === item.exercise_id) ? 'selected' : '';
          const localizedName = ex.is_standard
            ? ((window.t && window.t(`exercises.${ex.name}`, { defaultValue: ex.name })) || ex.name)
            : ex.name;
          const localizedCategory = (window.t && window.t(`categories.${ex.category}`, { defaultValue: ex.category || 'Full Body' })) || ex.category || 'Full Body';
          return `<option value="${ex.id}" ${isSelected}>${localizedName} (${localizedCategory})</option>`;
        }).join('');

        return `
          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <div class="exercise-item-row">
              <!-- Exercise Select -->
              <div>
                <label style="display: block; font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 2px;">Esercizio</label>
                <select class="md-select item-exercise-select" data-group-id="${group.id}" data-item-id="${item.id}" style="height: 44px; padding: 0.4rem 1.8rem 0.4rem 0.6rem; font-size: 0.88rem;">
                  ${exOptions}
                </select>
              </div>

              <!-- Target Type -->
              <div>
                <label style="display: block; font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 2px;">Tipo Target</label>
                <select class="md-select item-type-select" data-group-id="${group.id}" data-item-id="${item.id}" style="height: 44px; padding: 0.4rem 1.8rem 0.4rem 0.6rem; font-size: 0.88rem;">
                  <option value="duration" ${item.type === 'duration' ? 'selected' : ''} data-i18n="builder.type_duration">Durata Timer (s)</option>
                  <option value="reps" ${item.type === 'reps' ? 'selected' : ''} data-i18n="builder.type_reps">Ripetizioni Target</option>
                </select>
              </div>

              <!-- Value Target -->
              <div>
                <label style="display: block; font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 2px;">${item.type === 'duration' ? 'Secondi' : 'Ripetizioni'}</label>
                <input type="number" class="md-input item-target-input" data-group-id="${group.id}" data-item-id="${item.id}" value="${item.target !== undefined ? item.target : (item.target_value || 40)}" min="1" max="600" style="height: 44px; padding: 0.4rem 0.6rem; font-size: 0.9rem;">
              </div>

              <!-- Rest Time -->
              <div>
                <label style="display: block; font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 2px;" data-i18n="builder.rest_label">Recupero (s)</label>
                <input type="number" class="md-input item-rest-input" data-group-id="${group.id}" data-item-id="${item.id}" value="${item.restAfter !== undefined ? item.restAfter : (item.rest_seconds !== undefined ? item.rest_seconds : 20)}" min="0" max="300" style="height: 44px; padding: 0.4rem 0.6rem; font-size: 0.9rem;">
              </div>

              <!-- Remove Button -->
              <div class="exercise-item-row__remove">
                <button type="button" class="md-btn-icon md-btn-danger" data-action="remove-item" data-group-id="${group.id}" data-item-id="${item.id}" title="Rimuovi Esercizio" aria-label="Rimuovi">
                  <span class="material-symbols-rounded">delete</span>
                </button>
              </div>
            </div>

            ${selectedEx && selectedEx.notes && selectedEx.notes.trim() ? `
              <div class="exercise-item-note" title="${this.escapeHtml(selectedEx.notes)}">
                <span class="material-symbols-rounded" style="font-size: 14px; color: var(--md-sys-color-primary); flex-shrink: 0;">sticky_note_2</span>
                <span style="font-size: 0.78rem; color: var(--md-sys-color-on-surface-variant);">${this.escapeHtml(selectedEx.notes)}</span>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      return `
        <div class="circuit-group">
          <div class="circuit-group__header">
            <div class="circuit-group__title-row">
              <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary);">repeat</span>
              <input type="text" class="md-input group-title-input" data-group-id="${group.id}" value="${group.title || `Circuito ${gIdx + 1}`}" style="height: 40px; font-weight: 700; width: 220px; padding: 0.2rem 0.6rem;">
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <label style="font-size: 0.85rem; color: var(--md-sys-color-on-surface-variant);" data-i18n="builder.rounds_label">Giri:</label>
                <input type="number" class="md-input group-reps-input" data-group-id="${group.id}" value="${group.repetitions || 1}" min="1" max="20" style="height: 38px; width: 70px; text-align: center; padding: 0.2rem 0.4rem;">
              </div>

              <button type="button" class="md-btn md-btn-text" style="color: var(--md-sys-color-error);" data-action="remove-group" data-group-id="${group.id}">
                <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                <span data-i18n="builder.remove_group">Elimina Circuito</span>
              </button>
            </div>
          </div>

          <div class="circuit-group__items">
            ${itemsHtml || '<p style="color: var(--md-sys-color-on-surface-variant); font-size: 0.85rem; font-style: italic; padding: 0.5rem 0;">Nessun esercizio in questo circuito.</p>'}
          </div>

          <button type="button" class="md-btn md-btn-tonal" data-action="add-exercise" data-group-id="${group.id}" style="width: 100%;">
            <span class="material-symbols-rounded">add</span>
            <span data-i18n="builder.add_exercise">Aggiungi Esercizio</span>
          </button>
        </div>
      `;
    }).join('');
  }
}

const builder = new BuilderController();
document.addEventListener('DOMContentLoaded', () => {
  builder.init();
});
