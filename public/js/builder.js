(function() {
  if (window.builder) return;

  class BuilderController {
    constructor() {
      this.planId = null;
      this.groups = [];
      this.availableExercises = [];
      this.currentUser = null;
      this.eventsInitialized = false;
      this.activePickerTarget = null; // { groupId, itemId }
      this.pickerSearchQuery = '';
      this.pickerCategory = 'All';
      this.thumbnailCache = new Map();
      this._thumbCanvas = null;
      this._thumbMannequin = null;
    }

  async init() {
    if (!document.getElementById('groupsContainer')) return;

    this.planId = new URLSearchParams(window.location.search).get('id');
    this.currentUser = await window.API.getMe();
    this.availableExercises = await window.API.getExercises();
    this.preloadThumbnails();
    this.updatePublicToggleVisibility();

    if (this.planId) {
      await this.loadExistingPlan(this.planId);
    } else {
      this.resetToDefault();
    }

    if (!this.eventsInitialized) {
      this.initEvents();
      this.eventsInitialized = true;

      window.addEventListener('languageChanged', () => {
        if (!document.getElementById('groupsContainer')) return;
        this.render();
        if (this.activePickerTarget) {
          this.renderExercisePickerList();
        }
      });

      window.addEventListener('authChanged', (e) => {
        if (!document.getElementById('groupsContainer')) return;
        this.currentUser = e.detail.user;
        this.updatePublicToggleVisibility();
      });
    }
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
    const newItem = {
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
    };

    group.items.push(newItem);
    this.render();
  }

  removeExerciseFromGroup(groupId, itemId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    group.items = group.items.filter(item => item.id !== itemId);
    this.render();
  }

  getLocalizedExerciseName(ex) {
    if (!ex) return '';
    if (ex.is_standard && window.t) {
      const tr = window.t(`exercises.${ex.name}`);
      if (tr && tr !== `exercises.${ex.name}`) return tr;
    }
    return ex.name || '';
  }

  getLocalizedCategoryName(category) {
    if (!category) return 'Full Body';
    if (window.Categories && window.Categories.getName) {
      return window.Categories.getName(category);
    }
    if (window.t) {
      const tr = window.t(`categories.${category}`);
      if (tr && tr !== `categories.${category}`) return tr;
    }
    return category;
  }

  getThumbnailCanvas() {
    if (!this._thumbCanvas && typeof window.Mannequin === 'function') {
      try {
        this._thumbCanvas = document.createElement('canvas');
        this._thumbCanvas.width = 80;
        this._thumbCanvas.height = 80;
        this._thumbCanvas.style.width = '80px';
        this._thumbCanvas.style.height = '80px';
        this._thumbMannequin = new window.Mannequin(this._thumbCanvas, {
          enableAnchors: false,
          isEditor: false
        });
        if (this._thumbMannequin.animFrameId) {
          cancelAnimationFrame(this._thumbMannequin.animFrameId);
          this._thumbMannequin.animFrameId = null;
        }
        this._thumbMannequin.W = 80;
        this._thumbMannequin.H = 80;
        if (this._thumbMannequin.renderer) {
          this._thumbMannequin.renderer.setSize(80, 80, false);
        }
        if (this._thumbMannequin.camera) {
          this._thumbMannequin.camera.aspect = 1;
          this._thumbMannequin.camera.updateProjectionMatrix();
        }
      } catch (err) {
        console.warn('[Builder] Could not create offscreen thumbnail canvas:', err);
      }
    }
    return this._thumbMannequin;
  }

  getExerciseThumbnail(exercise) {
    if (!exercise) return '';
    if (this.thumbnailCache.has(exercise.id)) {
      return this.thumbnailCache.get(exercise.id);
    }

    try {
      const m = this.getThumbnailCanvas();
      if (!m) return '';

      if (exercise.keyframes && exercise.keyframes.length > 0) {
        m.setKeyframes(exercise.keyframes);
        if (m.keys && m.keys[0]) m.apply(m.keys[0].pose);
      } else {
        const name = (exercise.name || '').toLowerCase();
        let preset = 'squat';
        if (name.includes('jack')) preset = 'jack';
        else if (name.includes('lunge') || name.includes('affond')) preset = 'lunge';
        else if (name.includes('burpee')) preset = 'burpee';
        m.loadPreset(preset);
        if (m.keys && m.keys[0]) m.apply(m.keys[0].pose);
      }

      m.cam.theta = 0.35;
      m.cam.phi = 1.35;
      m.cam.radius = 3.6;
      m.cam.target.set(0, 0.88, 0);
      m.updateCamera();
      m.refresh();
      m.renderer.render(m.scene, m.camera);

      const dataUrl = this._thumbCanvas.toDataURL('image/png');
      this.thumbnailCache.set(exercise.id, dataUrl);
      return dataUrl;
    } catch (err) {
      console.warn('[Builder] Could not generate thumbnail:', err);
      return '';
    }
  }

  preloadThumbnails() {
    if (!this.availableExercises || !this.availableExercises.length) return;
    requestAnimationFrame(() => {
      this.availableExercises.forEach(ex => {
        this.getExerciseThumbnail(ex);
      });
      // Re-render once preloading is done to show thumbnails immediately
      if (document.getElementById('groupsContainer')) {
        this.render();
      }
    });
  }

  openExercisePicker(groupId, itemId) {
    this.activePickerTarget = { groupId, itemId };
    this.pickerSearchQuery = '';
    this.pickerCategory = 'All';

    const searchInput = document.getElementById('exerciseSearchInput');
    const clearBtn = document.getElementById('clearExerciseSearchBtn');
    if (searchInput) {
      searchInput.value = '';
    }
    if (clearBtn) {
      clearBtn.style.display = 'none';
    }

    const chipsContainer = document.getElementById('exercisePickerCategoryChips');
    if (chipsContainer && window.Categories) {
      window.Categories.renderFilterChips(chipsContainer, this.pickerCategory, (cat) => {
        this.pickerCategory = cat;
        this.renderExercisePickerList();
      });
    }

    this.renderExercisePickerList();

    if (window.Material3) {
      window.Material3.openDialog('exercisePickerModal');
    }

    setTimeout(() => {
      if (searchInput) {
        searchInput.focus();
      }
    }, 150);
  }

  closeExercisePicker() {
    this.activePickerTarget = null;
    if (window.Material3) {
      window.Material3.closeDialog('exercisePickerModal');
    }
  }

  openPreviewModal(exercise) {
    if (!exercise) return;
    const titleEl = document.getElementById('builderPreviewModalTitle');
    const localizedName = this.getLocalizedExerciseName(exercise);
    const localizedCategory = this.getLocalizedCategoryName(exercise.category);

    if (titleEl) {
      titleEl.innerHTML = `${this.escapeHtml(localizedName)} <span class="md-chip" style="height: 24px; font-size: 0.72rem; padding: 0 0.5rem; vertical-align: middle; margin-left: 6px;">${this.escapeHtml(localizedCategory)}</span>`;
    }

    const notesBox = document.getElementById('builderPreviewModalNotes');
    const notesText = document.getElementById('builderPreviewModalNotesText');
    if (notesBox && notesText) {
      if (exercise.notes && exercise.notes.trim()) {
        notesText.textContent = exercise.notes.trim();
        notesBox.style.display = 'block';
      } else {
        notesBox.style.display = 'none';
      }
    }

    if (window.Material3) {
      window.Material3.openDialog('builderPreviewModalDialog');
    }

    const canvas = document.getElementById('builderPreviewCanvas');
    if (!canvas) return;

    if (this.previewMannequin) {
      this.previewMannequin.destroy();
      this.previewMannequin = null;
    }

    this.previewMannequin = new window.Mannequin(canvas, {
      enableAnchors: false,
      isEditor: false
    });

    if (exercise.keyframes && exercise.keyframes.length > 0) {
      this.previewMannequin.setKeyframes(exercise.keyframes, 0.8);
      this.previewMannequin.play();
    } else {
      const name = (exercise.name || '').toLowerCase();
      let preset = 'squat';
      if (name.includes('jack')) preset = 'jack';
      else if (name.includes('lunge') || name.includes('affond')) preset = 'lunge';
      else if (name.includes('burpee')) preset = 'burpee';
      this.previewMannequin.loadPreset(preset);
      this.previewMannequin.play();
    }

    // Progressive resize triggers to adapt to modal transition (0ms, 60ms, 150ms, 300ms)
    const resizePreview = () => {
      if (this.previewMannequin && canvas) {
        this.previewMannequin.resize();
        this.previewMannequin.resetView();
      }
    };

    requestAnimationFrame(resizePreview);
    setTimeout(resizePreview, 60);
    setTimeout(resizePreview, 160);
    setTimeout(resizePreview, 320);

    // Also use ResizeObserver to automatically resize on any layout change
    if (window.ResizeObserver && !this._previewResizeObserver) {
      const wrap = canvas.closest('.preview-canvas-wrap') || canvas;
      this._previewResizeObserver = new ResizeObserver(() => {
        if (this.previewMannequin) {
          this.previewMannequin.resize();
        }
      });
      this._previewResizeObserver.observe(wrap);
    }
  }

  closePreviewModal() {
    if (this.previewMannequin) {
      this.previewMannequin.stop();
      this.previewMannequin.destroy();
      this.previewMannequin = null;
    }
    if (this._previewResizeObserver) {
      this._previewResizeObserver.disconnect();
      this._previewResizeObserver = null;
    }
    if (window.Material3) {
      window.Material3.closeDialog('builderPreviewModalDialog');
    }
  }

  renderExercisePickerList() {
    const listContainer = document.getElementById('exercisePickerList');
    const countContainer = document.getElementById('exercisePickerCount');
    if (!listContainer) return;

    const t = window.t || (k => k);
    const q = this.pickerSearchQuery.trim().toLowerCase();
    const activeCat = this.pickerCategory;

    // Determine currently selected exercise ID
    let currentExId = null;
    if (this.activePickerTarget) {
      const group = this.groups.find(g => g.id === this.activePickerTarget.groupId);
      if (group) {
        const item = (group.items || []).find(i => i.id === this.activePickerTarget.itemId);
        if (item) {
          currentExId = item.exerciseId || item.exercise_id;
        }
      }
    }

    const filtered = this.availableExercises.filter(ex => {
      const locName = this.getLocalizedExerciseName(ex).toLowerCase();
      const rawName = (ex.name || '').toLowerCase();
      const locCat = this.getLocalizedCategoryName(ex.category).toLowerCase();
      const rawCat = (ex.category || '').toLowerCase();
      const notes = (ex.notes || '').toLowerCase();

      const matchesCat = (activeCat === 'All' || ex.category === activeCat || 
                         (activeCat === 'Back' && ex.category === 'Dorsali') || 
                         (activeCat === 'Dorsali' && ex.category === 'Back'));
      if (!matchesCat) return false;

      if (!q) return true;
      return locName.includes(q) || rawName.includes(q) || locCat.includes(q) || rawCat.includes(q) || notes.includes(q);
    });

    if (countContainer) {
      const countMsg = t('builder.exercises_found_count', { count: filtered.length });
      countContainer.textContent = countMsg || `${filtered.length} esercizi trovati`;
    }

    if (filtered.length === 0) {
      const noFoundText = t('builder.no_exercises_found') || 'Nessun esercizio trovato.';
      listContainer.innerHTML = `
        <div class="exercise-picker-empty">
          <span class="material-symbols-rounded">search_off</span>
          <p>${this.escapeHtml(noFoundText)}</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(ex => {
      const isSelected = ex.id === currentExId;
      const localizedName = this.getLocalizedExerciseName(ex);
      const localizedCategory = this.getLocalizedCategoryName(ex.category);
      const thumbUrl = this.getExerciseThumbnail(ex);

      return `
        <div class="exercise-picker-item ${isSelected ? 'active-selected' : ''}" data-action="select-exercise-item" data-exercise-id="${ex.id}">
          <div class="exercise-picker-item__info">
            <div class="exercise-picker-item__title-row">
              <span class="exercise-picker-item__name">${this.escapeHtml(localizedName)}</span>
              ${isSelected ? `
                <span class="material-symbols-rounded exercise-picker-item__check">check_circle</span>
              ` : ''}
              <span class="exercise-picker-item__category">${this.escapeHtml(localizedCategory)}</span>
            </div>
            ${ex.notes && ex.notes.trim() ? `
              <p class="exercise-picker-item__notes">${this.escapeHtml(ex.notes)}</p>
            ` : ''}
          </div>
          <div class="exercise-preview-thumb-wrap" title="${this.escapeHtml(localizedName)}">
            ${thumbUrl ? `
              <img src="${thumbUrl}" class="exercise-preview-thumb" alt="${this.escapeHtml(localizedName)}" width="40" height="40">
            ` : `
              <div class="exercise-preview-thumb-placeholder"><span class="material-symbols-rounded" style="font-size: 20px;">accessibility_new</span></div>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  selectExercise(exerciseId) {
    if (!this.activePickerTarget) return;

    const group = this.groups.find(g => g.id === this.activePickerTarget.groupId);
    if (!group) return;

    const item = (group.items || []).find(i => i.id === this.activePickerTarget.itemId);
    if (!item) return;

    const selectedEx = this.availableExercises.find(ex => ex.id === exerciseId);
    if (selectedEx) {
      item.exercise_id = selectedEx.id;
      item.exerciseId = selectedEx.id;
      item.name = selectedEx.name;
      item.category = selectedEx.category;
      this.render();
    }

    this.closeExercisePicker();
  }

  initEvents() {
    // 3D Preview Modal close handlers
    const closePreviewBtn = document.getElementById('builderPreviewModalCloseBtn');
    if (closePreviewBtn) {
      closePreviewBtn.addEventListener('click', () => this.closePreviewModal());
    }
    const dismissPreviewBtn = document.getElementById('builderPreviewModalDismissBtn');
    if (dismissPreviewBtn) {
      dismissPreviewBtn.addEventListener('click', () => this.closePreviewModal());
    }

    document.addEventListener('turbo:before-cache', () => {
      this.closePreviewModal();
    });
    // Search input handler
    const searchInput = document.getElementById('exerciseSearchInput');
    const clearBtn = document.getElementById('clearExerciseSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.pickerSearchQuery = e.target.value;
        if (clearBtn) {
          clearBtn.style.display = this.pickerSearchQuery.length > 0 ? 'inline-flex' : 'none';
        }
        this.renderExercisePickerList();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeExercisePicker();
        } else if (e.key === 'Enter') {
          // Select first filtered item if enter is pressed
          const firstItem = document.querySelector('.exercise-picker-item');
          if (firstItem) {
            const exId = firstItem.getAttribute('data-exercise-id');
            if (exId) this.selectExercise(exId);
          }
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        this.pickerSearchQuery = '';
        clearBtn.style.display = 'none';
        this.renderExercisePickerList();
      });
    }

    const closePickerBtn = document.getElementById('closeExercisePickerBtn');
    if (closePickerBtn) {
      closePickerBtn.addEventListener('click', () => {
        this.closeExercisePicker();
      });
    }

    document.addEventListener('click', (e) => {
      const previewBtn = e.target.closest('[data-action="preview-exercise"]');
      if (previewBtn) {
        e.stopPropagation();
        e.preventDefault();
        const exId = previewBtn.getAttribute('data-exercise-id');
        const ex = this.availableExercises.find(item => item.id === exId);
        if (ex) this.openPreviewModal(ex);
        return;
      }

      if (e.target.closest('#addGroupBtn')) {
        this.addGroup();
      }

      if (e.target.closest('#savePlanBtn')) {
        this.savePlan();
      }

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

      const openPickerBtn = e.target.closest('[data-action="open-exercise-picker"]');
      if (openPickerBtn) {
        const groupId = openPickerBtn.getAttribute('data-group-id');
        const itemId = openPickerBtn.getAttribute('data-item-id');
        this.openExercisePicker(groupId, itemId);
      }

      const selectExItem = e.target.closest('[data-action="select-exercise-item"]');
      if (selectExItem) {
        const exerciseId = selectExItem.getAttribute('data-exercise-id');
        if (exerciseId) {
          this.selectExercise(exerciseId);
        }
      }
    });

    document.addEventListener('change', (e) => {
      const container = document.getElementById('groupsContainer');
      if (!container || !container.contains(e.target)) return;

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
        if (window.Turbo) {
          window.Turbo.visit('/');
        } else {
          window.location.href = '/';
        }
      }, 700);
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
        const localizedName = selectedEx ? this.getLocalizedExerciseName(selectedEx) : (item.name || 'Seleziona esercizio');
        const localizedCategory = selectedEx ? this.getLocalizedCategoryName(selectedEx.category) : this.getLocalizedCategoryName(item.category);
        const thumbUrl = selectedEx ? this.getExerciseThumbnail(selectedEx) : '';

        return `
          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <div class="exercise-item-row">
              <!-- Searchable Exercise Trigger Button with 40x40 Thumbnail Preview & 3D Preview Eye Button -->
              <div>
                <label style="display: block; font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 2px;" data-i18n="builder.exercise_label">Esercizio</label>
                <div style="display: flex; align-items: center; gap: 0.35rem; width: 100%; min-width: 0;">
                  <button type="button" class="exercise-picker-trigger" data-action="open-exercise-picker" data-group-id="${group.id}" data-item-id="${item.id}" title="Clicca per cercare o cambiare esercizio">
                    <div class="exercise-picker-trigger__content">
                      <span class="exercise-picker-trigger__name">${this.escapeHtml(localizedName)}</span>
                      <span class="exercise-picker-trigger__badge">${this.escapeHtml(localizedCategory)}</span>
                    </div>
                    <div class="exercise-preview-thumb-wrap" title="${this.escapeHtml(localizedName)}">
                      ${thumbUrl ? `
                        <img src="${thumbUrl}" class="exercise-preview-thumb" alt="${this.escapeHtml(localizedName)}" width="40" height="40">
                      ` : `
                        <div class="exercise-preview-thumb-placeholder"><span class="material-symbols-rounded" style="font-size: 20px;">accessibility_new</span></div>
                      `}
                    </div>
                    <span class="material-symbols-rounded exercise-picker-trigger__icon">arrow_drop_down</span>
                  </button>
                  <button type="button" class="md-btn-icon" data-action="preview-exercise" data-exercise-id="${selectedEx ? selectedEx.id : ''}" title="Visualizza animazione 3D" aria-label="Anteprima 3D" style="flex-shrink: 0; ${selectedEx ? '' : 'visibility: hidden; pointer-events: none;'}">
                    <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 22px;">visibility</span>
                  </button>
                </div>
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
              <span class="material-symbols-rounded circuit-group__icon">repeat</span>
              <input type="text" class="md-input group-title-input" data-group-id="${group.id}" value="${group.title || `Circuito ${gIdx + 1}`}" placeholder="Nome Circuito" aria-label="Nome Circuito">
            </div>

            <div class="circuit-group__actions">
              <div class="circuit-group__rounds-wrap">
                <label class="circuit-group__rounds-label" data-i18n="builder.rounds_label">Giri:</label>
                <input type="number" class="md-input group-reps-input" data-group-id="${group.id}" value="${group.repetitions || 1}" min="1" max="20" aria-label="Giri">
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

  window.builder = new BuilderController();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.builder.init();
    });
  } else {
    window.builder.init();
  }
  document.addEventListener('turbo:load', () => {
    window.builder.init();
  });
})();
