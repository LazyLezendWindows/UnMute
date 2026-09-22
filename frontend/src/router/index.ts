import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => '/discover',
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

// Navigation Guards: State-Machine Driven & Flicker-Free
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // If session state is UNKNOWN, check session with server first
  if (authStore.authState === 'UNKNOWN') {
    await authStore.checkSession();
  }

  if (to.path === '/') {
    return next(authStore.isAuthenticated ? '/discover' : '/login');
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/login');
  } else if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next('/discover');
  } else {
    return next();
  }
});

export default router;
