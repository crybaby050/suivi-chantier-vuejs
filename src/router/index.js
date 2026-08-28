import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projets',
    name: 'Projets',
    component: () => import('@/views/ProjetsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projets/:id',
    name: 'ProjetDetail',
    component: () => import('@/views/ProjetDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/taches',
    name: 'MesTaches',
    component: () => import('@/views/MesTachesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/validation-taches',
    name: 'ValidationTaches',
    component: () => import('@/views/ValidationTachesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/messagerie',
    name: 'Messagerie',
    component: () => import('@/views/MessagerieView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/utilisateurs',
    name: 'Utilisateurs',
    component: () => import('@/views/UtilisateursView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/rapports',
    name: 'Rapports',
    component: () => import('@/views/RapportsView.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login' }
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return { name: 'Dashboard' }
  }

  if (
    to.name === 'Dashboard' &&
    auth.user?.roleGlobal === 'Ouvrier'
  ) {
    return { name: 'MesTaches' }
  }
})

export default router