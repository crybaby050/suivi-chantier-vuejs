<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'

const route = useRoute()
const auth = useAuthStore()
const { isAdmin, isOuvrier, canManage } = useRole()

const moreOpen = ref(false)

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

// Les 4 liens jugés prioritaires selon le rôle — le reste va dans "Plus"
const priorityPages = computed(() => {
  const p = ['/', '/projets']
  if (isOuvrier.value) p.push('/taches')
  else if (canManage.value) p.push('/validation-taches')
  else p.push('/rapports')
  p.push('/messagerie')
  return p
})

const primaryLinks = computed(() =>
  priorityPages.value.map((page) => navLinks.value.find((l) => l.page === page)).filter(Boolean),
)

const moreLinks = computed(() =>
  navLinks.value.filter((l) => !priorityPages.value.includes(l.page)),
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

function go(page) {
  moreOpen.value = false
}
</script>

<template>
  <!-- Barre de navigation mobile -->
  <nav
    class="fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-bordure bg-carte lg:hidden"
    style="padding-bottom: env(safe-area-inset-bottom)"
  >
    <router-link
      v-for="link in primaryLinks"
      :key="link.page"
      :to="link.page"
      custom
      v-slot="{ navigate }"
      class="flex-1"
    >
      <button
        class="flex w-full flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition"
        :class="isActive(link.page) ? 'text-primary' : 'text-muted'"
        @click="navigate"
      >
        <i :class="`fa-solid ${link.icon} text-base`"></i>
        <span class="truncate max-w-[64px]">{{ link.label }}</span>
      </button>
    </router-link>

    <!-- Bouton Plus, seulement s'il reste des liens -->
    <button
      v-if="moreLinks.length"
      class="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition"
      :class="moreOpen ? 'text-primary' : 'text-muted'"
      @click="moreOpen = true"
    >
      <i class="fa-solid fa-ellipsis text-base"></i>
      <span>Plus</span>
    </button>
  </nav>

  <!-- Feuille "Plus" -->
  <Teleport to="body">
    <div
      v-if="moreOpen"
      class="fixed inset-0 z-50 flex items-end lg:hidden"
      @click.self="moreOpen = false"
    >
      <div class="absolute inset-0 bg-texte/40 backdrop-blur-sm" @click="moreOpen = false" />

      <div
        class="relative z-10 w-full rounded-t-2xl bg-carte border-t border-bordure shadow-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <div class="flex justify-center pt-2">
          <div class="h-1 w-10 rounded-full bg-bordure"></div>
        </div>

        <!-- Profil -->
        <div class="px-4 pt-3 pb-4 border-b border-bordure">
          <div class="flex items-center gap-3 rounded-xl bg-fond px-3 py-2.5">
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary overflow-hidden"
            >
              <img
                v-if="auth.user?.photoUrl"
                :src="auth.user.photoUrl"
                class="h-full w-full object-cover"
              />
              <i v-else class="fa-solid fa-user text-sm"></i>
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

        <!-- Liens restants -->
        <div class="grid grid-cols-3 gap-2 p-4">
          <router-link
            v-for="link in moreLinks"
            :key="link.page"
            :to="link.page"
            custom
            v-slot="{ navigate }"
          >
            <button
              class="flex flex-col items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold transition"
              :class="
                isActive(link.page)
                  ? 'bg-primary/10 text-primary'
                  : 'bg-fond text-muted hover:text-primary'
              "
              @click="
                () => {
                  navigate()
                  go(link.page)
                }
              "
            >
              <i :class="`fa-solid ${link.icon} text-lg`"></i>
              <span class="text-center leading-tight">{{ link.label }}</span>
            </button>
          </router-link>
        </div>
      </div>
    </div>
  </Teleport>
</template>
