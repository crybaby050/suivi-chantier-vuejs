<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import projetService from '@/services/projetService'
import { useRole } from '@/composables/useRole'

const router = useRouter()
const { isAdmin, isChef, canManage } = useRole()

const projets = ref([])
const loading = ref(true)
const filtre = ref('tous')

const STATUTS = ['tous', 'Planifier', 'En cours', 'Suspendu', 'Terminer']

const STATUT_CONFIG = {
  Planifier: { label: 'Planifié', dot: 'bg-attente', badge: 'bg-attente/10 text-attente' },
  'En cours': { label: 'En cours', dot: 'bg-secondary', badge: 'bg-secondary/10 text-secondary' },
  Suspendu: { label: 'Suspendu', dot: 'bg-inactif', badge: 'bg-inactif/10 text-inactif' },
  Terminer: { label: 'Terminé', dot: 'bg-succes', badge: 'bg-succes/10 text-succes' },
}

const projetsFiltres = computed(() =>
  filtre.value === 'tous'
    ? projets.value
    : projets.value.filter((p) => p.statutProjet === filtre.value),
)

async function charger() {
  loading.value = true
  try {
    projets.value = await projetService.lister()
  } finally {
    loading.value = false
  }
}

onMounted(charger)
</script>

<template>
  <AppLayout title="Projets">
    <!-- En-tête + action -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-texte">Projets</h1>
        <p class="mt-0.5 text-sm text-muted">{{ projets.length }} projet(s) au total</p>
      </div>
      <button
        v-if="canManage"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary/90"
      >
        <i class="fa-solid fa-plus text-xs"></i>
        Nouveau projet
      </button>
    </div>

    <!-- Filtres statut -->
    <div class="mb-5 flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="s in STATUTS"
        :key="s"
        class="flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition"
        :class="
          filtre === s
            ? 'bg-primary text-white'
            : 'bg-carte border border-bordure text-muted hover:text-primary hover:border-primary'
        "
        @click="filtre = s"
      >
        {{ s === 'tous' ? 'Tous' : STATUT_CONFIG[s].label }}
        <span class="ml-1 opacity-70">
          {{ s === 'tous' ? projets.length : projets.filter((p) => p.statutProjet === s).length }}
        </span>
      </button>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="flex justify-center py-20">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <!-- Grille projets -->
    <div v-else-if="projetsFiltres.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="projet in projetsFiltres"
        :key="projet.id"
        class="group relative flex flex-col rounded-2xl bg-carte border border-bordure shadow-card transition-all duration-200 hover:shadow-soft hover:-translate-y-0.5 cursor-pointer"
        @click="router.push(`/projets/${projet.id}`)"
      >
        <!-- Bandeau statut -->
        <div
          class="h-1 w-full rounded-t-2xl"
          :class="STATUT_CONFIG[projet.statutProjet]?.dot ?? 'bg-muted'"
        ></div>

        <div class="flex flex-col flex-1 p-5">
          <!-- Header carte -->
          <div class="mb-3 flex items-start justify-between gap-2">
            <h3 class="font-black text-texte leading-tight line-clamp-2">{{ projet.nom }}</h3>
            <span
              class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              :class="STATUT_CONFIG[projet.statutProjet]?.badge ?? 'bg-muted/10 text-muted'"
            >
              {{ STATUT_CONFIG[projet.statutProjet]?.label ?? projet.statutProjet }}
            </span>
          </div>

          <!-- Adresse -->
          <div class="mb-4 flex items-center gap-1.5 text-xs text-muted">
            <i class="fa-solid fa-location-dot text-[10px]"></i>
            <span class="truncate">{{ projet.adresse }}</span>
          </div>

          <!-- Description -->
          <p v-if="projet.description" class="mb-4 text-xs text-muted line-clamp-2">
            {{ projet.description }}
          </p>

          <div class="mt-auto space-y-3">
            <!-- Dates -->
            <div class="flex items-center justify-between text-[11px] text-muted">
              <span>
                <i class="fa-solid fa-calendar-day mr-1"></i>
                {{ new Date(projet.dateDeDebut).toLocaleDateString('fr-FR') }}
              </span>
              <span v-if="projet.dateDeFinPrevue">
                <i class="fa-solid fa-flag-checkered mr-1"></i>
                {{ new Date(projet.dateDeFinPrevue).toLocaleDateString('fr-FR') }}
              </span>
              <span v-else class="italic">Pas d'échéance</span>
            </div>

            <!-- Lien voir le projet -->
            <div class="flex items-center justify-end">
              <span
                class="text-xs font-bold text-secondary opacity-0 group-hover:opacity-100 transition flex items-center gap-1"
              >
                Voir le projet
                <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- État vide -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <i class="fa-solid fa-building text-2xl text-primary"></i>
      </div>
      <p class="font-bold text-texte">Aucun projet trouvé</p>
      <p class="mt-1 text-sm text-muted">
        {{
          filtre !== 'tous' ? 'Essaie un autre filtre.' : 'Crée ton premier projet pour commencer.'
        }}
      </p>
    </div>
  </AppLayout>
</template>
