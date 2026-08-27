<template>
  <main class="content-container">
    <div class="builder-header">
      <h1 class="builder-header__title">{{ isEditing ? 'Modifica Scheda HIIT' : t('builder.title') }}</h1>
      <p class="builder-header__subtitle">
        {{ t('builder.subtitle') }}
      </p>
    </div>

    <div class="builder-card">
      <!-- Plan Name -->
      <div class="md-field-group">
        <input 
          v-model="planName" 
          type="text" 
          id="planNameInput" 
          class="md-input" 
          placeholder=" " 
          required
        />
        <label class="md-field-label" for="planNameInput">{{ t('builder.plan_name_label') }}</label>
      </div>

      <!-- Plan Description -->
      <div class="md-field-group">
        <textarea 
          v-model="planDesc" 
          id="planDescInput" 
          class="md-input md-textarea" 
          placeholder=" " 
          rows="2"
        ></textarea>
        <label class="md-field-label" for="planDescInput">{{ t('builder.plan_desc_label') }}</label>
      </div>

      <!-- Public Plan Switch (Admin / SuperUser only) -->
      <div v-if="canManage3D" style="margin-top: 0.5rem; margin-bottom: 1rem;">
        <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--md-sys-color-surface-container); border-radius: 12px; cursor: pointer; border: 1px solid var(--md-sys-color-outline-variant);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 24px;">public</span>
            <div>
              <strong style="display: block; font-size: 0.95rem; color: var(--md-sys-color-on-surface);">{{ t('builder.is_public_label') }}</strong>
              <span style="display: block; font-size: 0.78rem; color: var(--md-sys-color-on-surface-variant);">{{ t('builder.is_public_desc') }}</span>
            </div>
          </div>
          <input 
            v-model="isPublic" 
            type="checkbox" 
            style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary); cursor: pointer;"
          />
        </label>
      </div>

      <!-- Circuit Groups Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 1.5rem 0 1rem 0;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--md-sys-color-on-surface); margin: 0;">{{ t('builder.circuit_groups') }}</h3>
          <span style="font-size: 0.8rem; color: var(--md-sys-color-on-surface-variant);">
            Durata stimata totale: <strong>~{{ totalEstimatedMinutes }} min</strong>
          </span>
        </div>
        <button type="button" class="md-btn md-btn-tonal" @click="addGroup">
          <span class="material-symbols-rounded">add</span>
          <span>{{ t('builder.add_group') }}</span>
        </button>
      </div>

      <!-- Groups Container -->
      <div id="groupsContainer" style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div 
          v-for="(group, gIdx) in groups" 
          :key="group.id" 
          class="builder-group-card"
          style="background: var(--md-sys-color-surface-container); border-radius: 16px; padding: 1.25rem; border: 1px solid var(--md-sys-color-outline-variant);"
        >
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
              <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary);">repeat</span>
              <input 
                v-model="group.title" 
                type="text" 
                class="md-input" 
                style="font-weight: 700; font-size: 1.05rem; padding: 0.4rem 0.6rem; height: 38px; max-width: 240px;"
              />
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <label style="font-size: 0.85rem; color: var(--md-sys-color-on-surface-variant);">{{ t('builder.repetitions_label', { defaultValue: 'Giri:' }) }}</label>
                <input 
                  v-model.number="group.repetitions" 
                  type="number" 
                  min="1" 
                  max="20" 
                  class="md-input" 
                  style="width: 60px; height: 38px; text-align: center; padding: 0.2rem;"
                />
              </div>

              <button 
                v-if="groups.length > 1" 
                type="button" 
                class="md-btn-icon md-btn-danger" 
                title="Rimuovi Circuito" 
                @click="removeGroup(gIdx)"
              >
                <span class="material-symbols-rounded">delete</span>
              </button>
            </div>
          </div>

          <!-- Group Exercise Items List -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div 
              v-for="(item, iIdx) in group.items" 
              :key="item.id" 
              class="builder-exercise-row"
              style="background: var(--md-sys-color-surface-container-high); border-radius: 12px; padding: 1rem; border: 1px solid var(--md-sys-color-outline-variant);"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <!-- Left: Exercise info & Picker trigger -->
                <div style="display: flex; align-items: center; gap: 0.5rem; flex: 0 0 42%; min-width: 250px;">
                  <button 
                    type="button" 
                    class="md-btn md-btn-tonal" 
                    style="flex: 1; min-width: 0; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem; height: 38px; overflow: hidden; text-align: left;" 
                    @click="openPicker(gIdx, iIdx)"
                  >
                    <span class="material-symbols-rounded" style="font-size: 18px; flex-shrink: 0;">swap_horiz</span>
                    <span style="font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">{{ getItemDisplayName(item) }}</span>
                  </button>
                  <span class="md-badge" :class="getCategoryBadgeClass(item.category)" style="flex-shrink: 0;">
                    {{ getCategoryName(item.category) }}
                  </span>
                  <button 
                    type="button" 
                    class="md-btn-icon" 
                    style="flex-shrink: 0; width: 36px; height: 36px;"
                    :title="t('library.preview_btn', { defaultValue: 'Anteprima 3D' })" 
                    :aria-label="t('library.preview_btn', { defaultValue: 'Anteprima 3D' })"
                    @click="openPreviewModal(item)"
                  >
                    <span class="material-symbols-rounded" style="font-size: 20px;">visibility</span>
                  </button>
                </div>

                <!-- Mode toggle: Reps vs Duration -->
                <div class="md-segmented-button" style="height: 36px;">
                  <button 
                    type="button" 
                    class="md-segmented-button__btn" 
                    :class="{ active: item.type === 'reps' }"
                    @click="item.type = 'reps'"
                  >
                    {{ t('builder.mode_reps', { defaultValue: 'Reps' }) }}
                  </button>
                  <button 
                    type="button" 
                    class="md-segmented-button__btn" 
                    :class="{ active: item.type === 'duration' }"
                    @click="item.type = 'duration'"
                  >
                    {{ t('builder.mode_duration', { defaultValue: 'Tempo' }) }}
                  </button>
                </div>

                <!-- Target & Rest settings -->
                <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span class="material-symbols-rounded" style="font-size: 18px; color: var(--md-sys-color-primary);">
                      {{ item.type === 'reps' ? 'tag' : 'timer' }}
                    </span>
                    <span style="font-size: 0.85rem;">{{ item.type === 'reps' ? '(#)' : '(s)' }}</span>
                    <input 
                      v-model.number="item.target" 
                      type="number" 
                      min="1" 
                      max="600" 
                      class="md-input" 
                      style="width: 70px; height: 36px; text-align: center; padding: 0.2rem;"
                    />
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span class="material-symbols-rounded" style="font-size: 18px; color: var(--md-sys-color-primary);">self_improvement</span>
                    <span style="font-size: 0.85rem;">(s)</span>
                    <input 
                      v-model.number="item.restAfter" 
                      type="number" 
                      min="0" 
                      max="300" 
                      class="md-input" 
                      style="width: 70px; height: 36px; text-align: center; padding: 0.2rem;"
                    />
                  </div>

                  <button 
                    type="button" 
                    class="md-btn-icon md-btn-danger" 
                    title="Rimuovi Esercizio" 
                    @click="removeExerciseFromGroup(gIdx, iIdx)"
                  >
                    <span class="material-symbols-rounded">close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Exercise Button in Group -->
          <div style="margin-top: 0.75rem;">
            <button 
              type="button" 
              class="md-btn md-btn-text" 
              style="font-size: 0.85rem;"
              @click="addExerciseToGroup(gIdx)"
            >
              <span class="material-symbols-rounded">add</span>
              <span>{{ t('builder.add_exercise') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div style="margin-top: 2rem;">
        <button 
          type="button" 
          class="md-btn md-btn-filled" 
          style="width: 100%; height: 50px; font-size: 1rem;" 
          :disabled="isSaving"
          @click="savePlan"
        >
          <span class="material-symbols-rounded">save</span>
          <span>{{ isSaving ? 'Salvataggio in corso...' : t('builder.save_plan') }}</span>
        </button>
      </div>
    </div>

    <!-- Exercise Picker Modal -->
    <ExercisePickerModal 
      v-model="showPickerModal" 
      :exercises="availableExercises" 
      :selected-exercise-id="activePickerTarget ? groups[activePickerTarget.gIdx]?.items[activePickerTarget.iIdx]?.exercise_id : ''"
      @select="handleExerciseSelected"
    />

    <!-- 3D Preview Modal Dialog -->
    <ModalDialog v-model="showPreviewModal" :title="getPreviewDisplayName(previewExercise)" custom-style="max-width: 560px;">
      <div v-if="previewExercise">
        <div class="preview-canvas-wrap" style="height: 340px; background: #000; border-radius: 12px; overflow: hidden;">
          <MannequinPreview :keyframes="previewExercise.keyframes" :duration="previewExercise.duration || 0.8" />
        </div>

        <div v-if="previewExercise.notes" class="preview-notes-box" style="margin-top: 1rem; padding: 0.85rem 1rem; background: var(--md-sys-color-surface-container-high); border-radius: 12px; border-left: 4px solid var(--md-sys-color-primary);">
          <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; font-size: 0.82rem; color: var(--md-sys-color-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.35rem;">
            <span class="material-symbols-rounded" style="font-size: 18px;">sticky_note_2</span>
            <span>{{ t('library.notes_label', { defaultValue: 'Note Esercizio' }) }}</span>
          </div>
          <p style="font-size: 0.9rem; color: var(--md-sys-color-on-surface); margin: 0; line-height: 1.5; white-space: pre-line;">{{ previewExercise.notes }}</p>
        </div>
      </div>
      <template #actions>
        <button type="button" class="md-btn md-btn-filled" @click="showPreviewModal = false">
          {{ t('player.notes_dialog_close', { defaultValue: 'Chiudi' }) }}
        </button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api.js';
import { useAuth } from '../composables/useAuth.js';
import { useI18n } from '../composables/useI18n.js';
import { useCategories } from '../composables/useCategories.js';
import { useSnackbar } from '../composables/useSnackbar.js';
import ExercisePickerModal from '../components/builder/ExercisePickerModal.vue';
import ModalDialog from '../components/ui/ModalDialog.vue';
import MannequinPreview from '../components/mannequin/MannequinPreview.vue';

const route = useRoute();
const router = useRouter();

const { currentUser, canManage3D } = useAuth();
const { t } = useI18n();
const { categories, getCategoryName, getCategoryBadgeClass } = useCategories();
const { showSnackbar } = useSnackbar();

const planId = ref(null);
const isEditing = computed(() => !!planId.value);
const planName = ref('');
const planDesc = ref('');
const isPublic = ref(false);
const groups = ref([]);
const availableExercises = ref([]);
const isSaving = ref(false);

const showPickerModal = ref(false);
const activePickerTarget = ref(null); // { gIdx, iIdx }

const previewExercise = ref(null);
const showPreviewModal = ref(false);

function openPreviewModal(item) {
  const exId = item.exercise_id || item.exerciseId;
  const ex = availableExercises.value.find(e => e.id === exId);
  if (ex) {
    previewExercise.value = ex;
    showPreviewModal.value = true;
  }
}

function getPreviewDisplayName(ex) {
  if (!ex) return '';
  if (ex.is_standard) {
    const tr = t(`exercises.${ex.name}`);
    if (tr && tr !== `exercises.${ex.name}`) return tr;
  }
  return ex.name;
}

function getItemDisplayName(item) {
  if (!item) return '';
  const ex = availableExercises.value.find(e => e.id === (item.exercise_id || item.exerciseId));
  if (ex && ex.is_standard) {
    const tr = t(`exercises.${ex.name}`);
    if (tr && tr !== `exercises.${ex.name}`) return tr;
  }
  return item.name || (ex ? ex.name : 'Esercizio');
}

const totalEstimatedMinutes = computed(() => {
  let totalSec = 0;
  groups.value.forEach(g => {
    const reps = Math.max(1, parseInt(g.repetitions, 10) || 1);
    let gSec = 0;
    (g.items || []).forEach(item => {
      const isReps = item.type === 'reps';
      const targetVal = Math.max(0, parseInt(item.target, 10) || 0);
      const exDur = isReps ? (targetVal * 2) : targetVal;
      const restDur = Math.max(0, parseInt(item.restAfter, 10) || 0);
      gSec += (exDur + restDur);
    });
    totalSec += gSec * reps;
  });
  return totalSec > 0 ? Math.max(1, Math.round(totalSec / 60)) : 0;
});

function addGroup() {
  const gNum = groups.value.length + 1;
  const defaultEx = availableExercises.value[0] || { id: 'ex-1', name: 'Burpees', category: 'Cardio' };
  groups.value.push({
    id: 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    title: t('builder.circuit_title', { num: gNum, defaultValue: `Circuito ${gNum}` }),
    repetitions: 1,
    items: [
      {
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        exercise_id: defaultEx.id,
        exerciseId: defaultEx.id,
        name: defaultEx.name,
        category: defaultEx.category || 'Full Body',
        type: 'duration',
        target: 40,
        target_value: 40,
        restAfter: 20,
        rest_seconds: 20
      }
    ]
  });
}

function removeGroup(gIdx) {
  groups.value.splice(gIdx, 1);
}

function addExerciseToGroup(gIdx) {
  const defaultEx = availableExercises.value[0] || { id: 'ex-1', name: 'Burpees', category: 'Cardio' };
  groups.value[gIdx].items.push({
    id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    exercise_id: defaultEx.id,
    exerciseId: defaultEx.id,
    name: defaultEx.name,
    category: defaultEx.category || 'Full Body',
    type: 'duration',
    target: 40,
    target_value: 40,
    restAfter: 20,
    rest_seconds: 20
  });
}

function removeExerciseFromGroup(gIdx, iIdx) {
  groups.value[gIdx].items.splice(iIdx, 1);
}

function openPicker(gIdx, iIdx) {
  activePickerTarget.value = { gIdx, iIdx };
  showPickerModal.value = true;
}

function handleExerciseSelected(ex) {
  if (!activePickerTarget.value) return;
  const { gIdx, iIdx } = activePickerTarget.value;
  const item = groups.value[gIdx].items[iIdx];
  if (item) {
    item.exercise_id = ex.id;
    item.exerciseId = ex.id;
    item.name = ex.name;
    item.category = ex.category;
  }
}

async function loadPlan(id) {
  try {
    const plan = await api.getPlanById(id);
    if (plan) {
      planId.value = plan.id;
      planName.value = plan.name || '';
      planDesc.value = plan.description || '';
      isPublic.value = Boolean(plan.is_public);
      groups.value = (plan.structure && plan.structure.groups) || [];
      // Normalize items
      groups.value.forEach(g => {
        (g.items || []).forEach(item => {
          if (item.target === undefined) item.target = item.target_value !== undefined ? item.target_value : 40;
          if (item.restAfter === undefined) item.restAfter = item.rest_seconds !== undefined ? item.rest_seconds : 20;
          if (!item.exercise_id && item.exerciseId) item.exercise_id = item.exerciseId;
        });
      });
    }
  } catch (err) {
    showSnackbar('Impossibile caricare la scheda');
    reset();
  }
}

function reset() {
  planId.value = null;
  planName.value = '';
  planDesc.value = '';
  isPublic.value = false;
  groups.value = [];
  addGroup();
}

async function savePlan() {
  if (!planName.value.trim()) {
    showSnackbar('Inserisci un nome per la scheda HIIT.');
    return;
  }
  if (groups.value.length === 0 || groups.value.every(g => !g.items || g.items.length === 0)) {
    showSnackbar('Aggiungi almeno un circuito con almeno un esercizio.');
    return;
  }

  isSaving.value = true;
  try {
    const planData = {
      name: planName.value.trim(),
      description: planDesc.value.trim(),
      is_public: isPublic.value,
      structure: {
        groups: groups.value.map(g => ({
          id: g.id,
          title: g.title,
          repetitions: Math.max(1, parseInt(g.repetitions, 10) || 1),
          items: (g.items || []).map(item => ({
            id: item.id,
            exercise_id: item.exercise_id || item.exerciseId,
            exerciseId: item.exercise_id || item.exerciseId,
            name: item.name,
            category: item.category,
            type: item.type,
            target: parseInt(item.target, 10) || (item.type === 'reps' ? 15 : 40),
            target_value: parseInt(item.target, 10) || (item.type === 'reps' ? 15 : 40),
            restAfter: parseInt(item.restAfter, 10) || 0,
            rest_seconds: parseInt(item.restAfter, 10) || 0
          }))
        }))
      }
    };

    if (planId.value) {
      await api.updatePlan(planId.value, planData);
      showSnackbar('Scheda HIIT aggiornata con successo!');
    } else {
      await api.createPlan(planData);
      showSnackbar('Scheda HIIT salvata con successo!');
    }

    router.push('/');
  } catch (err) {
    showSnackbar(err.message || 'Errore durante il salvataggio');
  } finally {
    isSaving.value = false;
  }
}

onMounted(async () => {
  availableExercises.value = await api.getExercises();
  const id = route.query.id;
  if (id) {
    await loadPlan(id);
  } else {
    reset();
  }
});
</script>
