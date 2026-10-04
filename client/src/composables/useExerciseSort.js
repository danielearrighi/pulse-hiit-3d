import { ref, watch } from 'vue';

const STORAGE_KEY = 'app_exercise_sort';
const VALID_MODES = ['date', 'name'];

function readStoredMode(fallback) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.includes(stored) ? stored : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Preferenza di ordinamento degli esercizi, persistita in localStorage.
 * Valori ammessi: 'date' (più recenti in alto) | 'name' (alfabetico).
 */
export function useExerciseSort(defaultValue = 'date') {
  const sortMode = ref(readStoredMode(defaultValue));

  watch(sortMode, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      console.warn('[useExerciseSort] Could not write to localStorage:', e);
    }
  });

  return { sortMode };
}
