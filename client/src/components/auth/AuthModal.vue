<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="modelValue" class="md-sheet-backdrop open active" @click.self="close">
        <div class="md-bottom-sheet" style="max-width: 480px; margin: 0 auto; left: 0; right: 0;">
          <div class="md-sheet__handle"></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div class="md-segmented-button">
              <button 
                type="button" 
                class="md-segmented-button__btn" 
                :class="{ active: tab === 'login' }"
                @click="tab = 'login'"
              >
                <span class="material-symbols-rounded" style="font-size: 18px;">login</span>
                <span>{{ t('app.auth.login') }}</span>
              </button>
              <button 
                type="button" 
                class="md-segmented-button__btn" 
                :class="{ active: tab === 'register' }"
                @click="tab = 'register'"
              >
                <span class="material-symbols-rounded" style="font-size: 18px;">person_add</span>
                <span>{{ t('app.auth.register') }}</span>
              </button>
            </div>

            <button type="button" class="md-btn-icon" aria-label="Chiudi" @click="close">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <!-- Login Form -->
          <form v-if="tab === 'login'" @submit.prevent="handleLogin">
            <div class="md-field-group">
              <input 
                v-model="loginUsername" 
                type="text" 
                class="md-input" 
                required 
                placeholder=" " 
                id="loginUserInput"
              />
              <label class="md-field-label" for="loginUserInput">{{ t('app.auth.username_email') }}</label>
            </div>

            <div class="md-field-group">
              <input 
                v-model="loginPassword" 
                type="password" 
                class="md-input" 
                required 
                placeholder=" " 
                id="loginPassInput"
              />
              <label class="md-field-label" for="loginPassInput">{{ t('app.auth.password') }}</label>
            </div>

            <button 
              type="submit" 
              class="md-btn md-btn-filled" 
              style="width: 100%; height: 48px; margin-top: 0.5rem;"
              :disabled="loading"
            >
              <span v-if="loading" class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span>
              <span v-else>{{ t('app.auth.login') }}</span>
            </button>
          </form>

          <!-- Register Form -->
          <form v-else @submit.prevent="handleRegister">
            <div class="md-field-group">
              <input 
                v-model="regUsername" 
                type="text" 
                class="md-input" 
                required 
                placeholder=" " 
                id="regUserInput"
              />
              <label class="md-field-label" for="regUserInput">{{ t('app.auth.username') }}</label>
            </div>

            <div class="md-field-group">
              <input 
                v-model="regEmail" 
                type="email" 
                class="md-input" 
                required 
                placeholder=" " 
                id="regEmailInput"
              />
              <label class="md-field-label" for="regEmailInput">{{ t('app.auth.email') }}</label>
            </div>

            <div class="md-field-group">
              <input 
                v-model="regPassword" 
                type="password" 
                class="md-input" 
                required 
                placeholder=" " 
                id="regPassInput"
              />
              <label class="md-field-label" for="regPassInput">{{ t('app.auth.password') }}</label>
            </div>

            <button 
              type="submit" 
              class="md-btn md-btn-filled" 
              style="width: 100%; height: 48px; margin-top: 0.5rem;"
              :disabled="loading"
            >
              <span v-if="loading" class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span>
              <span v-else>{{ t('app.auth.register_account') }}</span>
            </button>
          </form>

          <!-- Language Selector in Auth Sheet -->
          <div class="sheet-lang-section" style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
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
                IT
              </button>
              <button 
                type="button" 
                class="md-segmented-button__btn" 
                :class="{ active: currentLang === 'en' }"
                @click="setLanguage('en')"
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
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

const { login, register } = useAuth();
const { currentLang, setLanguage, t } = useI18n();
const { showSnackbar } = useSnackbar();

const tab = ref('login');
const loading = ref(false);

const loginUsername = ref('');
const loginPassword = ref('');

const regUsername = ref('');
const regEmail = ref('');
const regPassword = ref('');

function close() {
  emit('update:modelValue', false);
}

async function handleLogin() {
  if (loading.value) return;
  loading.value = true;
  try {
    const user = await login(loginUsername.value.trim(), loginPassword.value);
    showSnackbar(`Bentornato, ${user.username}!`);
    loginUsername.value = '';
    loginPassword.value = '';
    close();
  } catch (err) {
    showSnackbar(err.message || 'Login fallito');
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  if (loading.value) return;
  loading.value = true;
  try {
    const user = await register(regUsername.value.trim(), regEmail.value.trim(), regPassword.value);
    showSnackbar(`Account creato con successo, benvenuto ${user.username}!`);
    regUsername.value = '';
    regEmail.value = '';
    regPassword.value = '';
    close();
  } catch (err) {
    showSnackbar(err.message || 'Registrazione fallita');
  } finally {
    loading.value = false;
  }
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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
