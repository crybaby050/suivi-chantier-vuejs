<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'
import projetService from '@/services/projetService'
import phaseService from '@/services/phaseService'
import tacheService from '@/services/tacheService'
import utilisateurService from '@/services/utilisateurService'

const auth = useAuthStore()
const { isAdmin, isChef, isOuvrier, isClient, canManage } = useRole()

const loading = ref(true)
const projets = ref([])
const taches = ref([])
const utilisateurs = ref([])
const progressionParProjet = ref({})

// ─── Fetch ───────────────────────────────────────────────────────────────────

async function chargerDonnees() {
  loading.value = true
  try {
    const [projetsBruts, users] = await Promise.all([
      projetService.lister(),
      isAdmin.value ? utilisateurService.lister() : Promise.resolve([]),
    ])
    projets.value = projetsBruts
    utilisateurs.value = users

    const toutesLesTaches = []
    await Promise.all(
      projetsBruts.map(async (projet) => {
        const phases = await phaseService.listerParProjet(projet.id)
        const tachesParPhase = await Promise.all(
          phases.map((ph) => tacheService.listerParPhase(ph.id)),
        )
        const tachesDuProjet = tachesParPhase.flat()
        toutesLesTaches.push(...tachesDuProjet)

        const phasesTerminees = phases.filter((p) => p.statutPhase === 'Terminer').length
        progressionParProjet.value[projet.id] = phases.length
          ? Math.round((phasesTerminees / phases.length) * 100)
          : 0
      }),
    )
    taches.value = toutesLesTaches
  } finally {
    loading.value = false
  }
}

onMounted(chargerDonnees)

// ─── Stats ───────────────────────────────────────────────────────────────────

const projetsActifs = computed(() => projets.value.filter((p) => p.statutProjet === 'En cours'))
const projetsTermines = computed(() => projets.value.filter((p) => p.statutProjet === 'Terminer'))
const tachesEnAttente = computed(() => taches.value.filter((t) => t.statutTache === 'A faire'))
const tachesEnCours = computed(() => taches.value.filter((t) => t.statutTache === 'En cours'))
const tachesTerminees = computed(() => taches.value.filter((t) => t.statutTache === 'Terminer'))
const tachesAValider = computed(() => taches.value.filter((t) => t.statutTache === 'Valider'))
const progressionGlobale = computed(() =>
  taches.value.length
    ? Math.round(taches.value.reduce((s, t) => s + (t.progression || 0), 0) / taches.value.length)
    : 0,
)

const stats = computed(() => {
  if (isAdmin.value)
    return [
      {
        label: 'Projets actifs',
        value: projetsActifs.value.length,
        sub: `${projets.value.length} au total`,
        icon: 'fa-building',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
      },
      {
        label: 'Progression moyenne',
        value: `${progressionGlobale.value}%`,
        sub: 'sur toutes les tâches',
        icon: 'fa-chart-pie',
        iconBg: 'bg-secondary/10',
        iconColor: 'text-secondary',
      },
      {
        label: 'Utilisateurs',
        value: utilisateurs.value.length,
        sub: 'comptes actifs',
        icon: 'fa-users',
        iconBg: 'bg-role-admin/10',
        iconColor: 'text-role-admin',
      },
      {
        label: 'Projets achevés',
        value: projetsTermines.value.length,
        sub: `${projets.value.length} au total`,
        icon: 'fa-circle-check',
        iconBg: 'bg-succes/10',
        iconColor: 'text-succes',
      },
    ]
  if (isChef.value)
    return [
      {
        label: 'Mes projets',
        value: projetsActifs.value.length,
        sub: `${projets.value.length} au total`,
        icon: 'fa-building',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
      },
      {
        label: 'Tâches en cours',
        value: tachesEnCours.value.length,
        sub: 'à superviser',
        icon: 'fa-list-check',
        iconBg: 'bg-secondary/10',
        iconColor: 'text-secondary',
      },
      {
        label: 'Tâches terminées',
        value: tachesTerminees.value.length,
        sub: 'complétées',
        icon: 'fa-circle-check',
        iconBg: 'bg-succes/10',
        iconColor: 'text-succes',
      },
      {
        label: 'Progression globale',
        value: `${progressionGlobale.value}%`,
        sub: 'sur toutes les tâches',
        icon: 'fa-chart-pie',
        iconBg: 'bg-accent/10',
        iconColor: 'text-accent',
      },
    ]
  if (isOuvrier.value)
    return [
      {
        label: 'Mes tâches',
        value: taches.value.length,
        sub: 'assignées',
        icon: 'fa-list-check',
        iconBg: 'bg-role-ouvrier/10',
        iconColor: 'text-role-ouvrier',
      },
      {
        label: 'En cours',
        value: tachesEnCours.value.length,
        sub: 'à compléter',
        icon: 'fa-spinner',
        iconBg: 'bg-secondary/10',
        iconColor: 'text-secondary',
      },
      {
        label: 'Terminées',
        value: tachesTerminees.value.length,
        sub: 'complétées',
        icon: 'fa-circle-check',
        iconBg: 'bg-succes/10',
        iconColor: 'text-succes',
      },
      {
        label: 'Progression',
        value: `${progressionGlobale.value}%`,
        sub: 'de mes tâches',
        icon: 'fa-chart-pie',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
      },
    ]
  return [
    {
      label: 'Projets suivis',
      value: projets.value.length,
      sub: 'en cours',
      icon: 'fa-building',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Avancement',
      value: `${progressionGlobale.value}%`,
      sub: 'progression globale',
      icon: 'fa-chart-pie',
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary',
    },
    {
      label: 'Projets actifs',
      value: projetsActifs.value.length,
      sub: 'en cours',
      icon: 'fa-spinner',
      iconBg: 'bg-attente/10',
      iconColor: 'text-attente',
    },
    {
      label: 'Projets achevés',
      value: projetsTermines.value.length,
      sub: 'terminés',
      icon: 'fa-circle-check',
      iconBg: 'bg-succes/10',
      iconColor: 'text-succes',
    },
  ]
})

const STATUT_COLORS = {
  'En cours': { dot: 'bg-secondary', bar: 'bg-secondary' },
  Planifier: { dot: 'bg-attente', bar: 'bg-attente' },
  Terminer: { dot: 'bg-succes', bar: 'bg-succes' },
  Suspendu: { dot: 'bg-inactif', bar: 'bg-inactif' },
}

const today = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
</script>

<template>
  <AppLayout title="Dashboard">
    <div v-if="loading" class="flex items-center justify-center h-64">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <div v-else class="space-y-6">
      <!-- En-tête -->
      <div>
        <h1 class="text-2xl font-black text-texte sm:text-3xl">Bonjour, {{ auth.user?.nom }} 👋</h1>
        <p class="mt-1 text-sm text-muted">Vue d'ensemble de la plateforme — {{ today }}</p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-2xl bg-carte p-4 shadow-card sm:p-5"
        >
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-muted sm:text-sm">{{ stat.label }}</p>
              <p class="mt-1 text-2xl font-black text-texte sm:text-3xl">{{ stat.value }}</p>
              <p v-if="stat.sub" class="mt-1 text-xs text-muted">{{ stat.sub }}</p>
            </div>
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              :class="stat.iconBg"
            >
              <i :class="`fa-solid ${stat.icon} text-sm ${stat.iconColor}`"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Corps principal -->
      <div class="grid gap-4 lg:grid-cols-5">
        <!-- Évolution des projets -->
        <div class="rounded-2xl bg-carte p-5 shadow-card lg:col-span-3">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-texte">Évolution des projets récents</h2>
              <p class="text-xs text-muted">{{ projets.length }} projet(s) au total</p>
            </div>
            <router-link
              to="/projets"
              class="rounded-xl border border-bordure px-3 py-1.5 text-xs font-bold text-muted transition hover:bg-fond hover:text-primary"
            >
              Voir tout
            </router-link>
          </div>

          <div class="space-y-4">
            <p v-if="projets.length === 0" class="py-6 text-center text-sm text-muted">
              Aucun projet enregistré.
            </p>
            <div v-for="projet in projets.slice(0, 5)" :key="projet.id" class="group">
              <div class="mb-1.5 flex items-center justify-between">
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="h-2 w-2 flex-shrink-0 rounded-full"
                    :class="STATUT_COLORS[projet.statutProjet]?.dot ?? 'bg-muted'"
                  ></div>
                  <span class="truncate text-sm font-semibold text-texte">{{ projet.nom }}</span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span class="text-xs text-muted"
                    >{{ progressionParProjet[projet.id] ?? 0 }}%</span
                  >
                </div>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-fond">
                <div
                  class="h-2 rounded-full transition-all duration-500"
                  :class="STATUT_COLORS[projet.statutProjet]?.bar ?? 'bg-muted'"
                  :style="{ width: `${progressionParProjet[projet.id] ?? 0}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tâches en attente -->
        <div class="rounded-2xl bg-carte p-5 shadow-card lg:col-span-2">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-base font-black text-texte">Tâches en attente</h2>
              <p class="text-xs text-muted">{{ tachesEnAttente.length }} tâche(s) à traiter</p>
            </div>
            <router-link
              v-if="!isClient"
              to="/taches"
              class="rounded-xl border border-bordure px-3 py-1.5 text-xs font-bold text-muted transition hover:bg-fond hover:text-primary"
            >
              Voir tout
            </router-link>
          </div>

          <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
            <p v-if="tachesEnAttente.length === 0" class="py-6 text-center text-sm text-muted">
              Aucune tâche en attente.
            </p>
            <div
              v-for="tache in tachesEnAttente.slice(0, 6)"
              :key="tache.id"
              class="flex items-start gap-3 rounded-xl bg-fond p-3"
            >
              <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-attente/10"
              >
                <i class="fa-solid fa-clock text-xs text-attente"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-texte">{{ tache.titre }}</p>
                <p class="text-xs text-muted">
                  Échéance :
                  {{
                    tache.dateDeFin ? new Date(tache.dateDeFin).toLocaleDateString('fr-FR') : '—'
                  }}
                </p>
              </div>
              <span
                class="flex-shrink-0 rounded-full bg-attente/10 px-2 py-0.5 text-[10px] font-bold text-attente"
              >
                À faire
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bas de page — résumé statuts tâches -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl bg-carte p-4 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
              <i class="fa-solid fa-spinner text-sm text-secondary"></i>
            </div>
            <div>
              <p class="text-xs text-muted">En cours</p>
              <p class="text-xl font-black text-texte">{{ tachesEnCours.length }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-carte p-4 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-succes/10">
              <i class="fa-solid fa-circle-check text-sm text-succes"></i>
            </div>
            <div>
              <p class="text-xs text-muted">Terminées</p>
              <p class="text-xl font-black text-texte">{{ tachesTerminees.length }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-carte p-4 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-attente/10">
              <i class="fa-solid fa-hourglass-half text-sm text-attente"></i>
            </div>
            <div>
              <p class="text-xs text-muted">À valider</p>
              <p class="text-xl font-black text-texte">{{ tachesAValider.length }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-carte p-4 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <i class="fa-solid fa-chart-line text-sm text-primary"></i>
            </div>
            <div>
              <p class="text-xs text-muted">Progression globale</p>
              <p class="text-xl font-black text-texte">{{ progressionGlobale }}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
