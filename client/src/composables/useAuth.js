import { ref, computed } from 'vue';
import { api } from '../services/api.js';

const currentUser = ref(null);
const isAuthLoaded = ref(false);

export function useAuth() {
  const isAuthenticated = computed(() => !!currentUser.value);

  const isAdmin = computed(() => {
    if (!currentUser.value) return false;
    return currentUser.value.role === 'admin' || 
      (currentUser.value.username && currentUser.value.username.toLowerCase() === 'daniele');
  });

  const isSuperUser = computed(() => {
    if (!currentUser.value) return false;
    return currentUser.value.role === 'superuser';
  });

  const canManage3D = computed(() => {
    return isAdmin.value || isSuperUser.value;
  });

  async function fetchMe() {
    try {
      const user = await api.getMe();
      currentUser.value = user;
    } catch (e) {
      currentUser.value = null;
    } finally {
      isAuthLoaded.value = true;
    }
    return currentUser.value;
  }

  async function login(username, password) {
    const user = await api.login(username, password);
    currentUser.value = user;
    return user;
  }

  async function register(username, email, password) {
    const user = await api.register(username, email, password);
    currentUser.value = user;
    return user;
  }

  async function logout() {
    await api.logout();
    currentUser.value = null;
  }

  return {
    currentUser,
    isAuthLoaded,
    isAuthenticated,
    isAdmin,
    isSuperUser,
    canManage3D,
    fetchMe,
    login,
    register,
    logout
  };
}
