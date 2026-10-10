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
      <TransitionGroup 
        tag="div" 
        id="groupsContainer" 
        name="group-list"
        style="display: flex; flex-direction: column; gap: 1.25rem;"
      >
        <div 
          v-for="(group, gIdx) in groups" 
          :key="group.id" 
          class="builder-group-card"
        >
          <div class="builder-group-card__header">
            <div class="builder-group-card__title-row">
              <span class="material-symbols-rounded group-icon">repeat</span>
              <input 
                v-model="group.title" 
                type="text" 
                class="md-input group-title-input" 
                placeholder="Titolo circuito"
              />
            </div>

            <div class="builder-group-card__actions">
              <div class="builder-group-card__reps">
                <label class="group-reps-label">{{ t('builder.repetitions_label', { defaultValue: 'Giri:' }) }}</label>
                <input 
                  v-model.number="group.repetitions" 
                  type="number" 
                  min="1" 
                  max="20" 
                  class="md-input group-reps-input" 
                />
              </div>

              <!-- Reorder circuit group up / down buttons -->
              <button 
                type="button" 
                class="md-btn-icon" 
                :disabled="gIdx === 0" 
                :title="t('builder.move_group_up', { defaultValue: 'Sposta Circuito Su' })" 
                :aria-label="t('builder.move_group_up', { defaultValue: 'Sposta Circuito Su' })" 
                @click="moveGroupUp(gIdx)"
              >
                <span class="material-symbols-rounded">arrow_upward</span>
              </button>

              <button 
                type="button" 
                class="md-btn-icon" 
                :disabled="gIdx === groups.length - 1" 
                :title="t('builder.move_group_down', { defaultValue: 'Sposta Circuito Giù' })" 
                :aria-label="t('builder.move_group_down', { defaultValue: 'Sposta Circuito Giù' })" 
                @click="moveGroupDown(gIdx)"
              >
                <span class="material-symbols-rounded">arrow_downward</span>
              </button>

              <button 
                type="button" 
                class="md-btn-icon" 
                :title="t('builder.duplicate_group', { defaultValue: 'Duplica Circuito' })" 
                :aria-label="t('builder.duplicate_group', { defaultValue: 'Duplica Circuito' })" 
                @click="duplicateGroup(gIdx)"
              >
                <span class="material-symbols-rounded">content_copy</span>
              </button>

              <button 
                v-if="groups.length > 1" 
                type="button" 
                class="md-btn-icon md-btn-danger" 
                :title="t('builder.remove_group', { defaultValue: 'Rimuovi Circuito' })" 
                :aria-label="t('builder.remove_group', { defaultValue: 'Rimuovi Circuito' })" 
                @click="removeGroup(gIdx)"
              >
                <span class="material-symbols-rounded">delete</span>
              </button>
            </div>
          </div>

          <!-- Group Exercise Items List -->
          <TransitionGroup 
            tag="div" 
            name="exercise-list"
            class="builder-exercise-list"
            @dragover="onContainerDragOver($event, gIdx)"
            @drop="onContainerDrop($event, gIdx)"
          >
            <div 
              v-for="(item, iIdx) in group.items" 
              :key="item.id" 
              class="builder-exercise-row"
              :class="{
                'is-dragging': isDragging && dragSource?.gIdx === gIdx && dragSource?.iIdx === iIdx,
                'drop-before': dropTarget?.gIdx === gIdx && dropTarget?.iIdx === iIdx && dropTarget?.position === 'before',
                'drop-after': dropTarget?.gIdx === gIdx && dropTarget?.iIdx === iIdx && dropTarget?.position === 'after'
              }"
              :data-group-idx="gIdx"
              :data-item-idx="iIdx"
              :draggable="canDragRow(gIdx, iIdx)"
              @dragstart="onDragStart($event, gIdx, iIdx)"
              @dragend="onDragEnd"
              @dragover="onDragOver($event, gIdx, iIdx)"
              @dragleave="onDragLeave($event, gIdx, iIdx)"
              @drop.stop="onDrop($event, gIdx, iIdx)"
            >
              <div class="builder-exercise-row__inner">
                <!-- Exercise Selector Button -->
                <button 
                  type="button" 
                  class="md-btn md-btn-tonal builder-exercise-row__picker-btn" 
                  @click="openPicker(gIdx, iIdx)"
                >
                  <span 
                    class="material-symbols-rounded drag-handle" 
                    :title="t('builder.drag_handle_label', { defaultValue: 'Trascina per riordinare' })" 
                    :aria-label="t('builder.drag_handle_label', { defaultValue: 'Trascina per riordinare' })"
                    draggable="true"
                    @click.stop
                    @mousedown.stop="handleMouseDown(gIdx, iIdx)"
                    @mouseup="handleMouseUp"
                    @dragstart.stop="onDragStart($event, gIdx, iIdx)"
                    @dragend.stop="onDragEnd"
                    @touchstart.stop="handleTouchStart($event, gIdx, iIdx)"
                    @touchmove.stop="handleTouchMove($event)"
                    @touchend.stop="handleTouchEnd($event)"
                    @touchcancel.stop="handleTouchCancel"
                  >drag_handle</span>
                  <span class="material-symbols-rounded picker-swap-icon">swap_horiz</span>
                  <span class="exercise-name">{{ getItemDisplayName(item) }}</span>
                </button>

                <!-- Exercise Badges (Category & Equipment) -->
                <div class="builder-exercise-row__meta">
                  <span class="md-badge" :class="getCategoryBadgeClass(item.category)">
                    {{ getCategoryName(item.category) }}
                  </span>
                  <span 
                    v-for="(eq, eqIdx) in getItemEquipment(item)" 
                    :key="eqIdx" 
                    class="md-badge builder-eq-badge" 
                    :title="getEquipmentName(eq)"
                  >
                    {{ getEquipmentEmoji(eq) }}
                  </span>
                </div>

                <!-- Mode Toggle & Target/Rest Values -->
                <div class="builder-exercise-row__controls">
                  <!-- Mode toggle: Reps vs Duration -->
                  <div class="md-segmented-button builder-mode-toggle">
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

                  <!-- Target & Rest settings (Always stays on one line!) -->
                  <div class="builder-exercise-row__values">
                    <div class="builder-value-field" :title="item.type === 'reps' ? 'Ripetizioni' : 'Secondi di esercizio'">
                      <span class="material-symbols-rounded field-icon">
                        {{ item.type === 'reps' ? 'tag' : 'timer' }}
                      </span>
                      <input 
                        v-model.number="item.target" 
                        type="number" 
                        min="1" 
                        max="600" 
                        class="md-input builder-num-input" 
                      />
                      <span class="field-unit">{{ item.type === 'reps' ? '(#)' : 's' }}</span>
                    </div>

                    <div class="builder-value-field" title="Secondi di pausa">
                      <span class="material-symbols-rounded field-icon rest-icon">self_improvement</span>
                      <input 
                        v-model.number="item.restAfter" 
                        type="number" 
                        min="0" 
                        max="300" 
                        class="md-input builder-num-input" 
                      />
                      <span class="field-unit">s</span>
                    </div>
                  </div>
                </div>

                <!-- Row Actions (Note, 3D Preview & Delete) -->
                <div class="builder-exercise-row__actions">
                  <button 
                    type="button" 
                    class="md-btn-icon builder-note-btn" 
                    :class="{ 'has-note': !!item.note }"
                    :title="t('builder.note_btn', { defaultValue: 'Nota' })" 
                    :aria-label="t('builder.note_btn', { defaultValue: 'Nota' })"
                    @click="openNoteModal(gIdx, iIdx)"
                  >
                    <span class="material-symbols-rounded">sticky_note_2</span>
                  </button>

                  <button 
                    type="button" 
                    class="md-btn-icon builder-preview-btn" 
                    :title="t('library.preview_btn', { defaultValue: 'Anteprima 3D' })" 
                    :aria-label="t('library.preview_btn', { defaultValue: 'Anteprima 3D' })"
                    @click="openPreviewModal(item)"
                  >
                    <span class="material-symbols-rounded">visibility</span>
                  </button>

                  <button 
                    type="button" 
                    class="md-btn-icon md-btn-danger builder-delete-btn" 
                    title="Rimuovi Esercizio" 
                    @click="removeExerciseFromGroup(gIdx, iIdx)"
                  >
                    <span class="material-symbols-rounded">close</span>
                  </button>
                </div>
              </div>
            </div>
          </TransitionGroup>

          <!-- Add Exercise Button in Group -->
          <div class="builder-add-exercise-wrap">
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
      </TransitionGroup>

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
          <MannequinPreview :keyframes="previewExercise.keyframes" :equipment="previewExercise.equipment" :duration="previewExercise.duration || 0.8" />
        </div>

        <div v-if="getExerciseEquipment(previewExercise).length > 0" style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.75rem;">
          <span v-for="(eq, eqIdx) in getExerciseEquipment(previewExercise)" :key="eqIdx" class="md-badge" style="font-size: 0.75rem; padding: 0.2rem 0.5rem; background-color: var(--md-sys-color-surface-container-high); color: var(--md-sys-color-on-surface);">
            {{ getEquipmentEmoji(eq) }} {{ getEquipmentName(eq) }}
          </span>
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

    <!-- Exercise Note Modal Dialog -->
    <ModalDialog v-model="showNoteModal" :title="t('builder.note_dialog_title', { defaultValue: 'Nota Esercizio' })">
      <div v-if="noteTarget">
        <p style="font-size: 0.85rem; color: var(--md-sys-color-on-surface-variant); margin: 0 0 0.75rem 0;">
          {{ getNoteTargetDisplayName() }}
        </p>
        <textarea
          v-model="noteDraft"
          class="md-input md-textarea"
          rows="4"
          :placeholder="t('builder.note_placeholder', { defaultValue: 'Scrivi una nota per questo esercizio in questa scheda...' })"
          style="width: 100%; resize: vertical;"
        ></textarea>
      </div>
      <template #actions>
        <button 
          v-if="noteTarget && groups[noteTarget.gIdx]?.items[noteTarget.iIdx]?.note" 
          type="button" 
          class="md-btn md-btn-danger" 
          @click="removeNote"
        >
          {{ t('builder.note_remove_btn', { defaultValue: 'Rimuovi Nota' }) }}
        </button>
        <button type="button" class="md-btn md-btn-text" @click="showNoteModal = false">
          {{ t('admin.cancel_btn', { defaultValue: 'Annulla' }) }}
        </button>
        <button type="button" class="md-btn md-btn-filled" @click="saveNote">
          {{ t('builder.note_save_btn', { defaultValue: 'Salva Nota' }) }}
        </button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, TransitionGroup } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api.js';
import { useAuth } from '../composables/useAuth.js';
import { useI18n } from '../composables/useI18n.js';
import { useCategories } from '../composables/useCategories.js';
import { useSnackbar } from '../composables/useSnackbar.js';
import { useLoading } from '../composables/useLoading.js';
import ExercisePickerModal from '../components/builder/ExercisePickerModal.vue';
import ModalDialog from '../components/ui/ModalDialog.vue';
import MannequinPreview from '../components/mannequin/MannequinPreview.vue';

const route = useRoute();
const router = useRouter();

const { currentUser, canManage3D } = useAuth();
const { t } = useI18n();
const { categories, getCategoryName, getCategoryBadgeClass } = useCategories();
const { showSnackbar } = useSnackbar();
const { showLoading, hideLoading } = useLoading();

const planId = ref(null);
const isEditing = computed(() => !!planId.value);
const planName = ref('');
const planDesc = ref('');
const isPublic = ref(false);
const groups = ref([]);
const availableExercises = ref([]);
const isSaving = ref(false);

// Drag & Drop reordering state
const isDragging = ref(false);
const activeDragItem = ref(null); // { gIdx, iIdx }
const dragSource = ref(null);     // { gIdx, iIdx }
const dropTarget = ref(null);     // { gIdx, iIdx, position: 'before' | 'after' }

const showPickerModal = ref(false);
const activePickerTarget = ref(null); // { gIdx, iIdx }

const previewExercise = ref(null);
const showPreviewModal = ref(false);

// Per-exercise note (stored inside the plan structure JSON)
const showNoteModal = ref(false);
const noteTarget = ref(null); // { gIdx, iIdx }
const noteDraft = ref('');

function openNoteModal(gIdx, iIdx) {
  const item = groups.value[gIdx]?.items[iIdx];
  if (!item) return;
  noteTarget.value = { gIdx, iIdx };
  noteDraft.value = item.note || '';
  showNoteModal.value = true;
}

function getNoteTargetDisplayName() {
  if (!noteTarget.value) return '';
  const item = groups.value[noteTarget.value.gIdx]?.items[noteTarget.value.iIdx];
  return getItemDisplayName(item);
}

function saveNote() {
  if (!noteTarget.value) return;
  const item = groups.value[noteTarget.value.gIdx]?.items[noteTarget.value.iIdx];
  if (item) {
    item.note = (noteDraft.value || '').trim();
  }
  showNoteModal.value = false;
}

function removeNote() {
  if (!noteTarget.value) return;
  const item = groups.value[noteTarget.value.gIdx]?.items[noteTarget.value.iIdx];
  if (item) {
    item.note = '';
  }
  noteDraft.value = '';
  showNoteModal.value = false;
}

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

function getExerciseEquipment(ex) {
  if (!ex || !ex.equipment) return [];
  if (typeof ex.equipment === 'string') {
    try {
      return JSON.parse(ex.equipment);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(ex.equipment) ? ex.equipment : [];
}

function getItemEquipment(item) {
  if (!item) return [];
  const ex = availableExercises.value.find(e => e.id === (item.exercise_id || item.exerciseId));
  return getExerciseEquipment(ex);
}

function getEquipmentType(eq) {
  return typeof eq === 'string' ? eq : (eq.type || '');
}

function getEquipmentEmoji(eq) {
  const type = getEquipmentType(eq);
  if (type === 'dumbbells') return '🏋️';
  if (type === 'ankle_weights') return '🦵';
  if (type === 'elastic_band') return '➰';
  if (type === 'ball') return '⚽';
  if (type === 'step') return '🪜';
  if (type === 'wall') return '🧱';
  if (type === 'mat') return '🟦';
  return '📦';
}

function getEquipmentName(eq) {
  const type = getEquipmentType(eq);
  if (type === 'dumbbells') return t('editor.prop_dumbbells', { defaultValue: 'Manubri' });
  if (type === 'ankle_weights') return t('editor.prop_ankle_weights', { defaultValue: 'Cavigliere' });
  if (type === 'elastic_band') return t('editor.prop_elastic_band', { defaultValue: 'Elastico' });
  if (type === 'ball') return t('editor.prop_ball', { defaultValue: 'Palla' });
  if (type === 'step') return t('editor.prop_step', { defaultValue: 'Gradino' });
  if (type === 'wall') return t('editor.prop_wall', { defaultValue: 'Muro' });
  if (type === 'mat') return t('editor.prop_mat', { defaultValue: 'Tappeto' });
  return type;
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
        rest_seconds: 20,
        note: ''
      }
    ]
  });
}

function duplicateGroup(gIdx) {
  const source = groups.value[gIdx];
  if (!source) return;
  const copySuffix = t('builder.copy_suffix', { defaultValue: 'Copia' });
  const newTitle = source.title ? `${source.title} (${copySuffix})` : `Circuito ${groups.value.length + 1}`;

  const duplicated = {
    id: 'group-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    title: newTitle,
    repetitions: Math.max(1, parseInt(source.repetitions, 10) || 1),
    items: (source.items || []).map((item, iIdx) => ({
      id: 'item-' + Date.now() + '-' + iIdx + '-' + Math.random().toString(36).substring(2, 6),
      exercise_id: item.exercise_id || item.exerciseId,
      exerciseId: item.exercise_id || item.exerciseId,
      name: item.name,
      category: item.category,
      type: item.type || 'reps',
      target: item.target !== undefined ? item.target : (item.target_value !== undefined ? item.target_value : (item.type === 'reps' ? 15 : 40)),
      target_value: item.target !== undefined ? item.target : (item.target_value !== undefined ? item.target_value : (item.type === 'reps' ? 15 : 40)),
      restAfter: item.restAfter !== undefined ? item.restAfter : (item.rest_seconds !== undefined ? item.rest_seconds : (item.rest !== undefined ? item.rest : 20)),
      rest_seconds: item.restAfter !== undefined ? item.restAfter : (item.rest_seconds !== undefined ? item.rest_seconds : (item.rest !== undefined ? item.rest : 20)),
      note: item.note || ''
    }))
  };

  groups.value.splice(gIdx + 1, 0, duplicated);
  showSnackbar(t('builder.group_duplicated', { defaultValue: 'Circuito duplicato con successo!' }));
}

function removeGroup(gIdx) {
  groups.value.splice(gIdx, 1);
}

function moveGroupUp(gIdx) {
  if (gIdx <= 0) return;
  const [movedGroup] = groups.value.splice(gIdx, 1);
  groups.value.splice(gIdx - 1, 0, movedGroup);
}

function moveGroupDown(gIdx) {
  if (gIdx >= groups.value.length - 1) return;
  const [movedGroup] = groups.value.splice(gIdx, 1);
  groups.value.splice(gIdx + 1, 0, movedGroup);
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
    rest_seconds: 20,
    note: ''
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

/* ==========================================================================
   Exercise Drag & Drop Reordering (scoped within the current circuit)
   ========================================================================== */

function canDragRow(gIdx, iIdx) {
  return activeDragItem.value?.gIdx === gIdx && activeDragItem.value?.iIdx === iIdx;
}

function handleMouseDown(gIdx, iIdx) {
  activeDragItem.value = { gIdx, iIdx };
  window.addEventListener('mouseup', handleWindowMouseUp, { once: true });
}

function handleMouseUp() {
  if (!isDragging.value) {
    activeDragItem.value = null;
  }
}

function handleWindowMouseUp() {
  if (!isDragging.value) {
    activeDragItem.value = null;
  }
}

function onDragStart(event, gIdx, iIdx) {
  isDragging.value = true;
  dragSource.value = { gIdx, iIdx };
  activeDragItem.value = { gIdx, iIdx };

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${gIdx}:${iIdx}`);

    const rowEl = event.currentTarget?.classList?.contains('builder-exercise-row')
      ? event.currentTarget
      : event.target?.closest('.builder-exercise-row');

    if (rowEl && event.dataTransfer.setDragImage) {
      const rect = rowEl.getBoundingClientRect();
      event.dataTransfer.setDragImage(rowEl, event.clientX - rect.left, event.clientY - rect.top);
    }
  }
}

function onDragOver(event, gIdx, iIdx) {
  if (!dragSource.value) return;

  // Reordering is strictly scoped within the current circuit
  if (dragSource.value.gIdx !== gIdx) {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'none';
    }
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  const fromIdx = dragSource.value.iIdx;
  const rowEl = event.currentTarget;
  const rect = rowEl.getBoundingClientRect();
  const relY = event.clientY - rect.top;
  const position = relY < rect.height / 2 ? 'before' : 'after';

  // Do not show drop indicator if dropping would result in no change
  if (fromIdx === iIdx || (position === 'before' && iIdx === fromIdx + 1) || (position === 'after' && iIdx === fromIdx - 1)) {
    dropTarget.value = null;
    return;
  }

  dropTarget.value = {
    gIdx,
    iIdx,
    position
  };
}

function onDragLeave(event, gIdx, iIdx) {
  const currentTarget = event.currentTarget;
  if (!currentTarget || !event.relatedTarget || !currentTarget.contains(event.relatedTarget)) {
    if (dropTarget.value?.gIdx === gIdx && dropTarget.value?.iIdx === iIdx) {
      dropTarget.value = null;
    }
  }
}

function onDrop(event, gIdx, iIdx) {
  event.preventDefault();
  if (!dragSource.value || dragSource.value.gIdx !== gIdx) {
    resetDrag();
    return;
  }

  const fromIdx = dragSource.value.iIdx;
  const position = dropTarget.value?.position || 'before';
  executeReorder(gIdx, fromIdx, iIdx, position);
  resetDrag();
}

function onContainerDragOver(event, gIdx) {
  if (!dragSource.value || dragSource.value.gIdx !== gIdx) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onContainerDrop(event, gIdx) {
  if (!dragSource.value || dragSource.value.gIdx !== gIdx) {
    resetDrag();
    return;
  }
  const fromIdx = dragSource.value.iIdx;
  const group = groups.value[gIdx];
  if (group && Array.isArray(group.items) && group.items.length > 1) {
    const toIdx = group.items.length - 1;
    if (fromIdx !== toIdx) {
      const [movedItem] = group.items.splice(fromIdx, 1);
      group.items.push(movedItem);
    }
  }
  resetDrag();
}

function onDragEnd() {
  resetDrag();
}

function executeReorder(gIdx, fromIdx, targetIdx, position) {
  if (fromIdx === targetIdx && position === 'before') return;

  let toIdx = targetIdx;
  if (position === 'after') {
    toIdx = targetIdx + 1;
  }
  if (fromIdx < toIdx) {
    toIdx--;
  }

  if (fromIdx !== toIdx) {
    const group = groups.value[gIdx];
    if (group && Array.isArray(group.items) && group.items.length > 1) {
      const [movedItem] = group.items.splice(fromIdx, 1);
      group.items.splice(toIdx, 0, movedItem);
    }
  }
}

function resetDrag() {
  isDragging.value = false;
  activeDragItem.value = null;
  dragSource.value = null;
  dropTarget.value = null;
  window.removeEventListener('mouseup', handleWindowMouseUp);
}

// Touch event handling for mobile devices
let touchStartY = 0;
let touchStartX = 0;
let touchMoved = false;

function handleTouchStart(e, gIdx, iIdx) {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  touchStartY = touch.clientY;
  touchStartX = touch.clientX;
  touchMoved = false;
  activeDragItem.value = { gIdx, iIdx };
  dragSource.value = { gIdx, iIdx };
}

function handleTouchMove(e) {
  if (!activeDragItem.value || e.touches.length !== 1) return;
  const touch = e.touches[0];
  const deltaY = Math.abs(touch.clientY - touchStartY);
  const deltaX = Math.abs(touch.clientX - touchStartX);

  if (!touchMoved && (deltaY > 6 || deltaX > 6)) {
    touchMoved = true;
    isDragging.value = true;
  }

  if (touchMoved) {
    if (e.cancelable) e.preventDefault();

    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRow = elem?.closest('.builder-exercise-row');
    if (targetRow) {
      const gIdx = parseInt(targetRow.getAttribute('data-group-idx'), 10);
      const iIdx = parseInt(targetRow.getAttribute('data-item-idx'), 10);

      if (!isNaN(gIdx) && !isNaN(iIdx) && gIdx === dragSource.value.gIdx) {
        const fromIdx = dragSource.value.iIdx;
        const rect = targetRow.getBoundingClientRect();
        const relY = touch.clientY - rect.top;
        const position = relY < rect.height / 2 ? 'before' : 'after';

        if (fromIdx === iIdx || (position === 'before' && iIdx === fromIdx + 1) || (position === 'after' && iIdx === fromIdx - 1)) {
          dropTarget.value = null;
        } else {
          dropTarget.value = { gIdx, iIdx, position };
        }
        return;
      }
    }
    dropTarget.value = null;
  }
}

function handleTouchEnd() {
  if (touchMoved && isDragging.value && dropTarget.value && dragSource.value) {
    executeReorder(dragSource.value.gIdx, dragSource.value.iIdx, dropTarget.value.iIdx, dropTarget.value.position);
  }
  resetDrag();
}

function handleTouchCancel() {
  resetDrag();
}

onBeforeUnmount(() => {
  resetDrag();
});

async function loadPlan(id, isDuplicate = false) {
  try {
    const plan = await api.getPlanById(id);
    if (plan) {
      if (isDuplicate) {
        planId.value = null;
        const copySuffix = t('builder.copy_suffix', { defaultValue: 'Copia' });
        planName.value = plan.name ? `${plan.name} (${copySuffix})` : '';
        planDesc.value = plan.description || '';
        isPublic.value = false;
      } else {
        planId.value = plan.id;
        planName.value = plan.name || '';
        planDesc.value = plan.description || '';
        isPublic.value = Boolean(plan.is_public);
      }

      const rawGroups = (plan.structure && plan.structure.groups) || [];
      // Normalize and assign fresh unique IDs if duplicating
      groups.value = rawGroups.map((g, gIdx) => ({
        id: isDuplicate ? ('group-' + Date.now() + '-' + gIdx + '-' + Math.random().toString(36).substring(2, 6)) : (g.id || ('group-' + Date.now())),
        title: g.title || '',
        repetitions: Math.max(1, parseInt(g.repetitions, 10) || 1),
        items: (g.items || []).map((item, iIdx) => ({
          id: isDuplicate ? ('item-' + Date.now() + '-' + gIdx + '-' + iIdx + '-' + Math.random().toString(36).substring(2, 6)) : (item.id || ('item-' + Date.now())),
          exercise_id: item.exercise_id || item.exerciseId,
          exerciseId: item.exercise_id || item.exerciseId,
          name: item.name,
          category: item.category,
          type: item.type || 'reps',
          target: item.target !== undefined ? item.target : (item.target_value !== undefined ? item.target_value : (item.type === 'reps' ? 15 : 40)),
          target_value: item.target !== undefined ? item.target : (item.target_value !== undefined ? item.target_value : (item.type === 'reps' ? 15 : 40)),
          restAfter: item.restAfter !== undefined ? item.restAfter : (item.rest_seconds !== undefined ? item.rest_seconds : (item.rest !== undefined ? item.rest : 20)),
          rest_seconds: item.restAfter !== undefined ? item.restAfter : (item.rest_seconds !== undefined ? item.rest_seconds : (item.rest !== undefined ? item.rest : 20)),
          note: item.note || ''
        }))
      }));

      if (isDuplicate) {
        showSnackbar(t('builder.duplicate_notice', { defaultValue: 'Scheda duplicata! Modificala e salvala come nuova.' }));
      }
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
            rest_seconds: parseInt(item.restAfter, 10) || 0,
            note: item.note || ''
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

async function initFromRoute() {
  const id = route.query.id;
  const duplicateFrom = route.query.duplicateFrom || route.query.cloneId;
  if (id) {
    await loadPlan(id, false);
  } else if (duplicateFrom) {
    await loadPlan(duplicateFrom, true);
  } else {
    reset();
  }
}

watch(
  () => [route.query.id, route.query.duplicateFrom, route.query.cloneId],
  async ([newId, dupId, cloneId], [oldId, oldDup, oldClone] = []) => {
    if (newId !== oldId || dupId !== oldDup || cloneId !== oldClone) {
      showLoading();
      try {
        await initFromRoute();
      } finally {
        hideLoading();
      }
    }
  }
);

onMounted(async () => {
  showLoading();
  try {
    availableExercises.value = await api.getExercises();
    await initFromRoute();
  } finally {
    hideLoading();
  }
});
</script>

<style scoped>
/* Group Card */
.builder-group-card {
  background: var(--md-sys-color-surface-container);
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid var(--md-sys-color-outline-variant);
  transition: border-color var(--md-motion-standard);
}

.builder-group-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.builder-group-card__title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1 1 220px;
  min-width: 0;
}

.group-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
  font-size: 22px;
}

.group-title-input {
  font-weight: 700;
  font-size: 1.05rem;
  padding: 0.4rem 0.6rem;
  height: 38px;
  max-width: 280px;
  width: 100%;
  min-width: 0;
}

.builder-group-card__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.builder-group-card__reps {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-right: 0.25rem;
}

.group-reps-label {
  font-size: 0.85rem;
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 600;
}

.group-reps-input {
  width: 54px;
  height: 38px;
  text-align: center;
  padding: 0.15rem;
  font-weight: 700;
}

.builder-exercise-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.builder-add-exercise-wrap {
  margin-top: 0.75rem;
}

/* Exercise Row Base */
.builder-exercise-row {
  position: relative;
  background: var(--md-sys-color-surface-container-high);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  border: 1px solid var(--md-sys-color-outline-variant);
  transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), 
              box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1), 
              opacity 0.2s ease, 
              border-color 0.2s ease;
}

.builder-exercise-row.is-dragging {
  opacity: 0.45;
  border: 1px dashed var(--md-sys-color-primary) !important;
  transform: scale(0.99);
}

.builder-exercise-row.drop-before::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 8px;
  right: 8px;
  height: 4px;
  background-color: var(--md-sys-color-primary);
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(128, 213, 255, 0.7);
  z-index: 10;
  pointer-events: none;
}

.builder-exercise-row.drop-after::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 8px;
  right: 8px;
  height: 4px;
  background-color: var(--md-sys-color-primary);
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(128, 213, 255, 0.7);
  z-index: 10;
  pointer-events: none;
}

/* Exercise Row Layout: Mobile Grid (default) */
.builder-exercise-row__inner {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "title   title"
    "badges  actions"
    "ctrls   ctrls";
  gap: 0.5rem 0.5rem;
  align-items: center;
}

.builder-exercise-row__picker-btn {
  grid-area: title;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.65rem;
  height: 40px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-align: left;
}

.picker-swap-icon {
  font-size: 18px;
  flex-shrink: 0;
  opacity: 0.8;
}

.exercise-name {
  font-weight: 700;
  font-size: 0.92rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.builder-exercise-row__meta {
  grid-area: badges;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  min-width: 0;
}

.builder-eq-badge {
  font-size: 0.68rem;
  padding: 0.1rem 0.35rem;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  flex-shrink: 0;
}

.builder-exercise-row__actions {
  grid-area: actions;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  justify-self: end;
}

.builder-preview-btn,
.builder-delete-btn,
.builder-note-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.builder-note-btn.has-note {
  color: var(--md-sys-color-primary);
}

.builder-exercise-row__controls {
  grid-area: ctrls;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  width: 100%;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.builder-mode-toggle {
  height: 34px;
  flex-shrink: 0;
}

.builder-mode-toggle .md-segmented-button__btn {
  padding: 0.2rem 0.55rem;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Values Container: Always nowrap so target & rest stay on 1 single line */
.builder-exercise-row__values {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: nowrap !important;
  flex-shrink: 0;
}

.builder-value-field {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  white-space: nowrap;
}

.field-icon {
  font-size: 18px;
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

.field-unit {
  font-size: 0.8rem;
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 600;
  flex-shrink: 0;
}

.builder-num-input {
  width: 52px;
  height: 34px;
  text-align: center;
  padding: 0.15rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.drag-handle {
  cursor: grab;
  color: var(--md-sys-color-on-surface-variant);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  border-radius: 6px;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.drag-handle:hover {
  color: var(--md-sys-color-primary);
  background-color: rgba(128, 213, 255, 0.12);
}

.drag-handle:active {
  cursor: grabbing;
}

.exercise-list-move {
  transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.group-list-move {
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.md-btn-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

/* Desktop Layout: >= 880px single flex row */
@media (min-width: 880px) {
  .builder-exercise-row__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: nowrap;
  }

  .builder-exercise-row__picker-btn {
    flex: 1 1 240px;
    max-width: 300px;
    width: auto;
    height: 38px;
  }

  .builder-exercise-row__meta {
    flex-shrink: 0;
  }

  .builder-exercise-row__controls {
    width: auto;
    padding-top: 0;
    border-top: none;
    gap: 0.75rem;
    flex-shrink: 0;
    justify-content: flex-end;
  }
}

/* Tablet & Mobile Breakpoints for outer containers & cards */
@media (max-width: 768px) {
  .builder-card {
    padding: 1rem 0.75rem !important;
    border-radius: 16px !important;
  }

  .builder-group-card {
    padding: 0.85rem 0.65rem;
    border-radius: 14px;
  }

  .builder-exercise-row {
    padding: 0.65rem 0.55rem;
  }
}

@media (max-width: 640px) {
  .builder-header__title {
    font-size: 1.5rem !important;
  }

  .builder-group-card__title-row {
    flex: 1 1 100%;
    width: 100%;
  }

  .group-title-input {
    max-width: 100%;
    width: 100%;
  }

  .builder-group-card__actions {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .builder-card {
    padding: 0.75rem 0.5rem !important;
  }

  .builder-group-card {
    padding: 0.75rem 0.5rem;
    border-radius: 12px;
  }

  .builder-exercise-row {
    padding: 0.6rem 0.45rem;
  }

  .builder-exercise-row__values {
    gap: 0.4rem;
  }

  .builder-num-input {
    width: 48px;
  }
}
</style>
