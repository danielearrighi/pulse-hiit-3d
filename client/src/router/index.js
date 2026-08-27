import { createRouter, createWebHistory } from 'vue-router';

const DashboardView = () => import('../views/DashboardView.vue');
const BuilderView = () => import('../views/BuilderView.vue');
const EditorView = () => import('../views/EditorView.vue');
const LibraryView = () => import('../views/LibraryView.vue');
const PlayerView = () => import('../views/PlayerView.vue');
const AdminView = () => import('../views/AdminView.vue');

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView
  },
  {
    path: '/dashboard',
    redirect: '/'
  },
  {
    path: '/builder',
    name: 'builder',
    component: BuilderView
  },
  {
    path: '/editor',
    name: 'editor',
    component: EditorView
  },
  {
    path: '/library',
    name: 'library',
    component: LibraryView
  },
  {
    path: '/player',
    name: 'player',
    component: PlayerView
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
