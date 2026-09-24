import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      // Signed-out visitors are sent on to /welcome by the guard below.
      redirect: '/discover',
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('../pages/WelcomePage.vue'),
      meta: { guestOnly: true },
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
      path: '/profile/edit',
      name: 'profile-edit',
      component: () => import('../pages/EditProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/interests',
      name: 'profile-interests',
      component: () => import('../pages/InterestsPage.vue'),
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
    {
      path: '/settings/appearance',
      name: 'settings-appearance',
      component: () => import('../pages/AppearancePage.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

// Navigation guard: wait for the backend's session answer before rendering any route (no auth flicker).
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.ensureSession();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Opening the app signed out shows the welcome screen; a deep link signs in and comes back.
    return to.fullPath === '/discover' ? '/welcome' : { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return '/discover';
  }
  return true;
});

export default router;

