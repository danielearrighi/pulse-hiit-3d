<template>
  <nav class="md-bottom-nav">
    <router-link to="/" class="md-bottom-nav__item" :class="{ active: currentRoute === 'dashboard' }">
      <div class="md-bottom-nav__indicator">
        <span class="material-symbols-rounded" :class="{ filled: currentRoute === 'dashboard' }">grid_view</span>
      </div>
      <span class="md-bottom-nav__label">{{ t('app.nav_label.dashboard') }}</span>
    </router-link>

    <router-link to="/builder" class="md-bottom-nav__item" :class="{ active: currentRoute === 'builder' }">
      <div class="md-bottom-nav__indicator">
        <span class="material-symbols-rounded" :class="{ filled: currentRoute === 'builder' }">bolt</span>
      </div>
      <span class="md-bottom-nav__label">{{ t('app.nav_label.builder') }}</span>
    </router-link>

    <router-link to="/editor" class="md-bottom-nav__item" :class="{ active: currentRoute === 'editor' }">
      <div class="md-bottom-nav__indicator">
        <span class="material-symbols-rounded" :class="{ filled: currentRoute === 'editor' }">accessibility_new</span>
      </div>
      <span class="md-bottom-nav__label">{{ t('app.nav_label.editor') }}</span>
    </router-link>

    <router-link to="/library" class="md-bottom-nav__item" :class="{ active: currentRoute === 'library' }">
      <div class="md-bottom-nav__indicator">
        <span class="material-symbols-rounded" :class="{ filled: currentRoute === 'library' }">fitness_center</span>
      </div>
      <span class="md-bottom-nav__label">{{ t('app.nav_label.library') }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '../../composables/useI18n.js';

const route = useRoute();
const { t } = useI18n();

const currentRoute = computed(() => {
  const path = route.path.toLowerCase();
  if (path.includes('builder')) return 'builder';
  if (path.includes('editor')) return 'editor';
  if (path.includes('library')) return 'library';
  if (path.includes('admin')) return 'admin';
  if (path.includes('player')) return 'player';
  return 'dashboard';
});
</script>
