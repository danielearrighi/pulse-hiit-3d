import { ref, shallowRef } from 'vue';
import { useI18n } from './useI18n.js';

const DEFAULT_CATEGORIES = [
  { id: 'Cardio', name_it: 'Cardio', name_en: 'Cardio', icon: 'directions_run' },
  { id: 'Legs', name_it: 'Gambe', name_en: 'Legs', icon: 'directions_walk' },
  { id: 'Abs', name_it: 'Addominali', name_en: 'Abs', icon: 'fitness_center' },
  { id: 'Arms', name_it: 'Braccia', name_en: 'Arms', icon: 'fitness_center' },
  { id: 'Back', name_it: 'Dorsali', name_en: 'Back', icon: 'sports_gymnastics' },
  { id: 'Full Body', name_it: 'Corpo Libero', name_en: 'Full Body', icon: 'accessibility_new' },
  { id: 'Rest', name_it: 'Riposo', name_en: 'Rest', icon: 'self_improvement' }
];

const categories = shallowRef(DEFAULT_CATEGORIES);
const isInitialized = ref(false);

// Instant synchronous cache retrieval
try {
  const cached = localStorage.getItem('app_categories');
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.length > 0) {
      categories.value = parsed;
      isInitialized.value = true;
    }
  }
} catch (e) {
  console.warn('[useCategories] Failed reading cache:', e);
}

export function useCategories() {
  const { currentLang, t } = useI18n();

  function normalize(list) {
    if (!Array.isArray(list)) return DEFAULT_CATEGORIES;
    return list.map(item => {
      if (typeof item === 'string') {
        return { id: item, name_it: item, name_en: item, icon: 'fitness_center' };
      }
      const id = item.id || item.key || item.name || item.name_en || item.name_it;
      const name_it = item.name_it || (item.translations && item.translations.it) || item.name || id;
      const name_en = item.name_en || (item.translations && item.translations.en) || item.name || id;
      const icon = item.icon || 'fitness_center';
      return { id, name_it, name_en, icon, ...item };
    });
  }

  async function loadCategories() {
    try {
      const res = await fetch('/data/categories.json?v=2026.2');
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        categories.value = normalize(data);
        isInitialized.value = true;
        try {
          localStorage.setItem('app_categories', JSON.stringify(categories.value));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('[useCategories] Failed loading categories.json:', err);
    }
  }

  function getCategoryName(id) {
    if (!id) return '';
    const tr = t(`categories.${id}`);
    if (tr && tr !== `categories.${id}`) {
      return tr;
    }
    const found = categories.value.find(c => c.id === id || c.name === id || c.name_it === id || c.name_en === id);
    if (found) {
      return currentLang.value === 'en' ? (found.name_en || found.name || found.id) : (found.name_it || found.name || found.id);
    }
    return id;
  }

  function getCategoryIcon(id) {
    const found = categories.value.find(c => c.id === id);
    return found ? found.icon : 'fitness_center';
  }

  function getCategoryBadgeClass(category) {
    switch (category) {
      case 'Cardio': return 'md-badge-cardio';
      case 'Legs': return 'md-badge-legs';
      case 'Abs': return 'md-badge-abs';
      case 'Arms': return 'md-badge-arms';
      case 'Back': return 'md-badge-back';
      case 'Full Body': return 'md-badge-fullbody';
      case 'Rest': return 'md-badge-rest';
      default: return 'md-badge-tonal';
    }
  }

  return {
    categories,
    isInitialized,
    loadCategories,
    getCategoryName,
    getCategoryIcon,
    getCategoryBadgeClass
  };
}
