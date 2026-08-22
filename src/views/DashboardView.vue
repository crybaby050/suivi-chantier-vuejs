<script setup>
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppTopbar title="Tableau de bord" />

      <main class="flex-1 p-6">
        <!-- Cartes de bienvenue -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-800">
            Bonjour, {{ auth.user?.nom }} 👋
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            {{ auth.user?.roleGlobal }} · Voici un aperçu de l'activité
          </p>
        </div>

        <!-- Stats placeholder -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="bg-white rounded-xl border border-gray-200 p-5"
          >
            <p class="text-sm text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stat.value }}</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
// Stats temporaires — on les branchera sur l'API ensuite
const stats = [
  { label: 'Projets actifs', value: '—' },
  { label: 'Tâches en cours', value: '—' },
  { label: 'Signalements', value: '—' },
  { label: 'Membres', value: '—' },
]
</script>