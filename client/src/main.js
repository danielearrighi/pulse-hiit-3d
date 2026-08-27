import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';

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
