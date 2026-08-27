<template>
  <div class="md-snackbar-container">
    <Transition name="snackbar-fade">
      <div v-if="isVisible" class="md-snackbar active">
        <span class="md-snackbar__label">{{ message }}</span>
        <button type="button" class="md-snackbar__action" aria-label="Chiudi notifica" @click="hideSnackbar">
          <span class="material-symbols-rounded" style="font-size: 18px;">close</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useSnackbar } from '../../composables/useSnackbar.js';

const { isVisible, message, hideSnackbar } = useSnackbar();
</script>

<style scoped>
.snackbar-fade-enter-active,
.snackbar-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.snackbar-fade-enter-from,
.snackbar-fade-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}

.md-snackbar__action {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: var(--md-shape-full, 9999px);
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.md-snackbar__action:hover {
  opacity: 1;
}
</style>
