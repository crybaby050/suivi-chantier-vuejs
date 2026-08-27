<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import ModalProjet from '@/components/projets/ModalProjet.vue'
import projetService from '@/services/projetService'
import phaseService from '@/services/phaseService'
import tacheService from '@/services/tacheService'
import utilisateurService from '@/services/utilisateurService'
import { useRole } from '@/composables/useRole'

const router = useRouter()
const { canManage, isAdmin } = useRole()

const projets = ref([])
const utilisateurs = ref([])
const progressions = ref({})
const loading = ref(true)
const filtre = ref('Tout')
const vue = ref('cards') // 'cards' | 'liste'
const recherche = ref('')
const showModal = ref(false)
const projetEdite = ref(null)
const page = ref(1)
const PAR_PAGE = 6

const FILTRES = ['Tout', 'En cours', 'Planifier', 'Suspendu', 'Terminer']

const STATUT_CONFIG = {
  Planifier: {
    label: 'Planifié',
    dot: 'bg-attente',
    badge: 'bg-attente/10 text-attente',
    bar: 'bg-attente',
  },
  'En cours': {
    label: 'En cours',
    dot: 'bg-secondary',
    badge: 'bg-secondary/10 text-secondary',
    bar: 'bg-secondary',
  },
  Suspendu: {
    label: 'Suspendu',
    dot: 'bg-inactif',
    badge: 'bg-inactif/10 text-inactif',
    bar: 'bg-inactif',
  },
  Terminer: {
    label: 'Terminé',
    dot: 'bg-succes',
    badge: 'bg-succes/10 text-succes',
    bar: 'bg-succes',
  },
}

// ─── Données filtrées + paginées ─────────────────────────────────────────────

const projetsFiltres = computed(() =>
  projets.value
    .filter((p) => filtre.value === 'Tout' || p.statutProjet === filtre.value)
    .filter(
      (p) =>
        !recherche.value ||
        p.nom.toLowerCase().includes(recherche.value.toLowerCase()) ||
        p.adresse.toLowerCase().includes(recherche.value.toLowerCase()),
    ),
)

const totalPages = computed(() => Math.ceil(projetsFiltres.value.length / PAR_PAGE))

const projetsPagines = computed(() => {
  const start = (page.value - 1) * PAR_PAGE
  return projetsFiltres.value.slice(start, start + PAR_PAGE)
})

function chefDuProjet(chefId) {
  return utilisateurs.value.find((u) => u.id === chefId)?.nom ?? '—'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

// ─── Chargement ───────────────────────────────────────────────────────────────

async function charger() {
  loading.value = true
  try {
    const [p, u] = await Promise.all([projetService.lister(), utilisateurService.lister()])
    projets.value = p
    utilisateurs.value = u
    await calculerProgressions(p)
  } finally {
    loading.value = false
  }
}

async function calculerProgressions(listeProjets) {
  await Promise.all(listeProjets.map(async (projet) => {
    const phases = await phaseService.listerParProjet(projet.id)
    if (!phases.length) {
      progressions.value[projet.id] = 0
      return
    }
    const phasesTerminees = phases.filter(p => p.statutPhase === 'Terminer').length
    progressions.value[projet.id] = Math.round((phasesTerminees / phases.length) * 100)
  }))
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function ouvrirCreation() {
  projetEdite.value = null
  showModal.value = true
}

function ouvrirEdition(projet, e) {
  e.stopPropagation()
  projetEdite.value = projet
  showModal.value = true
}

function onSaved(projet) {
  const idx = projets.value.findIndex((p) => p.id === projet.id)
  if (idx !== -1) projets.value[idx] = projet
  else {
    projets.value.unshift(projet)
    calculerProgressions([projet])
  }
}

function changerFiltre(f) {
  filtre.value = f
  page.value = 1
}

onMounted(charger)
</script>

<template>
  <AppLayout title="Projets">
    <!-- En-tête -->
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-texte sm:text-3xl">Projets</h1>
        <p class="mt-1 text-sm text-muted">
          Contrôler et suivre la progression de vos chantiers en temps réel
        </p>
      </div>
      <div v-if="canManage" class="flex gap-2 flex-shrink-0">
        <button
          v-if="isAdmin"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary/90"
          @click="ouvrirCreation"
        >
          <i class="fa-solid fa-plus text-xs"></i>
          Nouveau projet
        </button>
      </div>
    </div>

    <!-- Filtres + recherche + toggle vue -->
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- Filtres statut -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="f in FILTRES"
          :key="f"
          class="rounded-xl px-3 py-1.5 text-xs font-bold transition"
          :class="
            filtre === f
              ? 'bg-primary text-white shadow-soft'
              : 'bg-carte border border-bordure text-muted hover:bg-fond hover:text-primary'
          "
          @click="changerFiltre(f)"
        >
          {{ f === 'Tout' ? 'Tout' : (STATUT_CONFIG[f]?.label ?? f) }}
          <span class="ml-1 opacity-60">
            {{ f === 'Tout' ? projets.length : projets.filter((p) => p.statutProjet === f).length }}
          </span>
        </button>
      </div>

      <!-- Recherche + toggle vue -->
      <div class="flex items-center gap-2">
        <div class="relative">
          <i
            class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted"
          ></i>
          <input
            v-model="recherche"
            type="text"
            placeholder="Rechercher..."
            class="w-44 rounded-xl border border-bordure bg-carte py-2 pl-8 pr-4 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
            @input="page = 1"
          />
        </div>
        <div class="flex rounded-xl border border-bordure bg-carte overflow-hidden">
          <button
            class="flex h-9 w-9 items-center justify-center transition"
            :class="vue === 'liste' ? 'bg-primary text-white' : 'text-muted hover:bg-fond'"
            @click="vue = 'liste'"
          >
            <i class="fa-solid fa-list text-xs"></i>
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center transition"
            :class="vue === 'cards' ? 'bg-primary text-white' : 'text-muted hover:bg-fond'"
            @click="vue = 'cards'"
          >
            <i class="fa-solid fa-grip text-xs"></i>
          </button>
        </div>
      </div>
    </div>

    <p class="mb-4 text-xs text-muted">{{ projetsFiltres.length }} projet(s) affiché(s)</p>

    <!-- Loader -->
    <div v-if="loading" class="flex justify-center py-20">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <template v-else>
      <!-- ── VUE CARDS ── -->
      <div v-if="vue === 'cards'">
        <div v-if="projetsPagines.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="projet in projetsPagines"
            :key="projet.id"
            class="group flex flex-col rounded-2xl border border-bordure bg-carte shadow-card transition-all hover:shadow-soft cursor-pointer"
            @click="router.push(`/projets/${projet.id}`)"
          >
            <!-- Header carte -->
            <div class="p-5">
              <div class="mb-3 flex items-start justify-between gap-2">
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10"
                  >
                    <i class="fa-solid fa-building text-sm text-primary"></i>
                  </div>
                  <div class="min-w-0">
                    <h3 class="truncate font-black text-texte">{{ projet.nom }}</h3>
                    <p class="truncate text-xs text-muted">
                      <i class="fa-solid fa-location-dot mr-1 text-[10px]"></i>
                      {{ projet.adresse }}
                    </p>
                  </div>
                </div>
                <span
                  class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  :class="STATUT_CONFIG[projet.statutProjet]?.badge ?? 'bg-muted/10 text-muted'"
                >
                  {{ STATUT_CONFIG[projet.statutProjet]?.label ?? projet.statutProjet }}
                </span>
              </div>

              <!-- Progression -->
              <div class="mb-3">
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="text-xs font-semibold text-muted">Progression</span>
                  <span
                    class="text-xs font-black"
                    :class="
                      STATUT_CONFIG[projet.statutProjet]?.badge?.split(' ')[1] ?? 'text-primary'
                    "
                  >
                    {{ progressions[projet.id] ?? 0 }}%
                  </span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-fond">
                  <div
                    class="h-2 rounded-full transition-all duration-700"
                    :class="STATUT_CONFIG[projet.statutProjet]?.bar ?? 'bg-primary'"
                    :style="{ width: `${progressions[projet.id] ?? 0}%` }"
                  ></div>
                </div>
              </div>

              <!-- Infos bas -->
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg bg-fond p-2">
                  <p class="text-muted">Chef de chantier</p>
                  <p class="font-bold text-texte truncate">{{ chefDuProjet(projet.chefId) }}</p>
                </div>
                <div class="rounded-lg bg-fond p-2">
                  <p class="text-muted">Fin prévue</p>
                  <p class="font-bold text-texte">{{ formatDate(projet.dateDeFinPrevue) }}</p>
                </div>
              </div>
            </div>

            <!-- Footer carte -->
            <div
              class="mt-auto flex items-center justify-between border-t border-bordure px-5 py-3"
            >
              <span class="text-[11px] text-muted">
                {{ formatDate(projet.dateDeDebut) }} → {{ formatDate(projet.dateDeFinPrevue) }}
              </span>
              <div class="flex items-center gap-2">
                <button
                  v-if="canManage"
                  class="rounded-lg bg-fond px-2.5 py-1 text-[11px] font-bold text-muted transition hover:bg-primary/10 hover:text-primary"
                  @click="ouvrirEdition(projet, $event)"
                >
                  <i class="fa-solid fa-pen text-[10px]"></i>
                </button>
                <span
                  class="text-xs font-bold text-secondary opacity-0 group-hover:opacity-100 transition flex items-center gap-1"
                >
                  Voir
                  <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Vide -->
        <div
          v-else
          class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bordure py-20 text-center"
        >
          <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <i class="fa-solid fa-building text-xl text-primary"></i>
          </div>
          <p class="font-bold text-texte">Aucun projet trouvé</p>
          <p class="mt-1 text-sm text-muted">Essaie un autre filtre ou crée un nouveau projet.</p>
        </div>
      </div>

      <!-- ── VUE LISTE ── -->
      <div v-else>
        <div
          v-if="projetsPagines.length"
          class="overflow-hidden rounded-2xl border border-bordure bg-carte shadow-card"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse">
              <thead class="bg-fond">
                <tr>
                  <th
                    class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
                  >
                    Projet
                  </th>
                  <th
                    class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
                  >
                    Avancement
                  </th>
                  <th
                    class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
                  >
                    Statut
                  </th>
                  <th
                    class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
                  >
                    Chef
                  </th>
                  <th
                    class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
                  >
                    Timeline
                  </th>
                  <th class="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="projet in projetsPagines"
                  :key="projet.id"
                  class="border-t border-bordure transition hover:bg-fond/50 cursor-pointer"
                  @click="router.push(`/projets/${projet.id}`)"
                >
                  <!-- Nom -->
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10"
                      >
                        <i class="fa-solid fa-building text-xs text-primary"></i>
                      </div>
                      <div>
                        <p class="font-bold text-texte">{{ projet.nom }}</p>
                        <p class="text-xs text-muted">{{ projet.adresse }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Avancement -->
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-24 overflow-hidden rounded-full bg-fond">
                        <div
                          class="h-1.5 rounded-full transition-all"
                          :class="STATUT_CONFIG[projet.statutProjet]?.bar ?? 'bg-primary'"
                          :style="{ width: `${progressions[projet.id] ?? 0}%` }"
                        ></div>
                      </div>
                      <span class="text-xs font-bold text-muted"
                        >{{ progressions[projet.id] ?? 0 }}%</span
                      >
                    </div>
                  </td>

                  <!-- Statut -->
                  <td class="px-5 py-4">
                    <span
                      class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                      :class="STATUT_CONFIG[projet.statutProjet]?.badge ?? 'bg-muted/10 text-muted'"
                    >
                      {{ STATUT_CONFIG[projet.statutProjet]?.label ?? projet.statutProjet }}
                    </span>
                  </td>

                  <!-- Chef -->
                  <td class="px-5 py-4 text-sm font-semibold text-texte">
                    {{ chefDuProjet(projet.chefId) }}
                  </td>

                  <!-- Timeline -->
                  <td class="px-5 py-4 text-xs text-muted">
                    <div>{{ formatDate(projet.dateDeDebut) }}</div>
                    <div>{{ formatDate(projet.dateDeFinPrevue) }}</div>
                  </td>

                  <!-- Actions -->
                  <td class="px-5 py-4" @click.stop>
                    <div class="flex items-center gap-2">
                      <button
                        v-if="canManage"
                        class="rounded-lg border border-bordure px-2.5 py-1.5 text-xs font-bold text-muted transition hover:bg-fond hover:text-primary"
                        @click="ouvrirEdition(projet, $event)"
                      >
                        <i class="fa-solid fa-pen text-[10px]"></i>
                      </button>
                      <button
                        class="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary/90"
                        @click="router.push(`/projets/${projet.id}`)"
                      >
                        Détail
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Vide -->
        <div
          v-else
          class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bordure py-20 text-center"
        >
          <p class="font-bold text-texte">Aucun projet trouvé</p>
        </div>
      </div>

      <!-- ── PAGINATION ── -->
      <div v-if="totalPages > 1" class="mt-5 flex items-center justify-center gap-2">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-bordure text-muted transition hover:bg-fond disabled:opacity-40"
          :disabled="page === 1"
          @click="page--"
        >
          <i class="fa-solid fa-chevron-left text-xs"></i>
        </button>
        <button
          v-for="p in totalPages"
          :key="p"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition"
          :class="
            p === page ? 'bg-primary text-white' : 'border border-bordure text-muted hover:bg-fond'
          "
          @click="page = p"
        >
          {{ p }}
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-bordure text-muted transition hover:bg-fond disabled:opacity-40"
          :disabled="page === totalPages"
          @click="page++"
        >
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
      </div>
    </template>

    <!-- Modal -->
    <ModalProjet
      v-if="showModal"
      :projet="projetEdite"
      @close="showModal = false"
      @saved="onSaved"
    />
  </AppLayout>
</template>
