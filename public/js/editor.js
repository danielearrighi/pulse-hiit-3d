/**
 * 3D Mannequin Pose & Exercise Creator Controller (Material 3 Android UI)
 */

class EditorController {
  constructor() {
    this.mannequin = null;
    this.currentUser = null;
    this.exerciseId = new URLSearchParams(window.location.search).get('id');
    this.editingExercise = null;
  }

  async init() {
    this.currentUser = await window.API.getMe();
    this.initMannequin();
    this.initEvents();

    if (this.exerciseId) {
      await this.loadExerciseToEdit(this.exerciseId);
    }

    window.addEventListener('languageChanged', () => {
      this.renderKeyframeStrip();
      this.updateUIForMode();
    });

    window.addEventListener('authChanged', (e) => {
      this.currentUser = e.detail.user;
    });

    window.addEventListener('resize', () => {
      if (this.mannequin) this.mannequin.resize();
    });
  }

  initMannequin() {
    const canvas = document.getElementById('mannequinCanvas');
    if (!canvas) return;

    this.mannequin = new Mannequin(canvas, {
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
        window.Material3.showSnackbar(msg);
      }
    });

    this.renderKeyframeStrip();
  }

  syncScrubUI() {
    if (!this.mannequin) return;
    const scrubInput = document.getElementById('scrub');
    const scrubVal = document.getElementById('scrubVal');
    const playIcon = document.getElementById('playIcon');
    const playLabel = document.getElementById('playLabel');

    if (playIcon && playLabel) {
      if (this.mannequin.playing) {
        playIcon.textContent = 'pause';
        playLabel.textContent = 'Pausa';
      } else {
        playIcon.textContent = 'play_arrow';
        playLabel.textContent = 'Play';
      }
    }

    const L = Math.max(this.mannequin.seq.length, 1);
    const p = ((this.mannequin.playPos % L) + L) % L;

    if (scrubInput && this.mannequin.playing) {
      scrubInput.value = Math.round((p / L) * 1000);
    }

    if (scrubVal) {
      const i = Math.floor(p);
      if (this.mannequin.seq[i] !== undefined) {
        const nextIdx = (i + 1) % L;
        scrubVal.textContent = `K${this.mannequin.seq[i] + 1} → K${this.mannequin.seq[nextIdx] + 1}`;
      }
    }

    // Update Undo / Redo button states
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = this.mannequin.history.undo.length === 0;
    if (redoBtn) redoBtn.disabled = this.mannequin.history.redo.length === 0;
  }

  renderKeyframeStrip() {
    const container = document.getElementById('keyframesStrip');
    if (!container || !this.mannequin) return;

    container.innerHTML = '';
    const keys = this.mannequin.keys || [];

    keys.forEach((k, i) => {
      const isSelected = i === this.mannequin.current;
      const el = document.createElement('div');
      el.className = `keyframe-card md-ripple-surface ${isSelected ? 'active' : ''}`;
      el.setAttribute('data-key-idx', i);

      el.innerHTML = `
        <span style="font-size: 0.72rem; font-weight: 700; color: var(--md-sys-color-primary);">${i + 1}</span>
        <span style="font-size: 0.85rem; font-weight: 600;">K${i + 1}</span>
        ${keys.length > 2 ? `
          <button type="button" class="keyframe-card__del" data-action="delete-key" data-key-idx="${i}" title="Elimina fotogramma">
            <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
          </button>
        ` : ''}
      `;

      el.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-action="delete-key"]')) {
          this.mannequin.deleteKey(i);
          return;
        }
        this.mannequin.stop();
        if (i !== this.mannequin.current) this.mannequin.pushUndo();
        this.mannequin.loadKey(i);
      });

      container.appendChild(el);
    });

    // Add Keyframe Button
    const addBtn = document.createElement('div');
    addBtn.className = 'keyframe-add-card md-ripple-surface';
    addBtn.title = 'Aggiungi Fotogramma';
    addBtn.innerHTML = `
      <span class="material-symbols-rounded">add</span>
      <span style="font-size: 0.72rem; font-weight: 600; margin-top: 2px;">Nuovo</span>
    `;
    addBtn.addEventListener('click', () => {
      this.mannequin.stop();
      this.mannequin.addKey();
    });
    container.appendChild(addBtn);

    // Clone Keyframe Button
    const cloneBtn = document.createElement('div');
    cloneBtn.className = 'keyframe-add-card md-ripple-surface';
    cloneBtn.title = 'Clona fotogramma selezionato';
    cloneBtn.innerHTML = `
      <span class="material-symbols-rounded">content_copy</span>
      <span style="font-size: 0.72rem; font-weight: 600; margin-top: 2px;">Clona</span>
    `;
    cloneBtn.addEventListener('click', () => {
      this.mannequin.stop();
      this.mannequin.cloneKey();
    });
    container.appendChild(cloneBtn);
  }

  async loadExerciseToEdit(id) {
    try {
      const exercise = await window.API.getExerciseById(id);
      if (!exercise) {
        window.Material3.showSnackbar('Esercizio non trovato');
        return;
      }

      const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele'));
      const isSuperUser = this.currentUser && this.currentUser.role === 'superuser';
      const canManage3D = isAdmin || isSuperUser;

      if (!canManage3D) {
        window.Material3.showSnackbar('Solo gli amministratori e i Super User possono modificare esercizi 3D.');
        setTimeout(() => { window.location.href = '/library'; }, 1200);
        return;
      }

      this.editingExercise = exercise;

      // Populate input fields
      const nameInput = document.getElementById('exNameInput');
      const catSelect = document.getElementById('exCategorySelect');
      const notesInput = document.getElementById('exNotesInput');
      const privateCheck = document.getElementById('exPrivateCheck');

      if (nameInput) nameInput.value = exercise.name || '';
      if (catSelect) catSelect.value = exercise.category || 'Full Body';
      if (notesInput) notesInput.value = exercise.notes || '';
      if (privateCheck) {
        privateCheck.checked = !!exercise.is_private;
      }

      // Load keyframes into mannequin
      if (this.mannequin && exercise.keyframes && Array.isArray(exercise.keyframes) && exercise.keyframes.length > 0) {
        this.mannequin.setKeyframes(exercise.keyframes, 0.8);
        this.renderKeyframeStrip();
        this.syncScrubUI();
      }

      this.updateUIForMode();

      if (window.Material3 && typeof window.Material3.initInputFloatingLabels === 'function') {
        window.Material3.initInputFloatingLabels();
      }
    } catch (err) {
      console.error('Error loading exercise to edit:', err);
      window.Material3.showSnackbar(err.message || 'Impossibile caricare l\'esercizio da modificare.');
    }
  }

  updateUIForMode() {
    const t = window.t || (k => k);
    const titleEl = document.getElementById('editorTitle');
    const subtitleEl = document.getElementById('editorSubtitle');
    const submitLabel = document.getElementById('saveExerciseSubmitLabel');

    if (this.editingExercise) {
      if (titleEl) titleEl.textContent = t('editor.edit_title', { defaultValue: 'Modifica Esercizio 3D' });
      if (subtitleEl) subtitleEl.textContent = t('editor.edit_subtitle', { defaultValue: 'Modifica le pose, la sequenza di fotogrammi o i dettagli dell\'esercizio.' });
      if (submitLabel) submitLabel.textContent = t('editor.update_exercise', { defaultValue: 'Salva Modifiche Esercizio' });
      document.title = `${t('editor.edit_title', { defaultValue: 'Modifica Esercizio 3D' })} - Pulse HIIT 3D`;
    } else {
      if (titleEl) titleEl.textContent = t('editor.title', { defaultValue: 'Creatore di Pose 3D' });
      if (subtitleEl) subtitleEl.textContent = t('editor.subtitle', { defaultValue: 'Trascina i punti colorati sul manichino per costruire la posa. Salva i keyframe e premi Play per visualizzare il movimento.' });
      if (submitLabel) submitLabel.textContent = t('editor.save_exercise', { defaultValue: 'Salva Esercizio' });
      document.title = `${t('editor.title', { defaultValue: 'Creatore di Pose 3D' })} - Pulse HIIT 3D`;
    }
  }

  initEvents() {
    // Base Poses buttons (stand, supine, prone)
    document.querySelectorAll('[data-base]').forEach(btn => {
      btn.addEventListener('click', () => {
        const baseId = btn.getAttribute('data-base');
        document.querySelectorAll('[data-base]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mannequin.applyBase(baseId);
      });
    });

    // Preset Exercises dropdown
    const presetSelect = document.getElementById('exercisePresetSelect');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.mannequin.loadPreset(e.target.value);
          window.Material3.showSnackbar(`Preset ${e.target.options[e.target.selectedIndex].text} caricato!`);
          e.target.value = '';
        }
      });
    }

    // Play / Pause button
    document.getElementById('playBtn')?.addEventListener('click', () => {
      this.mannequin.togglePlay();
      this.syncScrubUI();
    });

    // Reset Camera button
    document.getElementById('resetCameraBtn')?.addEventListener('click', () => {
      this.mannequin.resetView();
    });

    // Duration slider
    const durInput = document.getElementById('dur');
    if (durInput) {
      durInput.addEventListener('input', (e) => {
        const d = parseFloat(e.target.value);
        this.mannequin.duration = d;
        const durVal = document.getElementById('durVal');
        if (durVal) durVal.textContent = d.toFixed(2) + 's';
      });
    }

    // Timeline Scrub slider
    const scrubInput = document.getElementById('scrub');
    if (scrubInput) {
      scrubInput.addEventListener('input', (e) => {
        this.mannequin.stop();
        const L = Math.max(this.mannequin.seq.length, 1);
        this.mannequin.playPos = (parseInt(e.target.value, 10) / 1000) * L;
        const s = this.mannequin.sampleAt(this.mannequin.playPos);
        const scrubVal = document.getElementById('scrubVal');
        if (scrubVal && this.mannequin.seq[s.i] !== undefined) {
          const nextIdx = (s.i + 1) % L;
          scrubVal.textContent = `K${this.mannequin.seq[s.i] + 1} → K${this.mannequin.seq[nextIdx] + 1}`;
        }
      });
    }

    // Undo / Redo
    document.getElementById('undoBtn')?.addEventListener('click', () => this.mannequin.undo());
    document.getElementById('redoBtn')?.addEventListener('click', () => this.mannequin.redo());

    // Rig Toggles
    document.querySelectorAll('.toggle-chip[data-flag]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.getAttribute('data-flag');
        this.mannequin.flags[f] = !this.mannequin.flags[f];
        btn.classList.toggle('on', this.mannequin.flags[f]);
        if (f === 'onion') this.mannequin.refreshGhost();
      });
    });

    // Save Pose button
    document.getElementById('savePoseBtn')?.addEventListener('click', () => {
      this.mannequin.pushUndo();
      this.mannequin.saveCurrent(false);
      window.Material3.showSnackbar('Posa salvata nel fotogramma corrente!');
    });

    // Help Modal
    document.getElementById('openEditorHelpBtn')?.addEventListener('click', () => {
      window.Material3.openDialog('editorHelpDialog');
    });
    document.getElementById('editorHelpCloseBtn')?.addEventListener('click', () => {
      window.Material3.closeDialog('editorHelpDialog');
    });
    document.getElementById('editorHelpOkBtn')?.addEventListener('click', () => {
      window.Material3.closeDialog('editorHelpDialog');
    });

    // Save / Update Exercise Form
    const saveExForm = document.getElementById('saveExerciseForm');
    if (saveExForm) {
      saveExForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!this.currentUser) {
          window.Material3.showSnackbar('Accedi prima di salvare un esercizio');
          window.Material3.openDialog('authSheetBackdrop');
          return;
        }

        const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele'));
        const isSuperUser = this.currentUser && this.currentUser.role === 'superuser';

        if (!isAdmin && !isSuperUser) {
          window.Material3.showSnackbar('Solo gli amministratori e i Super User possono creare e salvare esercizi 3D.');
          return;
        }

        const name = document.getElementById('exNameInput').value.trim();
        const category = document.getElementById('exCategorySelect').value;
        const notes = document.getElementById('exNotesInput')?.value.trim() || '';
        const isPrivate = document.getElementById('exPrivateCheck').checked;
        const t = window.t || (k => k);

        if (!name) {
          window.Material3.showSnackbar('Inserisci un nome per l\'esercizio');
          return;
        }

        const keyframes = this.mannequin.getKeyframes();
        if (!keyframes || keyframes.length < 2) {
          window.Material3.showSnackbar('Aggiungi almeno 2 fotogrammi per creare l\'animazione.');
          return;
        }

        try {
          if (this.editingExercise) {
            await window.API.updateExercise(this.editingExercise.id, {
              name,
              category,
              notes: notes || null,
              is_private: isPrivate,
              keyframes
            });

            window.Material3.showSnackbar(t('editor.ex_updated', { defaultValue: 'Esercizio aggiornato con successo!' }));
          } else {
            await window.API.createExercise({
              name,
              category,
              notes: notes || null,
              is_private: isPrivate,
              keyframes
            });

            window.Material3.showSnackbar(t('editor.ex_saved', { defaultValue: 'Esercizio salvato con successo!' }));
          }

          setTimeout(() => {
            window.location.href = '/library';
          }, 900);
        } catch (err) {
          window.Material3.showSnackbar(err.message || 'Errore durante il salvataggio.');
        }
      });
    }
  }
}

const editor = new EditorController();
document.addEventListener('DOMContentLoaded', () => {
  editor.init();
});
