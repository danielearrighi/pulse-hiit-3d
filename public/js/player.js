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
      this.timerInterval = null;
      this.secondsRemaining = 0;
      this.totalStepDuration = 0;
      this.isPaused = false;
      this.audioCtx = null;
      this.eventsInitialized = false;
    }

  async init() {
    const canvas = document.getElementById('playerCanvas');
    if (!canvas) return;

    this.stopTimer();
    if (this.mannequin) {
      this.mannequin.stop();
      this.mannequin.destroy();
      this.mannequin = null;
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
        if (this.mannequin) {
          this.mannequin.stop();
          this.mannequin.destroy();
          this.mannequin = null;
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

  initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.audioCtx = new AudioContext();
    }
  }

  playBeep(freq = 600, duration = 0.15) {
    try {
      if (!this.audioCtx) this.initAudio();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
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
          const ex = this.exercises.find(e => e.id === item.exerciseId || e.id === item.exercise_id) || {
            name: item.name || 'Esercizio',
            category: item.category || 'Cardio'
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
    this.currentIndex = 0;
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

    // Update Exercise Info
    const exNameEl = document.getElementById('playerExerciseName');
    const badgeEl = document.getElementById('playerCategoryBadge');
    const localizedName = step.exercise.is_standard
      ? ((window.t && window.t(`exercises.${step.exercise.name}`, { defaultValue: step.exercise.name })) || step.exercise.name)
      : step.exercise.name;
    const localizedCategory = (window.t && window.t(`categories.${step.exercise.category}`, { defaultValue: step.exercise.category || 'Cardio' })) || step.exercise.category || 'Cardio';

    exNameEl.textContent = localizedName;
    badgeEl.textContent = localizedCategory;
    badgeEl.className = `md-badge ${step.isRest ? 'md-badge-tertiary' : 'md-badge-primary'}`;

    // Update Exercise Note
    const noteBox = document.getElementById('playerExerciseNote');
    const noteText = document.getElementById('playerExerciseNoteText');
    if (noteBox && noteText) {
      if (!step.isRest && step.exercise.notes && step.exercise.notes.trim()) {
        noteText.textContent = step.exercise.notes.trim();
        noteBox.style.display = 'inline-flex';
      } else {
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

      if (this.secondsRemaining <= 3 && this.secondsRemaining > 0) {
        this.playBeep(440, 0.12);
      }

      if (this.secondsRemaining <= 0) {
        this.playBeep(880, 0.35);
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
    } else {
      pauseBtn.innerHTML = `<span class="material-symbols-rounded">pause</span> ${t('player.pause') || 'Pausa'}`;
      if (this.mannequin) this.mannequin.play();
    }
  }

  nextStep() {
    this.stopTimer();
    this.loadStep(this.currentIndex + 1);
  }

  finishWorkout() {
    this.stopTimer();
    if (this.mannequin) this.mannequin.stop();

    const overlay = document.getElementById('workoutFinishedOverlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  initEvents() {
    document.getElementById('playerCloseBtn')?.addEventListener('click', () => {
      this.stopTimer();
      if (window.Turbo) {
        window.Turbo.visit('/');
      } else {
        window.location.href = '/';
      }
    });

    document.getElementById('playerPauseBtn')?.addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('playerNextBtn')?.addEventListener('click', () => {
      this.nextStep();
    });

    document.getElementById('finishReturnBtn')?.addEventListener('click', () => {
      if (window.Turbo) {
        window.Turbo.visit('/');
      } else {
        window.location.href = '/';
      }
    });

    window.addEventListener('resize', () => {
      if (this.mannequin) this.mannequin.resize();
    });
  }
}

  window.player = new PlayerController();
  document.addEventListener('DOMContentLoaded', () => {
    window.player.init();
  });
  document.addEventListener('turbo:load', () => {
    window.player.init();
  });
})();
