<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'
import { useSidebar } from '@/composables/useSidebar'

defineProps({ title: { type: String, default: 'Dashboard' } })

const router = useRouter()
const auth = useAuthStore()
const { collapsed } = useSidebar()
const { role } = useRole()

const dropdownOpen = ref(false)
const mobileSearch = ref(false)
const chevronRotated = ref(false)

const ROLE_BADGES = {
  Admin: 'bg-white/20 text-white',
  'Chef de chantier': 'bg-white/20 text-white',
  Ouvrier: 'bg-white/20 text-white',
  Client: 'bg-white/20 text-white',
}

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
  chevronRotated.value = dropdownOpen.value
}

function closeDropdown() {
  dropdownOpen.value = false
  chevronRotated.value = false
}

async function handleLogout() {
  closeDropdown()
  await auth.logout()
  router.push({ name: 'Login' })
}

function handleProfil() {
  closeDropdown()
  router.push('/profil')
}

// Fermer dropdown si clic extérieur
function onClickOutside(e) {
  if (!e.target.closest('#topbarAvatar')) closeDropdown()
}
</script>

<template>
  <header
    class="fixed top-0 right-0 z-20 h-16 bg-primary shadow-soft transition-all duration-300"
    :class="collapsed ? 'left-16' : 'lg:left-64 left-0'"
    @click.self="closeDropdown"
  >
    <div class="flex h-full items-center px-4 sm:px-6" v-click-outside="onClickOutside">
      <!-- Bouton menu mobile -->
      <button
        class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
        @click="$emit('toggle-sidebar')"
      >
        <i class="fa-solid fa-bars text-sm"></i>
      </button>

      <!-- Titre -->
      <div class="ml-3 lg:ml-0">
        <span class="text-sm font-bold text-white sm:text-base">{{ title }}</span>
      </div>

      <div class="flex-1"></div>

      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Recherche desktop -->
        <div class="hidden lg:block">
          <div class="relative">
            <i
              class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50"
            ></i>
            <input
              type="text"
              placeholder="Recherche globale..."
              class="w-48 xl:w-64 rounded-xl bg-white/10 py-2 pl-8 pr-4 text-sm text-white placeholder:text-white/50 outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        <!-- Recherche mobile -->
        <button
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
          @click="mobileSearch = !mobileSearch"
        >
          <i class="fa-solid fa-magnifying-glass text-sm"></i>
        </button>

        <div class="hidden h-5 w-px bg-white/20 sm:block"></div>

        <!-- Badge rôle -->
        <div class="hidden sm:block">
          <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="ROLE_BADGES[role]">
            {{ role === 'Chef de chantier' ? 'Chef' : role }}
          </span>
        </div>

        <!-- Avatar + dropdown -->
        <div class="relative" id="topbarAvatar">
          <button
            class="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1 transition hover:bg-white/10"
            @click="toggleDropdown"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white overflow-hidden"
            >
              <img
                v-if="auth.user?.photoUrl"
                :src="auth.user.photoUrl"
                class="h-full w-full object-cover"
              />
              <i v-else class="fa-solid fa-user text-xs"></i>
            </div>
            <span class="hidden text-sm font-semibold text-white md:block truncate max-w-[120px]">
              {{ auth.user?.nom }}
            </span>
            <i
              class="fa-solid fa-chevron-down text-xs text-white/60 hidden md:block transition-transform duration-200"
              :class="{ 'rotate-180': chevronRotated }"
            ></i>
          </button>

          <!-- Dropdown -->
          <div
            v-if="dropdownOpen"
            class="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-bordure bg-carte shadow-soft z-50"
          >
            <div class="flex items-center gap-3 border-b border-bordure p-4">
              <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden"
              >
                <img
                  v-if="auth.user?.photoUrl"
                  :src="auth.user.photoUrl"
                  class="h-full w-full object-cover"
                />
                <i v-else class="fa-solid fa-user text-sm"></i>
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-black text-texte">{{ auth.user?.nom }}</p>
                <p class="truncate text-xs text-muted">{{ auth.user?.email }}</p>
              </div>
            </div>
            <div class="p-2">
              <button
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-texte transition hover:bg-fond"
                @click="handleProfil"
              >
                <i class="fa-solid fa-user-pen text-muted text-xs"></i>
                Mon profil
              </button>
              <button
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-bloque transition hover:bg-bloque/10"
                @click="handleLogout"
              >
                <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recherche mobile -->
    <div v-if="mobileSearch" class="border-t border-white/10 bg-primary px-4 py-2 lg:hidden">
      <div class="relative">
        <i
          class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50"
        ></i>
        <input
          type="text"
          placeholder="Recherche globale..."
          class="w-full rounded-xl bg-white/10 py-2 pl-8 pr-4 text-sm text-white placeholder:text-white/50 outline-none focus:bg-white/20"
        />
      </div>
    </div>
  </header>
</template>
