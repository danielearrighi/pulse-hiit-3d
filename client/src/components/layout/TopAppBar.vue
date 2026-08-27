<template>
  <header class="md-top-app-bar">
    <div class="md-top-app-bar__leading">
      <router-link to="/" class="md-top-app-bar__logo">
        <span class="material-symbols-rounded brand-flame" style="color: var(--md-sys-color-primary);">local_fire_department</span>
        <span class="brand-title">Pulse HIIT 3D</span>
      </router-link>
    </div>

    <div class="md-top-app-bar__actions">
      <div v-if="currentUser">
        <button 
          type="button" 
          class="user-profile-chip md-ripple-surface" 
          :title="t('app.auth.profile_title')"
          @click="$emit('open-profile')"
        >
          <span class="material-symbols-rounded filled" style="font-size: 20px; color: var(--md-sys-color-primary);">account_circle</span>
          <span class="user-profile-chip__name">{{ currentUser.username }}</span>
          <span v-if="isAdmin" class="md-badge md-badge-primary" style="font-size: 0.65rem; padding: 1px 6px;">Admin</span>
          <span v-else-if="isSuperUser" class="md-badge md-badge-super" style="font-size: 0.65rem; padding: 1px 6px;">Super</span>
        </button>
      </div>

      <div v-else>
        <button 
          class="md-btn md-btn-filled" 
          style="height: 38px; padding: 0 1rem; font-size: 0.88rem;"
          @click="$emit('open-auth')"
        >
          <span class="material-symbols-rounded" style="font-size: 18px;">login</span>
          <span>{{ t('app.auth.login') }}</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuth } from '../../composables/useAuth.js';
import { useI18n } from '../../composables/useI18n.js';

defineEmits(['open-auth', 'open-profile']);

const { currentUser, isAdmin, isSuperUser } = useAuth();
const { t } = useI18n();
</script>
