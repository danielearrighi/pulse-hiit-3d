<template>
  <Transition name="app-loading-fade">
    <div
      v-if="isLoading"
      class="app-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="app-loading-overlay__content">
        <img
          class="app-loading-overlay__logo"
          :src="logoUrl"
          alt="Pulse HIIT 3D"
          width="96"
          height="96"
        />

        <div class="app-loading-overlay__spinner" aria-hidden="true"></div>

        <p class="app-loading-overlay__text">
          {{ loadingMessage || t('app.loading', { defaultValue: 'Caricamento in corso...' }) }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useLoading } from '../../composables/useLoading.js';
import { useI18n } from '../../composables/useI18n.js';

const { isLoading, loadingMessage } = useLoading();
const { t } = useI18n();

// Path pubblico (servito dal backend / proxy Vite), passato come binding
// per evitare che Vite provi a risolverlo come import di modulo.
const logoUrl = '/assets/icon-192.png';
</script>

<style scoped>
.app-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Box nero al 90% di opacita': nasconde la grafica non ancora pronta */
  background-color: rgba(8, 11, 14, 0.9);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  padding:
    calc(1.5rem + env(safe-area-inset-top))
    calc(1.5rem + env(safe-area-inset-right))
    calc(1.5rem + env(safe-area-inset-bottom))
    calc(1.5rem + env(safe-area-inset-left));
}

.app-loading-overlay__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
}

.app-loading-overlay__logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
  border-radius: var(--md-shape-xl, 24px);
  animation: app-loading-pulse 1.8s ease-in-out infinite;
}

.app-loading-overlay__spinner {
  width: 34px;
  height: 34px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: var(--md-sys-color-primary, #80d5ff);
  border-radius: 50%;
  animation: app-loading-spin 0.8s linear infinite;
}

.app-loading-overlay__text {
  font-family: var(--md-font-family, 'Roboto', sans-serif);
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.2px;
  color: var(--md-sys-color-on-surface, #e1e7ee);
}

/* Transizione di scomparsa */
.app-loading-fade-leave-active {
  transition: opacity 0.4s ease;
}

.app-loading-fade-leave-to {
  opacity: 0;
}

@keyframes app-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes app-loading-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.94);
    opacity: 0.85;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-loading-overlay__logo,
  .app-loading-overlay__spinner {
    animation: none;
  }
}
</style>
