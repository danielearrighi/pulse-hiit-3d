/**
 * HIIT Workout Execution Player with Real-time 3D Mannequin & Audio Cues
 */

class WorkoutPlayer {
  constructor(appInstance) {
    this.app = appInstance;
    this.modal = document.getElementById('workoutPlayerModal');
    this.canvas = document.getElementById('playerCanvas');

    this.mannequin = null;
    this.plan = null;
    this.queue = []; // Array of flattened workout step objects
    this.currentIndex = 0;

    // Timer state
    this.timerInterval = null;
    this.secondsRemaining = 0;
    this.totalStepDuration = 0;
    this.isPaused = false;

    // Audio synth
    this.audioCtx = null;

    this.initEvents();
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBeep(freq = 600, duration = 0.15) {
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  initEvents() {
    document.getElementById('playerCloseBtn').addEventListener('click', () => this.stopWorkout());
    document.getElementById('playerPauseBtn').addEventListener('click', () => this.togglePause());
    document.getElementById('playerNextBtn').addEventListener('click', () => this.nextStep());
  }

  startWorkout(plan, exercisesMap) {
    this.plan = plan;
    this.buildWorkoutQueue(exercisesMap);

    if (this.queue.length === 0) {
      alert('This plan has no executable steps.');
      return;
    }

    this.initAudio();
    this.currentIndex = 0;
    this.isPaused = false;
    this.modal.classList.add('active');

    // Initialize 3D mannequin canvas if not already
    if (!this.mannequin) {
      this.mannequin = new Mannequin(this.canvas);
    }

    this.loadStep(0);
  }

  buildWorkoutQueue(exercisesMap) {
    this.queue = [];
    const groups = this.plan.structure.groups || [];

    groups.forEach((group, gIdx) => {
      const rounds = group.repetitions || 1;
      for (let r = 1; r <= rounds; r++) {
        group.items.forEach((item, iIdx) => {
          const exDetail = exercisesMap[item.exercise_id] || {
            name: 'Exercise',
            category: 'Cardio',
            keyframes: []
          };

          // Main Exercise Step
          this.queue.push({
            isRest: false,
            groupTitle: group.title,
            roundCurrent: r,
            roundTotal: rounds,
            exerciseName: exDetail.name,
            category: exDetail.category,
            keyframes: exDetail.keyframes,
            type: item.type, // 'reps' or 'duration'
            targetValue: item.target_value
          });

          // Rest Step if rest_seconds > 0
          if (item.rest_seconds && item.rest_seconds > 0) {
            const restEx = exercisesMap['std-pause'] || { keyframes: [] };
            this.queue.push({
              isRest: true,
              groupTitle: group.title,
              roundCurrent: r,
              roundTotal: rounds,
              exerciseName: `Rest / Recovery`,
              category: 'Rest',
              keyframes: restEx.keyframes,
              type: 'duration',
              targetValue: item.rest_seconds
            });
          }
        });
      }
    });
  }

  loadStep(index) {
    if (index >= this.queue.length) {
      this.finishWorkout();
      return;
    }

    this.currentIndex = index;
    const step = this.queue[index];

    // Play start audio beep
    this.playBeep(800, 0.2);

    // Update UI text
    document.getElementById('playerStepCounter').innerText = `Step ${index + 1} of ${this.queue.length}`;
    document.getElementById('playerGroupTitle').innerText = `${step.groupTitle} (Round ${step.roundCurrent}/${step.roundTotal})`;
    document.getElementById('playerExerciseName').innerText = step.exerciseName;

    const badgeEl = document.getElementById('playerCategoryBadge');
    badgeEl.innerText = step.category;
    badgeEl.className = `badge badge-${(step.category || '').toLowerCase().replace(/\s+/g, '')}`;

    // Update 3D mannequin
    if (step.keyframes && step.keyframes.length > 0) {
      this.mannequin.setKeyframes(step.keyframes);
      this.mannequin.playAnimation();
    } else {
      this.mannequin.stopAnimation();
    }

    // Toggle Reps vs Timer View
    const ringContainer = document.getElementById('timerRingContainer');
    const repsContainer = document.getElementById('repsDisplayContainer');
    const nextBtn = document.getElementById('playerNextBtn');

    if (this.timerInterval) clearInterval(this.timerInterval);

    if (step.type === 'duration') {
      ringContainer.style.display = 'flex';
      repsContainer.style.display = 'none';

      // Duration auto-countdown mode
      this.secondsRemaining = step.targetValue;
      this.totalStepDuration = step.targetValue;

      this.updateTimerDisplay();
      nextBtn.innerText = 'Skip Step ➔';

      this.startCountdown();
    } else {
      // Repetitions mode with manual "Next" button
      ringContainer.style.display = 'none';
      repsContainer.style.display = 'block';

      document.getElementById('playerRepsCount').innerText = `${step.targetValue} REPS`;
      nextBtn.innerText = 'NEXT EXERCISE ➔';
    }
  }

  startCountdown() {
    this.timerInterval = setInterval(() => {
      if (this.isPaused) return;

      this.secondsRemaining--;
      this.updateTimerDisplay();

      if (this.secondsRemaining <= 3 && this.secondsRemaining > 0) {
        this.playBeep(440, 0.1);
      }

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.playBeep(1200, 0.4);
        this.nextStep();
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const timerNumEl = document.getElementById('playerTimerNumber');
    const circleEl = document.getElementById('timerRingCircle');

    if (timerNumEl) {
      timerNumEl.innerText = this.secondsRemaining;
    }

    if (circleEl && this.totalStepDuration > 0) {
      const circumference = 690;
      const progress = (this.totalStepDuration - this.secondsRemaining) / this.totalStepDuration;
      const offset = circumference * (1 - progress);
      circleEl.style.strokeDashoffset = offset;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById('playerPauseBtn');

    if (this.isPaused) {
      pauseBtn.innerText = '▶ Resume';
      if (this.mannequin) this.mannequin.stopAnimation();
    } else {
      pauseBtn.innerText = '⏸ Pause';
      if (this.mannequin) this.mannequin.playAnimation();
    }
  }

  nextStep() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.loadStep(this.currentIndex + 1);
  }

  finishWorkout() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.playBeep(1500, 0.6);
    alert('🎉 CONGRATULATIONS! Workout Completed!');
    this.stopWorkout();
  }

  stopWorkout() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.mannequin) this.mannequin.stopAnimation();
    this.modal.classList.remove('active');
  }
}

window.WorkoutPlayer = WorkoutPlayer;
