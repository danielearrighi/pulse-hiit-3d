<template>
  <div class="player-screen" :class="{ 'is-rest-phase': isRestPhase }">
    <!-- Top Bar -->
    <header class="player-top-bar">
      <div>
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--md-sys-color-on-surface-variant); text-transform: uppercase; letter-spacing: 0.5px;">
          Passaggio {{ currentIndex + 1 }} di {{ queue.length }}
        </div>
        <div style="font-size: 1.15rem; font-weight: 800; color: var(--md-sys-color-on-surface);">
          {{ currentStepInfo.groupTitle }} (Giro {{ currentStepInfo.currentRound }}/{{ currentStepInfo.totalRounds }})
        </div>
      </div>
      <router-link to="/" class="md-btn md-btn-danger" style="height: 38px; padding: 0 1rem; text-decoration: none;">
        <span class="material-symbols-rounded" style="font-size: 18px;">close</span>
        <span>{{ t('player.exit') }}</span>
      </router-link>
    </header>

    <!-- Main Workout Area -->
    <main class="player-main-area">
      <!-- 3D Mannequin Viewport -->
      <div class="player-canvas-container">
        <canvas ref="playerCanvasRef" style="width: 100%; height: 100%; display: block;"></canvas>

        <!-- Next Exercise Preview Overlay (during recovery) -->
        <div v-if="isRestPhase && nextStep" class="player-next-preview" aria-live="polite">
          <div class="player-next-preview-card">
            <div class="player-next-preview-canvas-wrap">
              <MannequinPreview :keyframes="nextStep.exercise?.keyframes" :duration="0.8" />
            </div>
            <div class="player-next-preview-info">
              <div class="player-next-preview-badge">
                <span class="material-symbols-rounded">skip_next</span>
                <span>{{ t('player.next_up', { defaultValue: 'Prossimo' }) }}</span>
              </div>
              <div class="player-next-preview-name">{{ getStepDisplayName(nextStep) }}</div>
              <div class="player-next-preview-target">
                {{ nextStep.type === 'reps' ? `${nextStep.target} Ripetizioni` : `${nextStep.target} Secondi` }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls & Timer Wrap -->
      <div class="player-info-container">
        <div class="player-exercise-header">
          <span class="md-badge" :class="isRestPhase ? 'md-badge-tertiary' : 'md-badge-primary'" style="margin-bottom: 0.5rem;">
            {{ isRestPhase ? 'Recupero / Riposo' : (currentStep?.exercise?.category || 'Cardio') }}
          </span>
          <h2 class="player-exercise-name">
            {{ isRestPhase ? 'Pausa di Recupero' : getStepDisplayName(currentStep) }}
          </h2>

          <div 
            v-if="currentNote" 
            class="player-exercise-note" 
            role="button" 
            tabindex="0" 
            :title="t('player.notes_dialog_title', { defaultValue: 'Nota Esercizio' })"
            @click="showNoteModal = true"
          >
            <span class="material-symbols-rounded" style="font-size: 16px; color: var(--md-sys-color-primary); flex-shrink: 0;">{{ isRestPhase ? 'self_improvement' : 'sticky_note_2' }}</span>
            <span class="player-exercise-note-text">{{ currentNote }}</span>
            <span class="material-symbols-rounded" style="font-size: 15px; color: var(--md-sys-color-on-surface-variant); flex-shrink: 0; margin-left: 0.15rem;">info</span>
          </div>
        </div>

        <!-- Duration Countdown Ring -->
        <div v-if="isDurationMode" class="timer-ring-wrap" id="timerRingWrap">
          <svg class="timer-ring-svg" viewBox="0 0 240 240">
            <circle class="timer-ring-bg" cx="120" cy="120" r="110" />
            <circle 
              class="timer-ring-progress" 
              cx="120" 
              cy="120" 
              r="110" 
              :style="{ strokeDashoffset: ringDashOffset, stroke: isRestPhase ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)' }"
            />
          </svg>
          <div class="timer-number-display" :style="{ color: isRestPhase ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)' }">
            {{ secondsRemaining }}
          </div>
        </div>

        <!-- Repetition Target Display Mode -->
        <div v-else class="reps-display-wrap">
          <div class="reps-target-label">{{ t('player.target_goal', { defaultValue: 'Obiettivo Ripetizioni' }) }}</div>
          <div class="reps-number-display">{{ currentStep?.target }} RIPETIZIONI</div>
        </div>

        <!-- Action Control Buttons -->
        <div class="player-bottom-controls">
          <button type="button" class="md-btn md-btn-tonal btn-player-pause" @click="togglePause">
            <span class="material-symbols-rounded">{{ isPaused ? 'play_arrow' : 'pause' }}</span>
            <span>{{ isPaused ? 'Riprendi' : t('player.pause') }}</span>
          </button>

          <div class="player-nav-btn-group" role="group">
            <button 
              type="button" 
              class="md-btn md-btn-filled btn-player-prev" 
              :disabled="currentIndex === 0"
              title="Indietro" 
              @click="prevStep"
            >
              <span class="material-symbols-rounded filled">skip_previous</span>
            </button>
            <button 
              type="button" 
              class="md-btn md-btn-filled btn-player-next" 
              @click="nextStepOrFinish"
            >
              <span class="material-symbols-rounded filled">skip_next</span>
              <span>{{ t('player.next') }}</span>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Workout Finished Celebration Overlay -->
    <div v-if="isWorkoutCompleted" class="workout-finished-overlay">
      <span class="material-symbols-rounded" style="font-size: 5rem; color: var(--md-sys-color-primary); margin-bottom: 1rem; animation: bounce 1s infinite alternate;">emoji_events</span>
      <h1 style="font-size: 2.2rem; font-weight: 900; margin-bottom: 0.5rem;">{{ t('player.workout_completed') }}</h1>
      <p style="font-size: 1.1rem; color: var(--md-sys-color-on-surface-variant); max-width: 480px; margin-bottom: 2rem;">
        {{ t('player.great_job') }}
      </p>
      <router-link to="/" class="md-btn md-btn-filled" style="height: 52px; padding: 0 2rem; font-size: 1rem; text-decoration: none;">
        <span class="material-symbols-rounded">home</span>
        <span>Torna alla Dashboard</span>
      </router-link>
    </div>

    <!-- Exercise Note Modal Dialog -->
    <ModalDialog v-model="showNoteModal" :title="t('player.notes_dialog_title', { defaultValue: 'Nota Esercizio' })">
      <div v-if="currentStep">
        <h4 style="font-size: 1.15rem; font-weight: 700; margin: 0 0 0.75rem 0; color: var(--md-sys-color-primary);">
          {{ isRestPhase ? t('player.rest_title', { defaultValue: 'Recupero' }) : getStepDisplayName(currentStep) }}
        </h4>
        <p style="font-size: 0.95rem; line-height: 1.6; color: var(--md-sys-color-on-surface); margin: 0; white-space: pre-line;">
          {{ currentNote }}
        </p>
      </div>
      <template #actions>
        <button type="button" class="md-btn md-btn-filled" @click="showNoteModal = false">{{ t('player.notes_dialog_close', { defaultValue: 'Chiudi' }) }}</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api.js';
import { audio } from '../services/audio.js';
import { wakeLock } from '../services/wakeLock.js';
import { useI18n } from '../composables/useI18n.js';
import { useSnackbar } from '../composables/useSnackbar.js';
import { Mannequin, BASE_POSES } from '../mannequin/mannequin.js';
import ModalDialog from '../components/ui/ModalDialog.vue';
import MannequinPreview from '../components/mannequin/MannequinPreview.vue';

const route = useRoute();
const router = useRouter();

const { t } = useI18n();
const { showSnackbar } = useSnackbar();

const playerCanvasRef = ref(null);
let mannequin = null;

const plan = ref(null);
const queue = ref([]);
const currentIndex = ref(0);

const isPaused = ref(false);
const secondsRemaining = ref(0);
const totalStepDuration = ref(0);
let timerInterval = null;

const isWorkoutCompleted = ref(false);
const showNoteModal = ref(false);

const currentStep = computed(() => queue.value[currentIndex.value] || null);
const nextStep = computed(() => queue.value[currentIndex.value + 1] || null);

const isRestPhase = computed(() => currentStep.value?.isRest === true);
const isDurationMode = computed(() => isRestPhase.value || currentStep.value?.type === 'duration');

const currentNote = computed(() => {
  if (isRestPhase.value) {
    return t('player.rest_note', { defaultValue: 'Respira e sciogli i muscoli' });
  }
  return currentStep.value?.exercise?.notes || '';
});

const currentStepInfo = computed(() => {
  if (!currentStep.value) return { groupTitle: 'Circuito', currentRound: 1, totalRounds: 1 };
  return {
    groupTitle: currentStep.value.groupTitle || 'Circuito',
    currentRound: currentStep.value.round || 1,
    totalRounds: currentStep.value.totalRounds || 1
  };
});

const ringDashOffset = computed(() => {
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  if (!totalStepDuration.value || totalStepDuration.value <= 0) return 0;
  const progress = (totalStepDuration.value - secondsRemaining.value) / totalStepDuration.value;
  return circumference * (1 - progress);
});

function getStepDisplayName(step) {
  if (!step || !step.exercise) return 'Esercizio';
  const ex = step.exercise;
  if (ex.is_standard) {
    const tr = t(`exercises.${ex.name}`);
    if (tr && tr !== `exercises.${ex.name}`) return tr;
  }
  return ex.name;
}

function buildQueue(planData, exercisesList) {
  const q = [];
  const groups = (planData.structure && planData.structure.groups) || [];

  groups.forEach((g, gIdx) => {
    const rounds = Math.max(1, parseInt(g.repetitions, 10) || 1);
    const groupTitle = g.title || `Circuito ${gIdx + 1}`;

    for (let r = 1; r <= rounds; r++) {
      (g.items || []).forEach(item => {
        const exId = item.exercise_id || item.exerciseId;
        const ex = exercisesList.find(e => e.id === exId) || {
          id: exId,
          name: item.name || 'Esercizio',
          category: item.category || 'Cardio'
        };

        const target = item.target !== undefined ? item.target : (item.target_value !== undefined ? item.target_value : (item.type === 'reps' ? 15 : 40));
        const restAfter = item.restAfter !== undefined ? item.restAfter : (item.rest_seconds !== undefined ? item.rest_seconds : 20);

        // Work step
        q.push({
          groupTitle,
          round: r,
          totalRounds: rounds,
          exercise: ex,
          type: item.type || 'duration',
          target: Math.max(1, parseInt(target, 10) || 1),
          isRest: false
        });

        // Rest step
        if (restAfter > 0) {
          q.push({
            groupTitle,
            round: r,
            totalRounds: rounds,
            exercise: ex,
            type: 'duration',
            target: Math.max(1, parseInt(restAfter, 10) || 1),
            isRest: true
          });
        }
      });
    }
  });

  return q;
}

function initMannequin() {
  if (!playerCanvasRef.value) return;
  if (mannequin) {
    mannequin.destroy();
    mannequin = null;
  }

  mannequin = new Mannequin(playerCanvasRef.value, {
    enableAnchors: false,
    isEditor: false,
    symmetry: false,
    lockFeet: true,
    onion: false
  });
}

function executeCurrentStep() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  const step = currentStep.value;
  if (!step) {
    finishWorkout();
    return;
  }

  const localizedName = getStepDisplayName(step);
  document.title = `${localizedName} (${currentIndex.value + 1}/${queue.value.length}) - Pulse HIIT 3D`;

  if (step.isRest) {
    // Rest Phase: display resting pose on main mannequin
    if (mannequin) {
      mannequin.stop();
      mannequin.applyBase('stand');
    }
    secondsRemaining.value = step.target;
    totalStepDuration.value = step.target;
    startTimer();
  } else {
    // Work Phase: animate mannequin
    const kf = step.exercise?.keyframes;
    if (mannequin && kf) {
      const parsed = typeof kf === 'string' ? JSON.parse(kf) : kf;
      if (Array.isArray(parsed) && parsed.length > 0) {
        mannequin.setKeyframes(parsed, step.exercise.duration || 0.8);
        mannequin.play();
      } else {
        mannequin.stop();
        mannequin.applyBase('stand');
      }
    }

    if (step.type === 'duration') {
      secondsRemaining.value = step.target;
      totalStepDuration.value = step.target;
      startTimer();
    } else {
      // Reps mode: no countdown timer
      secondsRemaining.value = 0;
      totalStepDuration.value = 0;
    }
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (isPaused.value) return;
    secondsRemaining.value--;

    if (secondsRemaining.value === 10) {
      audio.playTenSecondsWarning();
    }

    if (secondsRemaining.value <= 3 && secondsRemaining.value > 0) {
      audio.playCountdownBeep();
    }

    if (secondsRemaining.value <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      audio.playStepTransitionBeep();
      nextStepOrFinish();
    }
  }, 1000);
}

function togglePause() {
  isPaused.value = !isPaused.value;
  if (mannequin) {
    if (isPaused.value) {
      mannequin.stop();
    } else if (!currentStep.value?.isRest) {
      mannequin.play();
    }
  }
}

function nextStepOrFinish() {
  if (currentIndex.value < queue.value.length - 1) {
    currentIndex.value++;
    executeCurrentStep();
  } else {
    finishWorkout();
  }
}

function prevStep() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    executeCurrentStep();
  }
}

function finishWorkout() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (mannequin) {
    mannequin.stop();
    mannequin.applyBase('stand');
  }
  isWorkoutCompleted.value = true;
  wakeLock.release();
  document.title = `${t('player.workout_completed')} - Pulse HIIT 3D`;
  audio.playFinishFanfare();
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && !isWorkoutCompleted.value) {
    wakeLock.request();
  }
}

function handleUserInteraction() {
  if (!isWorkoutCompleted.value && !wakeLock.isActive) {
    wakeLock.request();
  }
}

onMounted(async () => {
  wakeLock.request();
  audio.unlock();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('click', handleUserInteraction);
  window.addEventListener('pagehide', wakeLock.release);
  initMannequin();

  const planId = route.query.planId;
  const exercises = await api.getExercises();

  if (planId) {
    try {
      plan.value = await api.getPlanById(planId);
    } catch (e) {
      console.warn('Could not load plan by id, falling back to first plan');
    }
  }

  if (!plan.value) {
    const plans = await api.getPlans();
    if (plans && plans.length > 0) {
      plan.value = plans[0];
    }
  }

  if (plan.value) {
    queue.value = buildQueue(plan.value, exercises);
    if (queue.value.length > 0) {
      currentIndex.value = 0;
      executeCurrentStep();
    } else {
      showSnackbar('Scheda non valida o senza esercizi.');
      router.push('/');
    }
  } else {
    showSnackbar('Nessuna scheda HIIT selezionata.');
    router.push('/');
  }
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('click', handleUserInteraction);
  window.removeEventListener('pagehide', wakeLock.release);
  wakeLock.release();
  document.title = 'Pulse HIIT 3D';
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (mannequin) {
    mannequin.stop();
    mannequin.destroy();
    mannequin = null;
  }
});
</script>

<style scoped>
@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-12px); }
}
</style>
