import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      // Unauthenticated visitors are sent on to /login by the guard below.
      redirect: '/discover',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/RegisterPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/discover',
      name: 'discover',
      component: () => import('../pages/DiscoverPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/matches',
      name: 'matches',
      component: () => import('../pages/MatchesPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chat/:id?',
      name: 'chat',
      component: () => import('../pages/ChatPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../pages/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/safety',
      name: 'safety',
      component: () => import('../pages/SafetyPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

// Navigation guard: wait for the backend's session answer before rendering any route (no auth flicker).
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.ensureSession();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: '/login', query: to.fullPath !== '/discover' ? { redirect: to.fullPath } : undefined };
  }
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return '/discover';
  }
  return true;
});

export default router;

