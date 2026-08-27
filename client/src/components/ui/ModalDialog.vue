<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="md-dialog-backdrop open active" @click.self="onBackdropClick">
        <div class="md-dialog" :style="customStyle">
          <div class="md-dialog__header">
            <h3 class="md-dialog__title">{{ title }}</h3>
            <button type="button" class="md-btn-icon" aria-label="Chiudi" @click="close">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="md-dialog__content">
            <slot />
          </div>
          <div v-if="$slots.actions" class="md-dialog__actions">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  customStyle: {
    type: [String, Object],
    default: ''
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

function close() {
  emit('update:modelValue', false);
  emit('close');
}

function onBackdropClick() {
  close();
}
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.dialog-fade-enter-active .md-dialog,
.dialog-fade-leave-active .md-dialog {
  transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .md-dialog,
.dialog-fade-leave-to .md-dialog {
  transform: scale(0.92);
}
</style>
