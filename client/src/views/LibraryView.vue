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

    <!-- Filter Chips Bar -->
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
              class="md-btn-icon md-btn-danger" 
              :title="t('library.delete_btn', { defaultValue: 'Elimina' })" 
              :aria-label="t('library.delete_btn', { defaultValue: 'Elimina' })" 
              @click="confirmDelete(ex)"
            >
              <span class="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 3D Preview Modal Dialog -->
    <ModalDialog v-model="showPreviewModal" :title="previewExercise ? getDisplayName(previewExercise) : ''" custom-style="max-width: 560px;">
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
import { useSnackbar } from '../composables/useSnackbar.js';
import ModalDialog from '../components/ui/ModalDialog.vue';
import MannequinPreview from '../components/mannequin/MannequinPreview.vue';

const { currentUser, canManage3D } = useAuth();
const { t } = useI18n();
const { categories, getCategoryName, getCategoryBadgeClass } = useCategories();
const { showSnackbar } = useSnackbar();

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

const filteredExercises = computed(() => {
  if (currentCategory.value === 'All') return exercises.value;
  return exercises.value.filter(e => e.category === currentCategory.value);
});

function canEditOrDelete(ex) {
  if (!currentUser.value) return false;
  if (canManage3D.value) return true;
  if (ex.is_standard) return false;
  return ex.user_id === currentUser.value.id;
}

async function fetchExercises() {
  try {
    exercises.value = await api.getExercises();
  } catch (err) {
    showSnackbar('Impossibile caricare gli esercizi');
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
