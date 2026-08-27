<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="md-dialog-backdrop open active" @click.self="close">
        <div class="md-dialog exercise-picker-dialog">
          <div class="md-dialog__header">
            <h3 class="md-dialog__title">{{ t('builder.select_exercise_title') }}</h3>
            <button type="button" class="md-btn-icon" aria-label="Chiudi" @click="close">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <!-- Search Box -->
          <div class="exercise-picker-search-wrap">
            <span class="material-symbols-rounded exercise-picker-search-icon">search</span>
            <input 
              v-model="searchQuery" 
              type="text" 
              class="exercise-picker-search-input" 
              :placeholder="t('builder.search_exercise_placeholder', { defaultValue: 'Cerca per nome, categoria o nota...' })"
              autocomplete="off"
            />
            <button 
              v-if="searchQuery" 
              type="button" 
              class="md-btn-icon exercise-picker-clear-btn" 
              aria-label="Cancella ricerca"
              @click="searchQuery = ''"
            >
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <!-- Category Filter Chips -->
          <div class="filter-chips-bar exercise-picker-chips">
            <button 
              type="button" 
              class="md-chip" 
              :class="{ active: selectedCategory === 'All' }"
              @click="selectedCategory = 'All'"
            >
              {{ t('categories.All', { defaultValue: 'Tutti' }) }}
            </button>
            <button 
              v-for="cat in categories" 
              :key="cat.id" 
              type="button" 
              class="md-chip"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              {{ getCategoryName(cat.id) }}
            </button>
          </div>

          <!-- Results Count Bar -->
          <div class="exercise-picker-count" style="font-size: 0.82rem; color: var(--md-sys-color-on-surface-variant); padding: 0 0.5rem 0.5rem 0.5rem;">
            {{ filteredExercises.length }} {{ t('builder.exercises_found', { defaultValue: 'esercizi trovati' }) }}
          </div>

          <!-- Exercise Items List -->
          <div class="exercise-picker-list" style="max-height: 55vh; overflow-y: auto;">
            <div 
              v-for="ex in filteredExercises" 
              :key="ex.id" 
              class="exercise-picker-item md-ripple-surface"
              :class="{ selected: selectedExerciseId === ex.id }"
              @click="selectExercise(ex)"
            >
              <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1;">
                <span class="exercise-picker-item__name" style="font-weight: 700; font-size: 0.95rem; white-space: nowrap; flex-shrink: 0;">
                  {{ getDisplayName(ex) }}
                </span>
                <span v-if="ex.is_private" class="badge-private" style="font-size: 0.7rem; padding: 1px 6px; flex-shrink: 0;">
                  {{ t('library.private_badge', { defaultValue: 'Privato' }) }}
                </span>
                <span class="md-badge" :class="getCategoryBadgeClass(ex.category)" style="flex-shrink: 0;">
                  {{ getCategoryName(ex.category) }}
                </span>
                <span v-if="ex.notes" style="font-size: 0.8rem; color: var(--md-sys-color-on-surface-variant); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1;">
                  {{ ex.notes }}
                </span>
              </div>

              <div class="exercise-picker-item__actions" style="display: flex; align-items: center; flex-shrink: 0; margin-left: 0.5rem;">
                <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 22px;">
                  {{ selectedExerciseId === ex.id ? 'check_circle' : 'add_circle' }}
                </span>
              </div>
            </div>

            <div v-if="filteredExercises.length === 0" style="text-align: center; padding: 2rem; color: var(--md-sys-color-on-surface-variant);">
              <span class="material-symbols-rounded" style="font-size: 2.5rem; opacity: 0.5;">search_off</span>
              <p style="margin-top: 0.5rem;">{{ t('builder.no_exercises_found', { defaultValue: 'Nessun esercizio trovato' }) }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../../composables/useI18n.js';
import { useCategories } from '../../composables/useCategories.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  exercises: {
    type: Array,
    default: () => []
  },
  selectedExerciseId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'select']);

const { t } = useI18n();
const { categories, getCategoryName, getCategoryBadgeClass } = useCategories();

const searchQuery = ref('');
const selectedCategory = ref('All');

function close() {
  emit('update:modelValue', false);
}

function getDisplayName(ex) {
  if (!ex) return '';
  if (ex.is_standard) {
    const tr = t(`exercises.${ex.name}`);
    if (tr && tr !== `exercises.${ex.name}`) return tr;
  }
  return ex.name;
}

const filteredExercises = computed(() => {
  let list = props.exercises || [];
  if (selectedCategory.value !== 'All') {
    list = list.filter(ex => ex.category === selectedCategory.value);
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(ex => {
      const name = getDisplayName(ex).toLowerCase();
      const cat = (ex.category || '').toLowerCase();
      const notes = (ex.notes || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || notes.includes(q);
    });
  }
  return list;
});

function selectExercise(ex) {
  emit('select', ex);
  close();
}
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
