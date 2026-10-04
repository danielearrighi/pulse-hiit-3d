import { ref } from 'vue';

// Stato globale condiviso da tutta l'app.
const isLoading = ref(false);
const loadingMessage = ref('');
// Contatore per supportare richieste di loading concorrenti/nidificate.
let pending = 0;

export function useLoading() {
  function showLoading(message = '') {
    pending += 1;
    if (message) loadingMessage.value = message;
    isLoading.value = true;
  }

  function hideLoading(force = false) {
    if (force) {
      pending = 0;
      isLoading.value = false;
      loadingMessage.value = '';
      return;
    }
    pending = Math.max(0, pending - 1);
    if (pending === 0) {
      isLoading.value = false;
      loadingMessage.value = '';
    }
  }

  function setLoadingMessage(message = '') {
    loadingMessage.value = message;
  }

  return {
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
    setLoadingMessage
  };
}
