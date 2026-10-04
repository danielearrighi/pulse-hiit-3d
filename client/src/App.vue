<template>
  <!-- Global fullscreen loading overlay -->
  <LoadingOverlay />

  <!-- Fullscreen Player mode (no app chrome) -->
  <div v-if="isPlayerView" class="player-wrapper">
    <router-view />
    <Snackbar />
  </div>

  <!-- Standard App Layout with Material 3 Navigation Rail / Bar -->
  <div v-else class="app-layout">
    <!-- Desktop Navigation Rail -->
    <NavRail />

    <div class="main-wrapper">
      <!-- Top App Bar -->
      <TopAppBar 
        @open-auth="showAuthModal = true" 
        @open-profile="showProfileSheet = true" 
      />

      <!-- Main Content / Router View -->
      <router-view @open-auth="showAuthModal = true" />

      <!-- Mobile Bottom Navigation -->
      <BottomNav />
    </div>

    <!-- Auth Modal (Login / Register) -->
    <AuthModal v-model="showAuthModal" />

    <!-- User Profile Sheet -->
    <ProfileSheet v-model="showProfileSheet" />

    <!-- Global Material 3 Snackbar Notifications -->
    <Snackbar />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from './composables/useAuth.js';
import { useI18n } from './composables/useI18n.js';
import { useCategories } from './composables/useCategories.js';
import { useLoading } from './composables/useLoading.js';
import { waitForFonts } from './services/fonts.js';

import LoadingOverlay from './components/ui/LoadingOverlay.vue';
import NavRail from './components/layout/NavRail.vue';
import TopAppBar from './components/layout/TopAppBar.vue';
import BottomNav from './components/layout/BottomNav.vue';
import AuthModal from './components/auth/AuthModal.vue';
import ProfileSheet from './components/auth/ProfileSheet.vue';
import Snackbar from './components/ui/Snackbar.vue';

const route = useRoute();
const { fetchMe } = useAuth();
const { init: initI18n } = useI18n();
const { loadCategories } = useCategories();
const { showLoading, hideLoading } = useLoading();

const showAuthModal = ref(false);
const showProfileSheet = ref(false);

const isPlayerView = computed(() => {
  return route.name === 'player' || route.path.startsWith('/player');
});

onMounted(async () => {
  // Mostra subito il loader: evita di vedere icone/testi "sporchi" prima dei font.
  showLoading();

  // 1) Attende il caricamento completo dei web font (Google Fonts + Material Symbols).
  await waitForFonts();

  // 2) Solo dopo, carica i dati iniziali dell'app.
  await Promise.all([
    initI18n(),
    fetchMe(),
    loadCategories()
  ]);

  // 3) Un frame per assicurare il primo paint con i font corretti, poi rivela l'app.
  requestAnimationFrame(() => hideLoading());
});
</script>

<style>
/* App root level styling if needed */
.player-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
