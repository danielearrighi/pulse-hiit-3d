(function() {
  if (window.player) return;

  class PlayerController {
    constructor() {
      this.planId = null;
      this.plan = null;
      this.exercises = [];
      this.queue = [];
      this.currentIndex = 0;

      this.mannequin = null;
      this.previewMannequin = null;
      this.timerInterval = null;
      this.secondsRemaining = 0;
      this.totalStepDuration = 0;
      this.isPaused = false;
      this.audioCtx = null;
      this.compressor = null;
      this.wakeLock = null;
      this.isWorkoutActive = false;
      this.eventsInitialized = false;
    }

  async init() {
    const canvas = document.getElementById('playerCanvas');
    if (!canvas) return;

    this.stopTimer();
    this.releaseWakeLock();
    if (this.mannequin) {
      this.mannequin.stop();
      this.mannequin.destroy();
      this.mannequin = null;
    }
    if (this.previewMannequin) {
      this.previewMannequin.stop();
      this.previewMannequin.destroy();
      this.previewMannequin = null;
    }

    this.planId = new URLSearchParams(window.location.search).get('planId');
    this.isPaused = false;
    this.currentIndex = 0;

    if (window.i18n) {
      await window.i18n.init();
    }

    this.exercises = await window.API.getExercises();

    if (this.planId) {
      try {
        this.plan = await window.API.getPlanById(this.planId);
      } catch (err) {
        console.warn('Error loading plan by ID, checking plans list');
      }
    }

    if (!this.plan) {
      const plans = await window.API.getPlans();
      if (plans && plans.length > 0) {
        this.plan = plans[0];
      }
    }

    this.initAudio();
    this.initMannequin();

    if (!this.eventsInitialized) {
      this.initEvents();
      this.eventsInitialized = true;

      document.addEventListener('turbo:before-cache', () => {
        this.stopTimer();
        this.releaseWakeLock();
        if (this.mannequin) {
          this.mannequin.stop();
          this.mannequin.destroy();
          this.mannequin = null;
        }
        if (this.previewMannequin) {
          this.previewMannequin.stop();
          this.previewMannequin.destroy();
          this.previewMannequin = null;
        }
      });
    }

    if (this.plan) {
      this.buildQueue();
      this.startWorkout();
    } else {
      window.Material3.showSnackbar('Nessuna scheda HIIT selezionata.');
      setTimeout(() => {
        if (window.Turbo) {
          window.Turbo.visit('/');
        } else {
          window.location.href = '/';
        }
      }, 1200);
    }
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && (!this.wakeLock || this.wakeLock.released)) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          // Wake lock released by browser/OS
        });
      }
    } catch (err) {
      console.warn('[Player] Screen Wake Lock not acquired:', err);
    }
  }

  async releaseWakeLock() {
    try {
      if (this.wakeLock && !this.wakeLock.released) {
        await this.wakeLock.release();
      }
    } catch (err) {
      console.warn('[Player] Error releasing Screen Wake Lock:', err);
    } finally {
      this.wakeLock = null;
    }
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (!this.compressor) {
        // Dynamics compressor to boost loudness and prevent clipping distortion on mobile speakers
        this.compressor = this.audioCtx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
        this.compressor.knee.setValueAtTime(40, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);
        this.compressor.connect(this.audioCtx.destination);
      }
    }
  }

  playBeep(freq = 800, duration = 0.18, type = 'triangle', volume = 0.85) {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      const attackTime = 0.005;
      const releaseTime = 0.025;
      const sustainEnd = Math.max(now + attackTime, now + duration - releaseTime);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + attackTime);
      gain.gain.setValueAtTime(volume, sustainEnd);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      if (this.compressor) {
        gain.connect(this.compressor);
      } else {
        gain.connect(this.audioCtx.destination);
      }

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio beep error:', e);
    }
  }

  initMannequin() {
    const canvas = document.getElementById('playerCanvas');
    if (!canvas) return;

    this.mannequin = new Mannequin(canvas, {
      enableAnchors: false,
      isEditor: false
    });
  }

  buildQueue() {
    this.queue = [];
    const groups = this.plan.structure.groups || [];
    const t = window.t || (k => k);

    groups.forEach((group, gIdx) => {
      const reps = group.repetitions || 1;
      for (let r = 1; r <= reps; r++) {
        (group.items || []).forEach((item) => {
          const matchedEx = this.exercises.find(e => e.id === item.exerciseId || e.id === item.exercise_id);
          const ex = {
            id: item.exerciseId || item.exercise_id || (matchedEx && matchedEx.id),
            name: (matchedEx && matchedEx.name) || item.name || 'Esercizio',
            category: (matchedEx && matchedEx.category) || item.category || 'Cardio',
            keyframes: (matchedEx && matchedEx.keyframes) || item.keyframes || [],
            notes: item.notes || (matchedEx && matchedEx.notes) || '',
            is_standard: matchedEx ? matchedEx.is_standard : false
          };

          // Exercise Step
          this.queue.push({
            isRest: false,
            groupTitle: `${group.title || `Circuito ${gIdx + 1}`} (${r}/${reps})`,
            exercise: ex,
            type: item.type || 'duration',
            target: item.target || 40,
            restAfter: item.restAfter !== undefined ? item.restAfter : 20
          });

          // Rest Step (if > 0)
          if (item.restAfter && item.restAfter > 0) {
            this.queue.push({
              isRest: true,
              groupTitle: `${group.title || `Circuito ${gIdx + 1}`} (${r}/${reps})`,
              exercise: { name: t('player.rest_title') || 'RECUPERO', category: 'Rest' },
              type: 'duration',
              target: item.restAfter
            });
          }
        });
      }
    });
  }

  startWorkout() {
    this.isWorkoutActive = true;
    this.currentIndex = 0;
    this.requestWakeLock();
    this.loadStep(0);
  }

  loadStep(index) {
    if (index >= this.queue.length) {
      this.finishWorkout();
      return;
    }

    this.currentIndex = index;
    const step = this.queue[index];
    const t = window.t || (k => k);

    // Update Top Step Counter & Group Title
    document.getElementById('playerStepCounter').textContent = t('player.step_counter', {
      current: index + 1,
      total: this.queue.length
    });
    document.getElementById('playerGroupTitle').textContent = step.groupTitle;

    // Update Prev button state
    const prevBtn = document.getElementById('playerPrevBtn') || document.getElementById('playerBackBtn');
    if (prevBtn) {
      prevBtn.disabled = (index <= 0);
    }

    const pauseBtn = document.getElementById('playerPauseBtn');
    if (pauseBtn) {
      pauseBtn.innerHTML = `<span class="material-symbols-rounded">pause</span> ${t('player.pause') || 'Pausa'}`;
    }

    // Update Exercise Info
    const exNameEl = document.getElementById('playerExerciseName');
    const badgeEl = document.getElementById('playerCategoryBadge');
    const localizedName = step.exercise.is_standard
      ? ((window.t && window.t(`exercises.${step.exercise.name}`, { defaultValue: step.exercise.name })) || step.exercise.name)
      : step.exercise.name;
    const localizedCategory = (window.Categories && window.Categories.getName(step.exercise.category)) ||
      (window.t && window.t(`categories.${step.exercise.category}`, { defaultValue: step.exercise.category || 'Cardio' })) ||
      step.exercise.category || 'Cardio';

    exNameEl.textContent = localizedName;
    badgeEl.textContent = localizedCategory;
    badgeEl.className = `md-badge ${step.isRest ? 'md-badge-tertiary' : 'md-badge-primary'}`;

    // Update Page Document Title: Exercise Name (current/total)
    document.title = `${localizedName} (${index + 1}/${this.queue.length}) - Pulse HIIT 3D`;

    // Update Exercise Note
    const noteBox = document.getElementById('playerExerciseNote');
    const noteText = document.getElementById('playerExerciseNoteText');
    if (noteBox && noteText) {
      let notes = '';
      if (step.isRest) {
        notes = (step.exercise && step.exercise.notes && step.exercise.notes.trim()) || t('player.rest_note') || 'Recupera';
      } else if (step.exercise && step.exercise.notes) {
        notes = step.exercise.notes.trim();
      }

      if (notes) {
        noteText.textContent = notes;
        noteText.dataset.fullNote = notes;
        noteBox.style.display = 'inline-flex';
      } else {
        noteText.textContent = '';
        noteText.dataset.fullNote = '';
        noteBox.style.display = 'none';
      }
    }

    // Play 3D Animation
    if (this.mannequin) {
      this.mannequin.stop();
      if (step.isRest) {
        this.mannequin.applyBase('stand');
      } else if (step.exercise.keyframes && step.exercise.keyframes.length > 0) {
        this.mannequin.setKeyframes(step.exercise.keyframes, 0.8);
        this.mannequin.play();
      } else {
        this.mannequin.loadPreset('squat');
        this.mannequin.play();
      }
    }

    // Handle Next Exercise Preview during recovery
    if (step.isRest) {
      let nextStep = null;
      for (let i = index + 1; i < this.queue.length; i++) {
        if (!this.queue[i].isRest) {
          nextStep = this.queue[i];
          break;
        }
      }
      if (nextStep) {
        this.showNextPreview(nextStep);
      } else {
        this.hideNextPreview();
      }
    } else {
      this.hideNextPreview();
    }

    // Configure Timer / Reps Mode
    const timerRingWrap = document.getElementById('timerRingWrap');
    const repsWrap = document.getElementById('repsDisplayWrap');
    const timerProgress = document.getElementById('timerRingProgress');

    if (step.type === 'duration' || step.isRest) {
      timerRingWrap.style.display = 'flex';
      repsWrap.style.display = 'none';
      if (step.isRest) {
        timerProgress.classList.add('rest');
      } else {
        timerProgress.classList.remove('rest');
      }
      this.startDurationTimer(step.target);
    } else {
      // Reps Mode
      timerRingWrap.style.display = 'none';
      repsWrap.style.display = 'block';
      document.getElementById('playerRepsCount').textContent = `${step.target} ${t('player.reps_unit') || 'RIPETIZIONI'}`;
      this.stopTimer();
    }
  }

  showNextPreview(nextStep) {
    const previewEl = document.getElementById('playerNextPreview');
    const nameEl = document.getElementById('playerNextPreviewName');
    const targetEl = document.getElementById('playerNextPreviewTarget');
    const canvas = document.getElementById('playerPreviewCanvas');
    if (!previewEl) return;

    const t = window.t || (k => k);
    const localizedName = nextStep.exercise.is_standard
      ? ((window.t && window.t(`exercises.${nextStep.exercise.name}`, { defaultValue: nextStep.exercise.name })) || nextStep.exercise.name)
      : nextStep.exercise.name;
    const localizedCategory = (window.Categories && window.Categories.getName(nextStep.exercise.category)) ||
      (window.t && window.t(`categories.${nextStep.exercise.category}`, { defaultValue: nextStep.exercise.category || 'Cardio' })) ||
      nextStep.exercise.category || 'Cardio';

    if (nameEl) nameEl.textContent = localizedName;

    if (targetEl) {
      const targetStr = nextStep.type === 'duration'
        ? `${nextStep.target}s`
        : `${nextStep.target} ${t('player.reps_unit') || 'RIPETIZIONI'}`;
      targetEl.textContent = `${targetStr} • ${localizedCategory}`;
    }

    previewEl.style.display = 'block';

    if (canvas) {
      if (!this.previewMannequin) {
        this.previewMannequin = new Mannequin(canvas, {
          enableAnchors: false,
          isEditor: false
        });
      }

      this.previewMannequin.stop();
      if (nextStep.exercise.keyframes && nextStep.exercise.keyframes.length > 0) {
        this.previewMannequin.setKeyframes(nextStep.exercise.keyframes, 0.8);
        this.previewMannequin.play();
      } else {
        this.previewMannequin.loadPreset('squat');
        this.previewMannequin.play();
      }

      requestAnimationFrame(() => {
        if (this.previewMannequin) {
          this.previewMannequin.resize();
          this.previewMannequin.resetView();
        }
      });
    }
  }

  hideNextPreview() {
    const previewEl = document.getElementById('playerNextPreview');
    if (previewEl) {
      previewEl.style.display = 'none';
    }
    if (this.previewMannequin) {
      this.previewMannequin.stop();
    }
  }

  startDurationTimer(durationSeconds) {
    this.stopTimer();
    this.totalStepDuration = durationSeconds;
    this.secondsRemaining = durationSeconds;
    this.isPaused = false;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (this.isPaused) return;

      this.secondsRemaining--;
      this.updateTimerDisplay();

      if (this.secondsRemaining == 10) {
        this.playBeep(750, 0.12, 'triangle', 0.85);
        setTimeout(() => {
          if (!this.isPaused && this.isWorkoutActive) {
            this.playBeep(950, 0.15, 'triangle', 0.85);
          }
        }, 150);
      }

      if (this.secondsRemaining <= 3 && this.secondsRemaining > 0) {
        this.playBeep(880, 0.18, 'triangle', 0.9);
      }

      if (this.secondsRemaining <= 0) {
        this.playBeep(1320, 0.40, 'triangle', 0.95);
        this.stopTimer();
        this.loadStep(this.currentIndex + 1);
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const numEl = document.getElementById('playerTimerNumber');
    const progressEl = document.getElementById('timerRingProgress');
    if (numEl) numEl.textContent = this.secondsRemaining;

    if (progressEl && this.totalStepDuration > 0) {
      const circleCircumference = 691;
      const progressFraction = Math.max(0, this.secondsRemaining / this.totalStepDuration);
      const offset = circleCircumference - (progressFraction * circleCircumference);
      progressEl.style.strokeDashoffset = offset;
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById('playerPauseBtn');
    const t = window.t || (k => k);

    if (this.isPaused) {
      pauseBtn.innerHTML = `<span class="material-symbols-rounded">play_arrow</span> ${t('player.resume') || 'Riprendi'}`;
      if (this.mannequin) this.mannequin.stop();
      if (this.previewMannequin) this.previewMannequin.stop();
    } else {
      pauseBtn.innerHTML = `<span class="material-symbols-rounded">pause</span> ${t('player.pause') || 'Pausa'}`;
      if (this.mannequin) this.mannequin.play();
      const currentStep = this.queue[this.currentIndex];
      if (this.previewMannequin && currentStep && currentStep.isRest) {
        this.previewMannequin.play();
      }
    }
  }

  prevStep() {
    if (this.currentIndex > 0) {
      this.stopTimer();
      this.loadStep(this.currentIndex - 1);
    }
  }

  nextStep() {
    this.stopTimer();
    this.loadStep(this.currentIndex + 1);
  }

  finishWorkout() {
    this.isWorkoutActive = false;
    this.stopTimer();
    this.releaseWakeLock();
    this.playBeep(880, 0.15, 'triangle', 0.9);
    setTimeout(() => this.playBeep(1320, 0.45, 'triangle', 0.95), 180);
    if (this.mannequin) this.mannequin.stop();
    if (this.previewMannequin) this.previewMannequin.stop();
    this.hideNextPreview();

    const t = window.t || (k => k);
    document.title = `${t('player.workout_completed') || 'Allenamento Completato!'} - Pulse HIIT 3D`;

    const overlay = document.getElementById('workoutFinishedOverlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  openExerciseNoteModal() {
    const noteTextEl = document.getElementById('playerExerciseNoteText');
    const step = (this.queue && this.queue[this.currentIndex]) || null;

    const fullNote = (noteTextEl && noteTextEl.dataset.fullNote) ||
                     (step && step.exercise && step.exercise.notes) ||
                     (step && step.notes) ||
                     (noteTextEl && noteTextEl.textContent) || '';

    if (!fullNote || !fullNote.trim()) return;

    let exName = 'Esercizio';
    if (step && step.exercise) {
      exName = step.exercise.is_standard
        ? ((window.t && window.t(`exercises.${step.exercise.name}`, { defaultValue: step.exercise.name })) || step.exercise.name)
        : (step.exercise.name || 'Esercizio');
    } else {
      const exNameEl = document.getElementById('playerExerciseName');
      if (exNameEl && exNameEl.textContent) {
        exName = exNameEl.textContent;
      }
    }

    const titleEl = document.getElementById('playerNoteDialogExerciseName');
    const dialogTextEl = document.getElementById('playerNoteDialogText');
    if (titleEl) titleEl.textContent = exName;
    if (dialogTextEl) dialogTextEl.textContent = fullNote.trim();

    if (window.Material3 && typeof window.Material3.openDialog === 'function') {
      window.Material3.openDialog('playerNoteDialog');
    } else {
      const dlg = document.getElementById('playerNoteDialog');
      if (dlg) {
        dlg.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    }
  }

  closeExerciseNoteModal() {
    if (window.Material3 && typeof window.Material3.closeDialog === 'function') {
      window.Material3.closeDialog('playerNoteDialog');
    } else {
      const dlg = document.getElementById('playerNoteDialog');
      if (dlg) {
        dlg.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  }

  initEvents() {
    document.addEventListener('click', (e) => {
      // Re-request wake lock on any user interaction if it was lost
      if (this.isWorkoutActive && (!this.wakeLock || this.wakeLock.released)) {
        this.requestWakeLock();
      }

      if (e.target.closest('#playerCloseBtn')) {
        this.isWorkoutActive = false;
        this.stopTimer();
        this.releaseWakeLock();
        if (window.Turbo) {
          window.Turbo.visit('/');
        } else {
          window.location.href = '/';
        }
      }

      if (e.target.closest('#playerPauseBtn')) {
        this.togglePause();
      }

      if (e.target.closest('#playerPrevBtn') || e.target.closest('#playerBackBtn')) {
        this.prevStep();
      }

      if (e.target.closest('#playerNextBtn')) {
        this.nextStep();
      }

      if (e.target.closest('#finishReturnBtn')) {
        this.isWorkoutActive = false;
        this.releaseWakeLock();
        if (window.Turbo) {
          window.Turbo.visit('/');
        } else {
          window.location.href = '/';
        }
      }

      if (e.target.closest('#playerExerciseNote')) {
        this.openExerciseNoteModal();
      }

      if (e.target.closest('#playerNoteDialogCloseBtn') || e.target.closest('#playerNoteDialogDismissBtn')) {
        this.closeExerciseNoteModal();
      }
    });

    // Auto-reacquire wake lock when tab returns to foreground
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isWorkoutActive) {
        this.requestWakeLock();
      }
    });

    window.addEventListener('pagehide', () => {
      this.releaseWakeLock();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.id === 'playerExerciseNote') {
        e.preventDefault();
        this.openExerciseNoteModal();
      }
    });

    window.addEventListener('resize', () => {
      if (this.mannequin) this.mannequin.resize();
      if (this.previewMannequin) this.previewMannequin.resize();
    });
  }
}

  window.player = new PlayerController();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.player.init();
    });
  } else {
    window.player.init();
  }
  document.addEventListener('turbo:load', () => {
    window.player.init();
  });
})();
