(function() {
  if (window.Categories) return;

  const DEFAULT_CATEGORIES = [
    { id: 'Cardio', name_it: 'Cardio', name_en: 'Cardio', icon: 'directions_run' },
    { id: 'Legs', name_it: 'Gambe', name_en: 'Legs', icon: 'directions_walk' },
    { id: 'Abs', name_it: 'Addominali', name_en: 'Abs', icon: 'fitness_center' },
    { id: 'Arms', name_it: 'Braccia', name_en: 'Arms', icon: 'fitness_center' },
    { id: 'Back', name_it: 'Dorsali', name_en: 'Back', icon: 'sports_gymnastics' },
    { id: 'Full Body', name_it: 'Corpo Libero', name_en: 'Full Body', icon: 'accessibility_new' },
    { id: 'Rest', name_it: 'Riposo', name_en: 'Rest', icon: 'self_improvement' }
  ];

  class CategoriesManager {
    constructor() {
      this.categories = DEFAULT_CATEGORIES;
      this.initialized = false;

      // Synchronous instant cache retrieval (0ms latency, zero flash)
      try {
        const cached = localStorage.getItem('app_categories');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.categories = this.normalizeCategories(parsed);
            this.initialized = true;
          }
        }
      } catch (e) {
        console.warn('[Categories] Failed reading cache from localStorage:', e);
      }
    }

    normalizeCategories(list) {
      if (!Array.isArray(list)) return DEFAULT_CATEGORIES;
      return list.map(item => {
        if (typeof item === 'string') {
          return {
            id: item,
            name_it: item,
            name_en: item,
            icon: 'fitness_center'
          };
        }
        const id = item.id || item.key || item.name || item.name_en || item.name_it;
        const name_it = item.name_it || (item.translations && item.translations.it) || item.name || id;
        const name_en = item.name_en || (item.translations && item.translations.en) || item.name || id;
        const icon = item.icon || 'fitness_center';
        return { id, name_it, name_en, icon, ...item };
      });
    }

    async init() {
      await this.loadCategories();
    }

    async loadCategories() {
      try {
        const res = await fetch('/data/categories.json?v=2026.2');
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.categories = this.normalizeCategories(data);
          this.initialized = true;
          try {
            localStorage.setItem('app_categories', JSON.stringify(this.categories));
          } catch (e) {
            console.warn('[Categories] Could not write to localStorage:', e);
          }
          window.dispatchEvent(new CustomEvent('categoriesChanged', { detail: { categories: this.categories } }));
        }
      } catch (err) {
        console.warn('[Categories] Failed loading /data/categories.json, using cached/defaults:', err);
      }
    }

    getAll() {
      return this.categories;
    }

    getSelectable() {
      return this.categories;
    }

    getName(id, lang) {
      if (!id) return '';
      const currentLang = lang || (window.i18n ? window.i18n.currentLang : 'it');
      
      // 1. Try i18n translation key if available
      if (window.t) {
        const tr = window.t(`categories.${id}`);
        if (tr && tr !== `categories.${id}`) {
          return tr;
        }
      }

      // 2. Lookup in categories array
      const found = this.categories.find(c => c.id === id || c.name === id || c.name_it === id || c.name_en === id);
      if (found) {
        if (currentLang === 'en') {
          return found.name_en || found.name || found.id;
        }
        return found.name_it || found.name || found.id;
      }

      return id;
    }

    populateSelect(selectEl, selectedValue) {
      if (!selectEl) return;
      const current = selectedValue !== undefined ? selectedValue : selectEl.value;
      const list = this.getAll();

      selectEl.innerHTML = list.map(c => {
        const isSelected = (c.id === current || c.name_it === current || c.name_en === current) ? 'selected' : '';
        const displayName = this.getName(c.id);
        return `<option value="${c.id}" data-i18n="categories.${c.id}" ${isSelected}>${displayName}</option>`;
      }).join('');

      if (current) {
        selectEl.value = current;
      }
    }

    renderFilterChips(containerEl, activeCategory, onChipClick) {
      if (!containerEl) return;
      const currentCat = activeCategory || 'All';
      const t = window.t || (k => k);
      const allLabel = t('categories.All', { defaultValue: 'Tutti' });

      let html = `<button type="button" class="md-chip ${currentCat === 'All' ? 'active' : ''}" data-category="All" data-i18n="categories.All">${allLabel}</button>`;

      this.getAll().forEach(c => {
        const isActive = currentCat === c.id;
        const name = this.getName(c.id);
        html += `<button type="button" class="md-chip ${isActive ? 'active' : ''}" data-category="${c.id}" data-i18n="categories.${c.id}">${name}</button>`;
      });

      containerEl.innerHTML = html;

      if (typeof onChipClick === 'function') {
        containerEl.querySelectorAll('.md-chip').forEach(chip => {
          chip.addEventListener('click', (e) => {
            const cat = chip.getAttribute('data-category') || 'All';
            onChipClick(cat, chip);
          });
        });
      }
    }
  }

  window.Categories = new CategoriesManager();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.Categories.init();
    });
  } else {
    window.Categories.init();
  }
})();
