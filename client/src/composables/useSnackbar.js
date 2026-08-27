import { ref } from 'vue';

const isVisible = ref(false);
const message = ref('');
const timeoutId = ref(null);

export function useSnackbar() {
  function showSnackbar(msg, duration = 3000) {
    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
    }
    message.value = msg;
    isVisible.value = true;

    timeoutId.value = setTimeout(() => {
      isVisible.value = false;
    }, duration);
  }

  function hideSnackbar() {
    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
    }
    isVisible.value = false;
  }

  return {
    isVisible,
    message,
    showSnackbar,
    hideSnackbar
  };
}
