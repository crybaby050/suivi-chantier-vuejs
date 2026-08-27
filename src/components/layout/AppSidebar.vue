<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'
import { useSidebar } from '@/composables/useSidebar'

const route = useRoute()
const auth = useAuthStore()
const { isAdmin, isOuvrier, canManage } = useRole()
const { collapsed, toggle } = useSidebar()

const mobileOpen = ref(false)

const ALL_LINKS = [
  { page: '/', label: 'Dashboard', icon: 'fa-gauge', always: true },
  { page: '/projets', label: 'Projets', icon: 'fa-building', always: true },
  { page: '/utilisateurs', label: 'Utilisateurs', icon: 'fa-users', admin: true },
  { page: '/rapports', label: 'Rapports', icon: 'fa-file-lines', always: true },
  { page: '/signalements', label: 'Signalements', icon: 'fa-triangle-exclamation', manage: true },
  { page: '/taches', label: 'Mes tâches', icon: 'fa-list-check', ouvrier: true },
  {
    page: '/validation-taches',
    label: 'Validation des tâches',
    icon: 'fa-clipboard-check',
    manage: true,
  },
  { page: '/messagerie', label: 'Messagerie', icon: 'fa-comments', always: true },
]

const navLinks = computed(() =>
  ALL_LINKS.filter((l) => {
    if (l.always) return true
    if (l.admin) return isAdmin.value
    if (l.manage) return canManage.value
    if (l.ouvrier) return isOuvrier.value
    return false
  }),
)

const ROLE_BADGES = {
  Admin: 'bg-role-admin/10 text-role-admin',
  'Chef de chantier': 'bg-role-chef/10 text-role-chef',
  Ouvrier: 'bg-role-ouvrier/10 text-role-ouvrier',
  Client: 'bg-role-client/10 text-role-client',
}

function isActive(page) {
  if (page === '/') return route.path === '/'
  return route.path.startsWith(page)
}

defineExpose({ mobileOpen })
</script>

<template>
  <!-- Overlay mobile -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-30 bg-texte/40 backdrop-blur-sm lg:hidden"
    @click="mobileOpen = false"
  />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-bordure bg-carte shadow-soft transition-all duration-300"
    :class="[
      collapsed ? 'w-16' : 'w-64',
      mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    ]"
  >
    <!-- Header -->
    <div class="flex flex-shrink-0 items-center gap-2 border-b border-bordure px-4 py-4">
      <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
        <i class="fa-solid fa-helmet-safety text-accent text-sm"></i>
      </div>
      <div v-if="!collapsed" class="flex-1 min-w-0">
        <h1 class="truncate text-sm font-extrabold tracking-tight text-primary">Suivi Chantier</h1>
        <p class="text-[11px] text-muted">Gestion de chantier</p>
      </div>

      <!-- Fermer mobile -->
      <button
        class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-fond hover:text-primary lg:hidden"
        @click="mobileOpen = false"
      >
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>

      <!-- Collapse desktop -->
      <button
        class="hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-fond hover:text-primary lg:flex"
        @click="toggle"
      >
        <i class="fa-solid text-xs" :class="collapsed ? 'fa-angles-right' : 'fa-angles-left'"></i>
      </button>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <p
        v-if="!collapsed"
        class="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted/60"
      >
        Menu
      </p>
      <div class="grid gap-1">
        <router-link
          v-for="link in navLinks"
          :key="link.page"
          :to="link.page"
          custom
          v-slot="{ navigate }"
        >
          <button
            class="nav-link group flex w-full items-center gap-3 rounded-xl py-2.5 text-left text-sm font-semibold transition-all"
            :class="[
              collapsed ? 'justify-center px-0' : 'px-3',
              isActive(link.page)
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-fond hover:text-primary',
            ]"
            @click="navigate"
          >
            <span
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition"
              :class="
                isActive(link.page)
                  ? 'bg-primary/10 text-primary'
                  : 'bg-fond text-muted group-hover:bg-primary/10 group-hover:text-primary'
              "
            >
              <i :class="`fa-solid ${link.icon} text-xs`"></i>
            </span>
            <span v-if="!collapsed" class="truncate">{{ link.label }}</span>
          </button>
        </router-link>
      </div>
    </nav>

    <!-- Profil -->
    <div v-if="!collapsed" class="border-t border-bordure px-3 py-4">
      <div class="flex items-center gap-3 rounded-xl bg-fond px-3 py-2">
        <div
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary overflow-hidden"
        >
          <img
            v-if="auth.user?.photoUrl"
            :src="auth.user.photoUrl"
            class="h-full w-full object-cover"
          />
          <i v-else class="fa-solid fa-user text-xs"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="truncate text-sm font-black text-texte">{{ auth.user?.nom }}</p>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-bold"
            :class="ROLE_BADGES[auth.user?.roleGlobal]"
          >
            {{ auth.user?.roleGlobal }}
          </span>
        </div>
      </div>
    </div>

    <div v-else class="border-t border-bordure px-3 py-4 flex justify-center">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary overflow-hidden"
      >
        <img
          v-if="auth.user?.photoUrl"
          :src="auth.user.photoUrl"
          class="h-full w-full object-cover"
        />
        <i v-else class="fa-solid fa-user text-xs"></i>
      </div>
    </div>
  </aside>
</template>
