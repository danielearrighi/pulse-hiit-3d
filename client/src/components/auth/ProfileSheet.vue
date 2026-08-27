<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="modelValue" class="md-sheet-backdrop open active" @click.self="close">
        <div class="md-bottom-sheet" style="max-width: 480px; margin: 0 auto; left: 0; right: 0;">
          <div class="md-sheet__handle"></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--md-sys-color-on-surface); margin: 0;">
              {{ t('app.auth.profile_title', { defaultValue: 'Profilo & Impostazioni' }) }}
            </h3>
            <button type="button" class="md-btn-icon" aria-label="Chiudi" @click="close">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <div v-if="currentUser" class="profile-card" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--md-sys-color-surface-container-high); border-radius: 16px; margin-bottom: 1.25rem;">
            <div class="profile-avatar" style="width: 48px; height: 48px; border-radius: 50%; background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.25rem;">
              {{ currentUser.username ? currentUser.username[0].toUpperCase() : 'U' }}
            </div>
            <div class="profile-details" style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <strong style="font-size: 1rem; color: var(--md-sys-color-on-surface);">{{ currentUser.username }}</strong>
                <span v-if="isAdmin" class="md-badge md-badge-primary" style="font-size: 0.65rem; padding: 1px 6px;">Admin</span>
                <span v-else-if="isSuperUser" class="md-badge md-badge-super" style="font-size: 0.65rem; padding: 1px 6px;">Super</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--md-sys-color-on-surface-variant); margin-top: 2px;">
                {{ currentUser.email || '' }}
              </div>
            </div>
          </div>

          <div class="profile-setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div class="sheet-lang-label" style="display: flex; align-items: center; gap: 0.4rem; color: var(--md-sys-color-on-surface-variant); font-size: 0.9rem;">
              <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary);">language</span>
              <span>{{ t('app.language_label', { defaultValue: 'Lingua' }) }}</span>
            </div>
            <div class="md-segmented-button">
              <button 
                type="button" 
                class="md-segmented-button__btn" 
                :class="{ active: currentLang === 'it' }"
                @click="setLanguage('it')"
              >
                Italiano
              </button>
              <button 
                type="button" 
                class="md-segmented-button__btn" 
                :class="{ active: currentLang === 'en' }"
                @click="setLanguage('en')"
              >
                English
              </button>
            </div>
          </div>

          <!-- Admin section link if user is admin -->
          <div v-if="isAdmin" class="profile-admin-section" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--md-sys-color-outline-variant);">
            <router-link 
              to="/admin" 
              class="md-btn md-btn-tonal" 
              style="width: 100%; height: 48px; display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 0 1rem; border-radius: 12px; box-sizing: border-box;"
              @click="close"
            >
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 22px;">group</span>
                <span style="font-weight: 600; color: var(--md-sys-color-on-surface);">{{ t('app.nav_label.admin', { defaultValue: 'Utenti & Amministrazione' }) }}</span>
              </div>
              <span class="material-symbols-rounded" style="color: var(--md-sys-color-on-surface-variant); font-size: 20px;">chevron_right</span>
            </router-link>
          </div>

          <button 
            type="button" 
            class="md-btn md-btn-danger" 
            style="width: 100%; height: 48px; margin-top: 1.25rem;"
            @click="handleLogout"
          >
            <span class="material-symbols-rounded">logout</span>
            <span>{{ t('app.auth.logout') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useAuth } from '../../composables/useAuth.js';
import { useI18n } from '../../composables/useI18n.js';
import { useSnackbar } from '../../composables/useSnackbar.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const { currentUser, isAdmin, isSuperUser, logout } = useAuth();
const { currentLang, setLanguage, t } = useI18n();
const { showSnackbar } = useSnackbar();

function close() {
  emit('update:modelValue', false);
}

async function handleLogout() {
  await logout();
  showSnackbar('Disconnesso con successo');
  close();
}
</script>

<style scoped>
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.sheet-fade-enter-active .md-bottom-sheet,
.sheet-fade-leave-active .md-bottom-sheet {
  transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

.sheet-fade-enter-from .md-bottom-sheet,
.sheet-fade-leave-to .md-bottom-sheet {
  transform: translateY(100%);
}
</style>
