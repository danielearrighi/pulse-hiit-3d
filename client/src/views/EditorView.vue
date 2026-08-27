<template>
  <main class="content-container">
    <div class="editor-header">
      <h1 class="editor-header__title">{{ isEditing ? 'Modifica Esercizio 3D' : t('editor.title') }}</h1>
      <p class="editor-header__subtitle">
        {{ t('editor.subtitle') }}
      </p>
    </div>

    <div class="editor-layout-grid">
      <!-- Left / Main: 3D Studio & Controls -->
      <div class="editor-studio-card" :class="{ 'fullscreen-mode': isFullscreen }">
        <!-- Top Controls Bar -->
        <div class="editor-top-controls-bar">
          <div class="editor-base-poses-group">
            <span class="editor-control-label">{{ t('editor.presets') }}</span>
            <select v-model="selectedBasePose" class="md-select editor-base-select" @change="applyBasePose">
              <option value="stand">{{ t('editor.standing') }}</option>
              <option value="supine">{{ t('editor.face_up') }}</option>
              <option value="prone">{{ t('editor.face_down') }}</option>
              <option value="side_right">{{ t('editor.side_right') }}</option>
              <option value="side_left">{{ t('editor.side_left') }}</option>
            </select>
          </div>

          <div class="md-segmented-button editor-history-segmented">
            <button 
              type="button" 
              class="md-segmented-button__btn" 
              :disabled="!canUndo" 
              :title="t('editor.undo')"
              @click="handleUndo"
            >
              <span class="material-symbols-rounded" style="font-size: 18px;">undo</span>
            </button>
            <button 
              type="button" 
              class="md-segmented-button__btn" 
              :disabled="!canRedo" 
              :title="t('editor.redo')"
              @click="handleRedo"
            >
              <span class="material-symbols-rounded" style="font-size: 18px;">redo</span>
            </button>
          </div>
        </div>

        <!-- 3D Canvas Viewport -->
        <div class="canvas-viewport-container" :class="{ 'is-fullscreen': isFullscreen }">
          <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>

          <!-- Top Right HUD -->
          <div class="canvas-hud-top-right">
            <button type="button" class="md-btn md-btn-tonal" style="height: 36px; padding: 0 0.75rem; font-size: 0.8rem;" @click="resetCamera">
              <span class="material-symbols-rounded" style="font-size: 18px;">videocam</span>
              <span>{{ t('editor.reset_view') }}</span>
            </button>
            <button type="button" class="md-btn md-btn-tonal" style="height: 36px; padding: 0 0.75rem; font-size: 0.8rem;" @click="toggleFullscreen">
              <span class="material-symbols-rounded" style="font-size: 18px;">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
              <span>{{ isFullscreen ? 'Riduci' : t('editor.fullscreen') }}</span>
            </button>
            <button type="button" class="md-btn-icon" style="background-color: var(--md-sys-color-surface-container); color: var(--md-sys-color-on-surface);" title="Guida Comandi" @click="showHelpModal = true">
              <span class="material-symbols-rounded">help</span>
            </button>
          </div>
        </div>

        <!-- Keyframes Sequence Strip -->
        <div style="margin-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--md-sys-color-on-surface);">{{ t('editor.sequence_label') }}</label>
            <span style="font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant);">Clicca su una posa per selezionarla</span>
          </div>

          <div class="keyframes-strip-container">
            <div 
              v-for="(kf, idx) in keyframes" 
              :key="idx" 
              class="keyframe-card md-ripple-surface"
              :class="{ active: currentKeyframeIndex === idx }"
              @click="selectKeyframe(idx)"
            >
              <span style="font-size: 0.72rem; font-weight: 700; color: var(--md-sys-color-primary);">{{ idx + 1 }}</span>
              <span style="font-size: 0.85rem; font-weight: 600;">K{{ idx + 1 }}</span>
              <button 
                v-if="keyframes.length > 2" 
                type="button" 
                class="keyframe-card__del" 
                title="Elimina fotogramma" 
                @click.stop="deleteKeyframe(idx)"
              >
                <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
              </button>
            </div>

            <!-- Add Keyframe Button -->
            <button 
              type="button" 
              class="keyframe-add-card md-ripple-surface" 
              title="Aggiungi Fotogramma" 
              @click="addKeyframe"
            >
              <span class="material-symbols-rounded">add</span>
              <span style="font-size: 0.72rem; font-weight: 600; margin-top: 2px;">Nuovo</span>
            </button>

            <!-- Clone Keyframe Button -->
            <button 
              type="button" 
              class="keyframe-add-card md-ripple-surface" 
              title="Clona fotogramma selezionato" 
              @click="cloneKeyframe"
            >
              <span class="material-symbols-rounded">content_copy</span>
              <span style="font-size: 0.72rem; font-weight: 600; margin-top: 2px;">Clona</span>
            </button>
          </div>
        </div>

        <!-- Playback & Rig Toolbar -->
        <div class="playback-controls-bar" style="margin-top: 1rem;">
          <div class="playback-controls-row">
            <button type="button" class="md-btn md-btn-filled" style="min-width: 110px;" @click="togglePlay">
              <span class="material-symbols-rounded filled">{{ isPlaying ? 'pause' : 'play_arrow' }}</span>
              <span>{{ isPlaying ? 'Pausa' : 'Play' }}</span>
            </button>

            <!-- Duration Slider -->
            <div class="slider-container">
              <div class="slider-header">
                <span>{{ t('editor.duration') }}</span>
                <span style="font-weight: 700;">{{ duration.toFixed(2) }}s</span>
              </div>
              <input 
                v-model.number="duration" 
                type="range" 
                min="0.15" 
                max="2.5" 
                step="0.05" 
                class="m3-range-slider"
                @input="onDurationChange"
              />
            </div>

            <!-- Timeline Scrub -->
            <div class="slider-container" style="flex: 1.5;">
              <div class="slider-header">
                <span>{{ t('editor.timeline_scrub') }}</span>
                <span style="font-weight: 700;">{{ scrubLabel }}</span>
              </div>
              <input 
                v-model.number="scrubValue" 
                type="range" 
                min="0" 
                max="1000" 
                class="m3-range-slider"
                @input="onScrubChange"
              />
            </div>
          </div>

          <!-- Rig Action Toggles -->
          <div class="rig-actions-row" style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button 
              type="button" 
              class="md-chip toggle" 
              :class="{ active: flags.symmetry }"
              @click="toggleFlag('symmetry')"
            >
              <span class="material-symbols-rounded" style="font-size: 16px;">splitscreen</span>
              <span>{{ t('editor.symmetry') }}</span>
            </button>
            <button 
              type="button" 
              class="md-chip toggle" 
              :class="{ active: flags.lockFeet }"
              @click="toggleFlag('lockFeet')"
            >
              <span class="material-symbols-rounded" style="font-size: 16px;">lock</span>
              <span>{{ t('editor.lock_feet') }}</span>
            </button>
            <button 
              type="button" 
              class="md-chip toggle" 
              :class="{ active: flags.onion }"
              @click="toggleFlag('onion')"
            >
              <span class="material-symbols-rounded" style="font-size: 16px;">layers</span>
              <span>{{ t('editor.onion_skin') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Exercise Metadata & Form -->
      <div class="editor-meta-card">
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--md-sys-color-on-surface); margin-bottom: 1.25rem;">
          {{ t('editor.exercise_info') }}
        </h3>

        <form @submit.prevent="handleSaveExercise">
          <!-- Name -->
          <div class="md-field-group">
            <input 
              v-model="exerciseName" 
              type="text" 
              id="exNameInput" 
              class="md-input" 
              placeholder=" " 
              required
            />
            <label class="md-field-label" for="exNameInput">{{ t('editor.ex_name_label') }}</label>
          </div>

          <!-- Category -->
          <div class="md-field-group">
            <select v-model="exerciseCategory" class="md-select" style="height: 52px; padding: 0.5rem 2rem 0.5rem 0.75rem; font-size: 0.95rem;">
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ getCategoryName(cat.id) }}
              </option>
            </select>
            <label class="md-field-label" style="top: 0; font-size: 0.72rem; color: var(--md-sys-color-primary);">
              {{ t('editor.ex_category_label') }}
            </label>
          </div>

          <!-- Notes -->
          <div class="md-field-group">
            <textarea 
              v-model="exerciseNotes" 
              id="exNotesInput" 
              class="md-input md-textarea" 
              placeholder=" " 
              rows="3"
            ></textarea>
            <label class="md-field-label" for="exNotesInput">{{ t('editor.ex_notes_label') }}</label>
          </div>

          <!-- Private Toggle -->
          <div style="margin: 1.25rem 0;">
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--md-sys-color-surface-container); border-radius: 12px; border: 1px solid var(--md-sys-color-outline-variant);" :style="{ cursor: canManage3D ? 'pointer' : 'default' }">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 24px;">lock</span>
                <div>
                  <strong style="display: block; font-size: 0.95rem; color: var(--md-sys-color-on-surface);">{{ t('editor.private_exercise_label') }}</strong>
                  <span style="display: block; font-size: 0.78rem; color: var(--md-sys-color-on-surface-variant);">{{ t('editor.private_exercise_desc') }}</span>
                </div>
              </div>
              <input 
                v-model="isPrivate" 
                type="checkbox" 
                :disabled="!canManage3D" 
                style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary);"
              />
            </label>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="md-btn md-btn-filled" 
            style="width: 100%; height: 50px; font-size: 1rem;"
            :disabled="isSaving"
          >
            <span class="material-symbols-rounded">save</span>
            <span>{{ isSaving ? 'Salvataggio in corso...' : t('editor.save_btn') }}</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Help Modal Dialog -->
    <ModalDialog v-model="showHelpModal" :title="t('editor.help_title')">
      <div style="color: var(--md-sys-color-on-surface-variant); font-size: 0.92rem; line-height: 1.6;">
        <div class="canvas-hud-hints" style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div>🎯 <strong>{{ t('editor.help_control_points') }}:</strong> <span>{{ t('editor.help_control_points_desc') }}</span></div>
          <div>🔄 <strong>{{ t('editor.help_rotate_view') }}:</strong> <span>{{ t('editor.help_rotate_view_desc') }}</span></div>
          <div>✋ <strong>{{ t('editor.help_pan') }}:</strong> <span>{{ t('editor.help_pan_desc') }}</span></div>
          <div>🔍 <strong>{{ t('editor.help_zoom') }}:</strong> <span>{{ t('editor.help_zoom_desc') }}</span></div>
        </div>
      </div>
      <template #actions>
        <button type="button" class="md-btn md-btn-filled" @click="showHelpModal = false">{{ t('editor.help_understood') }}</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api.js';
import { useAuth } from '../composables/useAuth.js';
import { useI18n } from '../composables/useI18n.js';
import { useCategories } from '../composables/useCategories.js';
import { useSnackbar } from '../composables/useSnackbar.js';
import { Mannequin, BASE_POSES } from '../mannequin/mannequin.js';
import ModalDialog from '../components/ui/ModalDialog.vue';

const route = useRoute();
const router = useRouter();

const { currentUser, canManage3D } = useAuth();
const { t } = useI18n();
const { categories, getCategoryName } = useCategories();
const { showSnackbar } = useSnackbar();

const canvasRef = ref(null);
let mannequin = null;

const exerciseId = ref(null);
const isEditing = computed(() => !!exerciseId.value);
const exerciseName = ref('');
const exerciseCategory = ref('Cardio');
const exerciseNotes = ref('');
const isPrivate = ref(true);
const isSaving = ref(false);

const selectedBasePose = ref('stand');
const isPlaying = ref(false);
const duration = ref(0.8);
const scrubValue = ref(0);
const scrubLabel = ref('K1 → K2');
const isFullscreen = ref(false);
const showHelpModal = ref(false);

const canUndo = ref(false);
const canRedo = ref(false);

const keyframes = ref([]);
const currentKeyframeIndex = ref(0);

const flags = reactive({
  symmetry: true,
  lockFeet: true,
  onion: false
});

function initMannequin() {
  if (!canvasRef.value) return;
  if (mannequin) {
    mannequin.destroy();
    mannequin = null;
  }

  mannequin = new Mannequin(canvasRef.value, {
    enableAnchors: true,
    isEditor: true,
    symmetry: flags.symmetry,
    lockFeet: flags.lockFeet,
    onion: flags.onion,
    onKeyframeChange: () => {
      syncKeyframesFromEngine();
      syncScrubUI();
    },
    onPlaybackStep: () => {
      syncScrubUI();
    },
    onToast: (msg) => {
      showSnackbar(msg);
    }
  });

  syncKeyframesFromEngine();
  syncScrubUI();
}

function syncKeyframesFromEngine() {
  if (!mannequin) return;
  keyframes.value = mannequin.keys.map(k => ({ ...k }));
  currentKeyframeIndex.value = mannequin.curKey;
  canUndo.value = mannequin.history.undo.length > 0;
  canRedo.value = mannequin.history.redo.length > 0;
  isPlaying.value = !!mannequin.playing;
}

function syncScrubUI() {
  if (!mannequin) return;
  isPlaying.value = !!mannequin.playing;
  canUndo.value = mannequin.history.undo.length > 0;
  canRedo.value = mannequin.history.redo.length > 0;

  const L = Math.max(mannequin.seq.length, 1);
  const p = ((mannequin.playPos % L) + L) % L;

  if (mannequin.playing) {
    scrubValue.value = Math.round((p / L) * 1000);
  }

  const i = Math.floor(p);
  if (mannequin.seq[i] !== undefined) {
    const nextIdx = (i + 1) % L;
    scrubLabel.value = `K${mannequin.seq[i] + 1} → K${mannequin.seq[nextIdx] + 1}`;
  }
}

function selectKeyframe(idx) {
  if (!mannequin) return;
  mannequin.selectKey(idx);
  syncKeyframesFromEngine();
}

function addKeyframe() {
  if (!mannequin) return;
  mannequin.addKey();
  syncKeyframesFromEngine();
}

function duplicateKeyframe(idx) {
  if (!mannequin) return;
  mannequin.dupKey(idx);
  syncKeyframesFromEngine();
}

function cloneKeyframe() {
  if (!mannequin) return;
  mannequin.cloneKey();
  syncKeyframesFromEngine();
}

function deleteKeyframe(idx) {
  if (!mannequin) return;
  mannequin.deleteKey(idx);
  syncKeyframesFromEngine();
}

function togglePlay() {
  if (!mannequin) return;
  if (mannequin.playing) {
    mannequin.stop();
  } else {
    mannequin.play();
  }
  syncKeyframesFromEngine();
}

function applyBasePose() {
  if (!mannequin) return;
  mannequin.applyBase(selectedBasePose.value);
  syncKeyframesFromEngine();
}

function onDurationChange() {
  if (!mannequin) return;
  mannequin.duration = duration.value;
}

function onScrubChange() {
  if (!mannequin) return;
  if (mannequin.playing) mannequin.stop();
  const L = Math.max(mannequin.seq.length, 1);
  mannequin.playPos = (scrubValue.value / 1000) * L;
  mannequin.stepPlayback(0);
  mannequin.refresh();
  syncScrubUI();
}

function toggleFlag(flagName) {
  if (!mannequin) return;
  flags[flagName] = !flags[flagName];
  mannequin.flags[flagName] = flags[flagName];
  if (flagName === 'onion') {
    mannequin.refreshGhost();
  }
}

function handleUndo() {
  if (mannequin) mannequin.undo();
  syncKeyframesFromEngine();
}

function handleRedo() {
  if (mannequin) mannequin.redo();
  syncKeyframesFromEngine();
}

function resetCamera() {
  if (mannequin) mannequin.resetView();
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  setTimeout(() => {
    if (mannequin) mannequin.resize();
  }, 100);
}

async function loadExercise(id) {
  try {
    const ex = await api.getExerciseById(id);
    if (ex) {
      exerciseId.value = ex.id;
      exerciseName.value = ex.name || '';
      exerciseCategory.value = ex.category || 'Cardio';
      exerciseNotes.value = ex.notes || '';
      isPrivate.value = Boolean(ex.is_private);
      if (ex.duration) {
        duration.value = ex.duration;
      }
      if (ex.keyframes && mannequin) {
        const kf = typeof ex.keyframes === 'string' ? JSON.parse(ex.keyframes) : ex.keyframes;
        if (Array.isArray(kf) && kf.length > 0) {
          mannequin.setKeyframes(kf, ex.duration || 0.8);
          syncKeyframesFromEngine();
        }
      }
    }
  } catch (err) {
    showSnackbar('Impossibile caricare l\'esercizio da modificare');
  }
}

async function handleSaveExercise() {
  if (!exerciseName.value.trim()) {
    showSnackbar('Inserisci un nome per l\'esercizio');
    return;
  }
  if (!mannequin || mannequin.keys.length < 2) {
    showSnackbar('Crea almeno 2 fotogrammi chiave per animare l\'esercizio');
    return;
  }

  isSaving.value = true;
  try {
    const exerciseData = {
      name: exerciseName.value.trim(),
      category: exerciseCategory.value,
      notes: exerciseNotes.value.trim(),
      is_private: canManage3D.value ? isPrivate.value : true,
      duration: duration.value || 0.8,
      keyframes: mannequin.keys.map(k => Array.from(k.pose))
    };

    if (exerciseId.value) {
      await api.updateExercise(exerciseId.value, exerciseData);
      showSnackbar('Esercizio 3D aggiornato con successo!');
    } else {
      await api.createExercise(exerciseData);
      showSnackbar('Esercizio 3D salvato con successo!');
    }

    router.push('/library');
  } catch (err) {
    showSnackbar(err.message || 'Errore durante il salvataggio');
  } finally {
    isSaving.value = false;
  }
}

onMounted(async () => {
  initMannequin();
  const id = route.query.id;
  if (id) {
    await loadExercise(id);
  }
});

onUnmounted(() => {
  if (mannequin) {
    mannequin.stop();
    mannequin.destroy();
    mannequin = null;
  }
});
</script>
