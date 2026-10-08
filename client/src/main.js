import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { startUpdateCheck } from './services/appUpdate.js';

// Global Stylesheets
import './assets/css/material3.css';
import './assets/css/dashboard.css';
import './assets/css/builder.css';
import './assets/css/editor.css';
import './assets/css/library.css';
import './assets/css/player.css';
import './assets/css/admin.css';

const app = createApp(App);

app.use(router);

app.mount('#app');

// Detect new deployments and force a full reload so users never run a stale,
// cache-mismatched bundle. `_v` is the cache-busting marker added on reload.
startUpdateCheck();
try {
  const url = new URL(window.location.href);
  if (url.searchParams.has('_v')) {
    url.searchParams.delete('_v');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
} catch (e) {
  // Ignore malformed URLs.
}
