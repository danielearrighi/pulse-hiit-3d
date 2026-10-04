<template>
  <main class="content-container">
    <div class="library-header" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;">
      <div>
        <h1 class="library-header__title">{{ t('library.title') }}</h1>
        <p class="library-header__subtitle">
          {{ t('library.subtitle') }}
        </p>
      </div>
      <router-link to="/editor" class="md-btn md-btn-filled" style="height: 44px; text-decoration: none;">
        <span class="material-symbols-rounded">add</span>
        <span>{{ t('app.nav_label.editor') }}</span>
      </router-link>
    </div>

    <!-- Filter & Sort Toolbar -->
    <div class="library-toolbar">
      <div class="filter-chips-bar">
        <button 
          type="button" 
          class="md-chip" 
          :class="{ active: currentCategory === 'All' }"
          @click="currentCategory = 'All'"
        >
          {{ t('categories.All', { defaultValue: 'Tutti' }) }}
        </button>
        <button 
          v-for="cat in categories" 
          :key="cat.id" 
          type="button" 
          class="md-chip"
          :class="{ active: currentCategory === cat.id }"
          @click="currentCategory = cat.id"
        >
          {{ getCategoryName(cat.id) }}
        </button>
      </div>

      <div class="library-sort">
        <div class="md-segmented-button" role="group" :aria-label="t('library.sort_label', { defaultValue: 'Ordina esercizi' })">
          <button
            type="button"
            class="md-segmented-button__btn"
            :class="{ active: sortMode === 'date' }"
            :title="t('library.sort_by_date', { defaultValue: 'Data inserimento' })"
            :aria-label="t('library.sort_by_date', { defaultValue: 'Data inserimento' })"
            :aria-pressed="sortMode === 'date'"
            @click="sortMode = 'date'"
          >
            <span class="material-symbols-rounded">schedule</span>
          </button>
          <button
            type="button"
            class="md-segmented-button__btn"
            :class="{ active: sortMode === 'name' }"
            :title="t('library.sort_by_name', { defaultValue: 'Alfabetico' })"
            :aria-label="t('library.sort_by_name', { defaultValue: 'Alfabetico' })"
            :aria-pressed="sortMode === 'name'"
            @click="sortMode = 'name'"
          >
            <span class="material-symbols-rounded">sort_by_alpha</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Exercises Grid -->
    <section class="exercises-grid">
      <div 
        v-for="ex in filteredExercises" 
        :key="ex.id" 
        class="exercise-card md-ripple-surface"
      >
        <div class="exercise-card__header">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <h3 class="exercise-card__title">{{ getDisplayName(ex) }}</h3>
            <span v-if="ex.is_private" class="badge-private" style="font-size: 0.7rem; padding: 2px 7px;">
              <span class="material-symbols-rounded" style="font-size: 13px;">visibility_off</span>
              {{ t('library.private_badge', { defaultValue: 'Privato' }) }}
            </span>
          </div>
          <span class="md-badge" :class="getCategoryBadgeClass(ex.category)" style="font-size: 0.68rem; padding: 0.15rem 0.5rem;">
            {{ getCategoryName(ex.category) }}
          </span>
        </div>

        <div v-if="getExerciseEquipment(ex).length > 0" style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.5rem; margin-top: 0.3rem;">
          <span v-for="(eq, eqIdx) in getExerciseEquipment(ex)" :key="eqIdx" class="md-badge" style="font-size: 0.68rem; padding: 0.15rem 0.45rem; background-color: var(--md-sys-color-surface-container-high); color: var(--md-sys-color-on-surface);">
            {{ getEquipmentEmoji(eq) }} {{ getEquipmentName(eq) }}
          </span>
        </div>

        <p v-if="ex.notes" class="exercise-card__notes">{{ ex.notes }}</p>
        <p v-else class="exercise-card__notes" style="opacity: 0.5; font-style: italic;">
          {{ t('library.no_notes', { defaultValue: 'Nessuna nota posturale' }) }}
        </p>

        <div class="exercise-card__footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
          <button type="button" class="md-btn md-btn-tonal" @click="openPreviewModal(ex)">
            <span class="material-symbols-rounded">visibility</span>
            <span>{{ t('library.preview_btn', { defaultValue: 'Anteprima 3D' }) }}</span>
          </button>

          <div v-if="canEditOrDelete(ex)" style="display: flex; gap: 0.25rem;">
            <router-link 
              :to="`/editor?id=${ex.id}`" 
              class="md-btn-icon" 
              :title="t('library.edit_btn', { defaultValue: 'Modifica Esercizio' })" 
              :aria-label="t('library.edit_btn', { defaultValue: 'Modifica Esercizio' })" 
              style="text-decoration: none;"
            >
              <span class="material-symbols-rounded">edit</span>
            </router-link>
            <button 
              type="button" 
              class="md-btn-icon" 
              :title="t('library.delete_btn', { defaultValue: 'Elimina Esercizio' })" 
              :aria-label="t('library.delete_btn', { defaultValue: 'Elimina Esercizio' })" 
              @click="confirmDelete(ex)"
            >
              <span class="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 3D Preview Modal Dialog -->
    <ModalDialog v-model="showPreviewModal" :title="getDisplayName(previewExercise)">
      <div v-if="previewExercise">
        <div class="preview-canvas-wrap" style="height: 340px; background: #000; border-radius: 12px; overflow: hidden;">
          <MannequinPreview :keyframes="previewExercise.keyframes" :equipment="previewExercise.equipment" :duration="previewExercise.duration || 0.8" />
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

    <!-- Delete Exercise Confirmation Dialog -->
    <ModalDialog v-model="showDeleteModal" :title="t('library.delete_btn')">
      <div style="color: var(--md-sys-color-on-surface-variant); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">
        <p v-if="affectedPlans.length === 0" style="margin: 0;">
          {{ t('library.confirm_delete_msg', { name: getDisplayName(exerciseToDelete), defaultValue: `Sei sicuro di voler eliminare l'esercizio "${getDisplayName(exerciseToDelete)}"?` }) }}
        </p>
        <div v-else>
          <p style="margin: 0 0 0.75rem 0; color: var(--md-sys-color-error, #ba1a1a); font-weight: 600;">
            {{ affectedPlans.length === 1 
              ? `Attenzione! L'esercizio "${getDisplayName(exerciseToDelete)}" è associato a 1 scheda HIIT:` 
              : `Attenzione! L'esercizio "${getDisplayName(exerciseToDelete)}" è associato a ${affectedPlans.length} schede HIIT:` }}
          </p>
          <ul style="margin: 0 0 0.75rem 1.25rem; padding: 0; font-weight: 500;">
            <li v-for="plan in affectedPlans" :key="plan.id">
              {{ plan.name }}
            </li>
          </ul>
          <p style="margin: 0; font-size: 0.88rem; opacity: 0.9;">
            Eliminandolo, verrà rimosso automaticamente anche dalle schede sopra indicate. Sei sicuro di voler continuare?
          </p>
        </div>
      </div>
      <template #actions>
        <button type="button" class="md-btn md-btn-text" @click="showDeleteModal = false">
          {{ t('builder.cancel', { defaultValue: 'Annulla' }) }}
        </button>
        <button type="button" class="md-btn md-btn-danger" :disabled="isDeleting" @click="handleDeleteExercise">
          {{ isDeleting ? 'Eliminazione...' : t('library.delete_btn') }}
        </button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../services/api.js';
import { useAuth } from '../composables/useAuth.js';
import { useI18n } from '../composables/useI18n.js';
import { useCategories } from '../composables/useCategories.js';
import { useExerciseSort } from '../composables/useExerciseSort.js';
import { useSnackbar } from '../composables/useSnackbar.js';
import { useLoading } from '../composables/useLoading.js';
import ModalDialog from '../components/ui/ModalDialog.vue';
import MannequinPreview from '../components/mannequin/MannequinPreview.vue';

const { currentUser, canManage3D } = useAuth();
const { t } = useI18n();
const { categories, getCategoryName, getCategoryBadgeClass } = useCategories();
const { sortMode } = useExerciseSort();
const { showSnackbar } = useSnackbar();
const { showLoading, hideLoading } = useLoading();

const exercises = ref([]);
const currentCategory = ref('All');
const previewExercise = ref(null);
const showPreviewModal = ref(false);
const exerciseToDelete = ref(null);
const showDeleteModal = ref(false);
const affectedPlans = ref([]);
const isDeleting = ref(false);

function getDisplayName(ex) {
  if (!ex) return '';
  if (ex.is_standard) {
    const tr = t(`exercises.${ex.name}`);
    if (tr && tr !== `exercises.${ex.name}`) return tr;
  }
  return ex.name;
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

function getEquipmentType(eq) {
  return typeof eq === 'string' ? eq : (eq.type || '');
}

function getEquipmentEmoji(eq) {
  const type = getEquipmentType(eq);
  if (type === 'dumbbells') return '🏋️';
  if (type === 'ball') return '⚽';
  if (type === 'step') return '🪜';
  return '📦';
}

function getEquipmentName(eq) {
  const type = getEquipmentType(eq);
  if (type === 'dumbbells') return t('editor.prop_dumbbells', { defaultValue: 'Manubri' });
  if (type === 'ball') return t('editor.prop_ball', { defaultValue: 'Palla' });
  if (type === 'step') return t('editor.prop_step', { defaultValue: 'Gradino' });
  return type;
}

const filteredExercises = computed(() => {
  const list = currentCategory.value === 'All'
    ? exercises.value
    : exercises.value.filter(e => e.category === currentCategory.value);

  const sorted = [...list];
  if (sortMode.value === 'date') {
    // Più recenti in alto; gli esercizi senza data finiscono in fondo.
    sorted.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  } else {
    sorted.sort((a, b) =>
      getDisplayName(a).localeCompare(getDisplayName(b), undefined, { sensitivity: 'base' })
    );
  }
  return sorted;
});

function canEditOrDelete(ex) {
  if (!currentUser.value) return false;
  if (canManage3D.value) return true;
  if (ex.is_standard) return false;
  return ex.user_id === currentUser.value.id;
}

async function fetchExercises() {
  showLoading();
  try {
    exercises.value = await api.getExercises();
  } catch (err) {
    showSnackbar('Impossibile caricare gli esercizi');
  } finally {
    hideLoading();
  }
}

function openPreviewModal(ex) {
  previewExercise.value = ex;
  showPreviewModal.value = true;
}

async function confirmDelete(ex) {
  exerciseToDelete.value = ex;
  affectedPlans.value = [];
  try {
    const plans = await api.getExerciseUsage(ex.id);
    affectedPlans.value = plans || [];
  } catch (e) {
    affectedPlans.value = [];
  }
  showDeleteModal.value = true;
}

async function handleDeleteExercise() {
  if (!exerciseToDelete.value) return;
  isDeleting.value = true;
  try {
    await api.deleteExercise(exerciseToDelete.value.id);
    showDeleteModal.value = false;
    showSnackbar('Esercizio eliminato con successo!');
    exerciseToDelete.value = null;
    affectedPlans.value = [];
    await fetchExercises();
  } catch (err) {
    showSnackbar(err.message || 'Impossibile eliminare l\'esercizio');
  } finally {
    isDeleting.value = false;
  }
}

onMounted(() => {
  fetchExercises();
});
</script>
