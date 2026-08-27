<template>
  <aside class="md-nav-rail">
    <div class="md-nav-rail__header">
      <router-link to="/" style="text-decoration: none; color: inherit;">
        <span class="material-symbols-rounded brand-flame" style="color: var(--md-sys-color-primary); font-size: 2rem;">local_fire_department</span>
      </router-link>
    </div>

    <div class="md-nav-rail__items">
      <router-link to="/" class="md-nav-rail__item" :class="{ active: currentRoute === 'dashboard' }">
        <div class="md-nav-rail__indicator">
          <span class="material-symbols-rounded" :class="{ filled: currentRoute === 'dashboard' }">grid_view</span>
        </div>
        <span class="md-nav-rail__label">{{ t('app.nav_label.dashboard') }}</span>
      </router-link>

      <router-link to="/builder" class="md-nav-rail__item" :class="{ active: currentRoute === 'builder' }">
        <div class="md-nav-rail__indicator">
          <span class="material-symbols-rounded" :class="{ filled: currentRoute === 'builder' }">bolt</span>
        </div>
        <span class="md-nav-rail__label">{{ t('app.nav_label.builder') }}</span>
      </router-link>

      <router-link to="/editor" class="md-nav-rail__item" :class="{ active: currentRoute === 'editor' }">
        <div class="md-nav-rail__indicator">
          <span class="material-symbols-rounded" :class="{ filled: currentRoute === 'editor' }">accessibility_new</span>
        </div>
        <span class="md-nav-rail__label">{{ t('app.nav_label.editor') }}</span>
      </router-link>

      <router-link to="/library" class="md-nav-rail__item" :class="{ active: currentRoute === 'library' }">
        <div class="md-nav-rail__indicator">
          <span class="material-symbols-rounded" :class="{ filled: currentRoute === 'library' }">fitness_center</span>
        </div>
        <span class="md-nav-rail__label">{{ t('app.nav_label.library') }}</span>
      </router-link>
    </div>

    <div class="md-nav-rail__footer">
      <button 
        type="button" 
        class="md-nav-rail__item" 
        :title="currentLang === 'it' ? 'Passa a Inglese' : 'Switch to English'"
        @click="toggleLanguage"
      >
        <div class="md-nav-rail__indicator">
          <span class="material-symbols-rounded">language</span>
        </div>
        <span class="md-nav-rail__label" style="font-weight: 700;">{{ currentLang === 'it' ? 'IT' : 'EN' }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '../../composables/useI18n.js';

const route = useRoute();
const { currentLang, setLanguage, t } = useI18n();

const currentRoute = computed(() => {
  const path = route.path.toLowerCase();
  if (path.includes('builder')) return 'builder';
  if (path.includes('editor')) return 'editor';
  if (path.includes('library')) return 'library';
  if (path.includes('admin')) return 'admin';
  if (path.includes('player')) return 'player';
  return 'dashboard';
});

function toggleLanguage() {
  setLanguage(currentLang.value === 'it' ? 'en' : 'it');
}
</script>
