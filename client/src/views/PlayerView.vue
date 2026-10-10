<template>
  <div class="player-screen" :class="{ 'is-rest-phase': isRestPhase }">
    <!-- Top Bar -->
    <header class="player-top-bar">
      <div>
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--md-sys-color-on-surface-variant); text-transform: uppercase; letter-spacing: 0.5px;">
          {{ t('player.step_counter', { current: currentExerciseNumber, total: totalExercisesCount, defaultValue: `Passaggio ${currentExerciseNumber} di ${totalExercisesCount}` }) }}
        </div>
        <div style="font-size: 1.15rem; font-weight: 800; color: var(--md-sys-color-on-surface);">
          {{ currentStepInfo.groupTitle }} (Giro {{ currentStepInfo.currentRound }}/{{ currentStepInfo.totalRounds }})
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button
          type="button"
          class="md-btn md-btn-tonal"
          style="height: 38px; padding: 0 0.75rem;"
          :title="t('player.test_beep', { defaultValue: 'Prova Beep' })"
          :aria-label="t('player.test_beep', { defaultValue: 'Prova Beep' })"
          @click="playTestBeep"
        >
          <span class="material-symbols-rounded" style="font-size: 20px;">notifications</span>
        </button>
        <router-link to="/" class="md-btn md-btn-danger" style="height: 38px; padding: 0 1rem; text-decoration: none;">
          <span class="material-symbols-rounded" style="font-size: 18px;">close</span>
          <span>{{ t('player.exit') }}</span>
        </router-link>
      </div>
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
              <MannequinPreview :keyframes="nextStep.exercise?.keyframes" :equipment="nextStep.exercise?.equipment" :duration="0.8" />
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
          <span 
            class="md-badge" 
            :class="isRestPhase ? 'md-badge-tertiary' : getCategoryBadgeClass(currentStep?.exercise?.category)" 
            style="margin-bottom: 0.5rem;"
          >
            {{ isRestPhase ? 'Recupero / Riposo' : getCategoryName(currentStep?.exercise?.category || 'Cardio') }}
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

          <div 
            v-if="currentPlanNote" 
            class="player-exercise-note player-exercise-note--plan" 
            role="button" 
            tabindex="0" 
            :title="t('player.plan_note_label', { defaultValue: 'Nota Scheda' })"
            @click="showNoteModal = true"
          >
            <span class="material-symbols-rounded" style="font-size: 16px; color: var(--md-sys-color-primary); flex-shrink: 0;">bookmark</span>
            <span class="player-exercise-note-text">{{ currentPlanNote }}</span>
          </div>
        </div>

        <div class="player-timer-group">
          <div v-if="finishAtLabel" class="player-finish-at">
            <span class="material-symbols-rounded" style="font-size: 16px;">schedule</span>
            <span>{{ t('player.finish_at', { time: finishAtLabel, defaultValue: `Finisce alle ${finishAtLabel}` }) }}</span>
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
    <div v-if="isWorkoutCompleted" class="workout-finished-overlay active">
      <span class="material-symbols-rounded" style="font-size: 5rem; color: var(--md-sys-color-primary); margin-bottom: 1rem; animation: bounce 1s infinite alternate;">emoji_events</span>
      <h1 style="font-size: 2.2rem; font-weight: 900; margin-bottom: 0.5rem;">{{ t('player.workout_completed', { defaultValue: 'Allenamento Completato!' }) }}</h1>
      <p style="font-size: 1.1rem; color: var(--md-sys-color-on-surface-variant); max-width: 480px; margin-bottom: 1.5rem;">
        {{ t('player.great_job', { defaultValue: 'Ottimo lavoro! Hai completato la scheda HIIT.' }) }}
      </p>
      <div v-if="statsSaveMessage" style="font-size: 0.95rem; color: #81c784; font-weight: 700; margin-bottom: 1.75rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span class="material-symbols-rounded" style="font-size: 18px;">check_circle</span>
        <span>{{ statsSaveMessage }}</span>
      </div>
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
        <div v-if="currentPlanNote" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--md-sys-color-outline-variant);">
          <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; font-size: 0.78rem; color: var(--md-sys-color-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.35rem;">
            <span class="material-symbols-rounded" style="font-size: 16px;">bookmark</span>
            <span>{{ t('player.plan_note_label', { defaultValue: 'Nota Scheda' }) }}</span>
          </div>
          <p style="font-size: 0.95rem; line-height: 1.6; color: var(--md-sys-color-on-surface); margin: 0; white-space: pre-line;">
            {{ currentPlanNote }}
          </p>
        </div>
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
import { setAutoReloadBlocked } from '../services/appUpdate.js';
import { useI18n } from '../composables/useI18n.js';
import { useSnackbar } from '../composables/useSnackbar.js';
import { useAuth } from '../composables/useAuth.js';
import { useCategories } from '../composables/useCategories.js';
import { Mannequin, BASE_POSES } from '../mannequin/mannequin.js';
import ModalDialog from '../components/ui/ModalDialog.vue';
import MannequinPreview from '../components/mannequin/MannequinPreview.vue';

const route = useRoute();
const router = useRouter();

const { t } = useI18n();
const { showSnackbar } = useSnackbar();
const { currentUser } = useAuth();
const { getCategoryName, getCategoryBadgeClass } = useCategories();

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

const hasPingedWakeup = ref(false);
const isStatsSaved = ref(false);
const statsSaveMessage = ref('');
const hasLoggedStart = ref(false);
const hasLoggedEnd = ref(false);
const currentPlanName = ref('');

const currentStep = computed(() => queue.value[currentIndex.value] || null);
const nextStep = computed(() => queue.value[currentIndex.value + 1] || null);

const isRestPhase = computed(() => currentStep.value?.isRest === true);
const isDurationMode = computed(() => isRestPhase.value || currentStep.value?.type === 'duration');

const totalExercisesCount = computed(() => {
  return queue.value.filter(s => !s.isRest).length;
});

const currentExerciseNumber = computed(() => {
  if (queue.value.length === 0) return 0;
  let count = 0;
  for (let i = 0; i <= currentIndex.value && i < queue.value.length; i++) {
    if (!queue.value[i].isRest) {
      count++;
    }
  }
  return Math.max(1, count);
});

const currentNote = computed(() => {
  if (isRestPhase.value) {
    return t('player.rest_note', { defaultValue: 'Respira e sciogli i muscoli' });
  }
  return currentStep.value?.exercise?.notes || '';
});

// Plan-specific note for the current exercise (stored in the plan structure JSON).
// Only meaningful during the exercise phase, not during recovery.
const currentPlanNote = computed(() => {
  if (isRestPhase.value) return '';
  return currentStep.value?.note || '';
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
  const fraction = Math.max(0, Math.min(1, secondsRemaining.value / totalStepDuration.value));
  return circumference * (1 - fraction);
});

// Estimated wall-clock finish time. Recomputed on every tick (secondsRemaining)
// and on every skip (currentIndex), matching the remaining-time estimate.
const finishAt = computed(() => {
  if (isWorkoutCompleted.value) return null;
  const remaining = getEstimatedRemainingSeconds();
  if (remaining <= 0) return null;
  return new Date(Date.now() + remaining * 1000);
});

const finishAtLabel = computed(() => {
  const d = finishAt.value;
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
          note: item.note || '',
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
            note: item.note || '',
            isRest: true
          });
        }
      });
    }
  });

  // Se l'ultimissimo step è una pausa/recupero, rimuovila e termina direttamente il workout
  while (q.length > 0 && q[q.length - 1].isRest) {
    q.pop();
  }

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
    onion: false,
    loop: true
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
  document.title = `${localizedName} (${currentExerciseNumber.value}/${totalExercisesCount.value}) - Pulse HIIT 3D`;

  if (step.isRest) {
    // Rest Phase: display resting pose on main mannequin
    if (mannequin) {
      mannequin.setEquipment([]);
      mannequin.stop();
      mannequin.applyBase('stand');
    }
    secondsRemaining.value = step.target;
    totalStepDuration.value = step.target;
    startTimer();
  } else {
    // Work Phase: animate mannequin
    const kf = step.exercise?.keyframes;
    const eq = step.exercise?.equipment;
    const parsedEq = typeof eq === 'string' ? JSON.parse(eq) : (eq || []);
    if (mannequin) {
      mannequin.setEquipment(parsedEq);
    }
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

function getEstimatedRemainingSeconds() {
  if (currentIndex.value >= queue.value.length) return 0;
  let remaining = 0;
  if (isDurationMode.value) {
    remaining += Math.max(0, secondsRemaining.value);
  } else {
    remaining += Math.max(0, (currentStep.value?.target || 15) * 2);
  }
  for (let i = currentIndex.value + 1; i < queue.value.length; i++) {
    const s = queue.value[i];
    if (s.isRest || s.type === 'duration') {
      remaining += (s.target || 0);
    } else {
      remaining += (s.target || 15) * 2;
    }
  }
  return remaining;
}

function checkWakeupPing() {
  if (hasPingedWakeup.value) return;
  const rem = getEstimatedRemainingSeconds();
  // Ping server when ~1 minute (<= 65 seconds) remains before workout ends
  if (rem <= 65) {
    hasPingedWakeup.value = true;
    api.ping();
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (isPaused.value) return;
    secondsRemaining.value--;

    checkWakeupPing();

    if (secondsRemaining.value === 10) {
      audio.playTenSecondsWarning();
    }

    if (secondsRemaining.value <= 3 && secondsRemaining.value > 0) {
      audio.playCountdownBeep();
    }

    if (secondsRemaining.value <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      if (currentIndex.value < queue.value.length - 1) {
        audio.playStepTransitionBeep();
      }
      nextStepOrFinish();
    }
  }, 1000);
}

function playTestBeep() {
  audio.unlock();
  audio.playCountdownBeep();
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
  checkWakeupPing();
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

  // Log completion of the plan (works for logged-in users and anonymous/direct-link visitors)
  if (!hasLoggedEnd.value && plan.value && plan.value.name) {
    hasLoggedEnd.value = true;
    currentPlanName.value = plan.value.name;
    api.recordPlanEvent('ENDPLAN', plan.value.name);
  }

  // Save workout statistics for logged-in user (+1 workout, +N minutes)
  if (currentUser.value && !isStatsSaved.value) {
    isStatsSaved.value = true;
    let totalPlannedSec = 0;
    queue.value.forEach(s => {
      totalPlannedSec += (s.isRest || s.type === 'duration') ? (s.target || 0) : ((s.target || 15) * 2);
    });
    const minutes = Math.max(1, Math.round(totalPlannedSec / 60));

    api.recordWorkoutCompletion(minutes).then(res => {
      if (res && res.success) {
        statsSaveMessage.value = t('player.stats_saved', {
          minutes,
          defaultValue: `Allenamento registrato! (+${minutes} min)`
        });
      }
    }).catch(err => {
      console.warn('[Player] Error recording workout completion:', err);
    });
  }
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

// Fallback: if the user leaves the player before the plan finished loading, still
// record the STARTPLAN event so short sessions are not lost.
function handlePageHide() {
  wakeLock.release();
  if (!hasLoggedStart.value && !isWorkoutCompleted.value) {
    const fallbackName = currentPlanName.value || `Scheda #${route.query.planId || 'diretta'}`;
    hasLoggedStart.value = true;
    api.recordPlanEvent('STARTPLAN', fallbackName);
  }
}

onMounted(async () => {
  // Never auto-reload the app while a workout is running.
  setAutoReloadBlocked(true);
  wakeLock.request();
  audio.unlock();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('click', handleUserInteraction);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('beforeunload', handlePageHide);
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
    // Log the start of the plan right when it is resolved (works for direct links too).
    // If the plan name was not available yet, the fallback handler already logged the start.
    if (!hasLoggedStart.value && plan.value.name) {
      hasLoggedStart.value = true;
      currentPlanName.value = plan.value.name;
      api.recordPlanEvent('STARTPLAN', plan.value.name);
    }

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
  setAutoReloadBlocked(false);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('click', handleUserInteraction);
  window.removeEventListener('pagehide', handlePageHide);
  window.removeEventListener('beforeunload', handlePageHide);
  if (!hasLoggedStart.value) {
    handlePageHide();
  }
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

.workout-finished-overlay.active {
  display: flex !important;
}
</style>
