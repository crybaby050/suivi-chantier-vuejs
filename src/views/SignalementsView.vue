<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'
import { useToast } from '@/composables/useToast'
import signalementService from '@/services/signalementService'
import projetService from '@/services/projetService'
import phaseService from '@/services/phaseService'
import tacheService from '@/services/tacheService'
import affectationService from '@/services/affectationService'
import utilisateurService from '@/services/utilisateurService'
import ModalSignalement from '@/components/signalements/ModalSignalement.vue'

const router = useRouter()
const auth = useAuthStore()
const { isAdmin, isOuvrier, isClient } = useRole()
const { showToast } = useToast()

const signalements = ref([])
const projets = ref([])
const loading = ref(true)
const showModal = ref(false)
const signalSelectionne = ref(null)
const filtre = ref('tous')

const FILTRES = [
  { value: 'tous', label: 'Tous' },
  { value: 'En traitement', label: 'En traitement' },
  { value: 'Résolu', label: 'Résolus' },
]

const STATUT_CONFIG = {
  'En traitement': {
    badge: 'bg-attente/10 text-attente',
    dot: 'bg-attente',
    label: 'En traitement',
  },
  Résolu: { badge: 'bg-succes/10 text-succes', dot: 'bg-succes', label: 'Résolu' },
}

const CIBLE_CONFIG = {
  Projet: { icon: 'fa-building', color: 'text-primary' },
  Phase: { icon: 'fa-layer-group', color: 'text-secondary' },
  Tache: { icon: 'fa-list-check', color: 'text-attente' },
  Rapport: { icon: 'fa-file-lines', color: 'text-muted' },
}

// ─── Chargement ───────────────────────────────────────────────────────────────

async function charger() {
  loading.value = true
  try {
    const tousLesProjets = await projetService.lister()
    let projetsFiltres = tousLesProjets

    // Ouvrier — seulement ses projets
    if (isOuvrier.value) {
      const affs = await affectationService.listerParUtilisateur(auth.user.id)
      const projetIds = new Set()
      await Promise.all(
        affs.map(async (aff) => {
          try {
            const tache = await tacheService.detail(aff.tacheId)
            const phase = await phaseService.detail(tache.phaseId)
            projetIds.add(phase.projetId)
          } catch (_) {}
        }),
      )
      projetsFiltres = tousLesProjets.filter((p) => projetIds.has(p.id))
    }

    // Client — seulement ses projets
    if (isClient.value) {
      const memberships = await Promise.all(
        tousLesProjets.map(async (p) => {
          const membres = await projetService.listerMembres(p.id)
          return membres.some((m) => m.utilisateurId === auth.user.id) ? p : null
        }),
      )
      projetsFiltres = memberships.filter(Boolean)
    }

    projets.value = projetsFiltres

    const utilisateurs = await utilisateurService.lister()
    const tousLesSignals = []

    await Promise.all(
      projetsFiltres.map(async (projet) => {
        const liste = await signalementService.listerParProjet(projet.id)
        liste.forEach((s) => {
          const auteur = utilisateurs.find((u) => u.id === s.auteurId)
          tousLesSignals.push({
            ...s,
            projetNom: projet.nom,
            auteurNom: auteur?.nom ?? `#${s.auteurId}`,
          })
        })
      }),
    )

    signalements.value = tousLesSignals.sort(
      (a, b) => new Date(b.dateDeSignalement) - new Date(a.dateDeSignalement),
    )
  } finally {
    loading.value = false
  }
}

onMounted(charger)

// ─── Filtrés ──────────────────────────────────────────────────────────────────

const signalementsFiltres = computed(() =>
  filtre.value === 'tous'
    ? signalements.value
    : signalements.value.filter((s) => s.statut === filtre.value),
)

// ─── Actions ──────────────────────────────────────────────────────────────────

async function marquerResolu(s) {
  try {
    const updated = await signalementService.modifierStatut(s.id, 'Résolu')
    const idx = signalements.value.findIndex((x) => x.id === s.id)
    if (idx !== -1) signalements.value[idx] = { ...signalements.value[idx], statut: 'Résolu' }
    showToast('Signalement marqué comme résolu.')
    signalSelectionne.value = null
  } catch (e) {
    showToast('Erreur.', 'error')
  }
}

// Navigation vers la cible du signalement
async function allerVersLaCible(s) {
  if (s.projetId) {
    router.push(`/projets/${s.projetId}`)
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function onSaved() {
  charger()
}
</script>

<template>
  <AppLayout title="Signalements">
    <!-- En-tête -->
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-texte">Signalements</h1>
        <p class="mt-1 text-sm text-muted">{{ signalements.length }} signalement(s) au total</p>
      </div>
      <!-- Tout le monde sauf admin peut signaler -->
      <button
        v-if="!isAdmin"
        class="flex items-center gap-2 rounded-xl bg-attente px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-attente/90"
        @click="showModal = true"
      >
        <i class="fa-solid fa-triangle-exclamation text-xs"></i>
        Nouveau signalement
      </button>
    </div>

    <!-- Filtres -->
    <div class="mb-5 flex gap-2 flex-wrap">
      <button
        v-for="f in FILTRES"
        :key="f.value"
        class="rounded-xl px-3 py-1.5 text-xs font-bold transition"
        :class="
          filtre === f.value
            ? 'bg-primary text-white'
            : 'bg-carte border border-bordure text-muted hover:bg-fond hover:text-primary'
        "
        @click="filtre = f.value"
      >
        {{ f.label }}
        <span class="ml-1 opacity-60">
          {{
            f.value === 'tous'
              ? signalements.length
              : signalements.filter((s) => s.statut === f.value).length
          }}
        </span>
      </button>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="flex justify-center py-20">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <!-- Liste -->
    <div v-else-if="signalementsFiltres.length" class="space-y-4">
      <div
        v-for="s in signalementsFiltres"
        :key="s.id"
        class="rounded-2xl bg-carte border shadow-card overflow-hidden transition hover:shadow-soft cursor-pointer"
        :class="s.statut === 'En traitement' ? 'border-attente/30' : 'border-bordure'"
        @click="signalSelectionne = s"
      >
        <!-- Bandeau statut -->
        <div class="h-1 w-full" :class="STATUT_CONFIG[s.statut]?.dot ?? 'bg-muted'"></div>

        <div class="p-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex-1 min-w-0">
              <!-- Header -->
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  :class="STATUT_CONFIG[s.statut]?.badge ?? 'bg-muted/10 text-muted'"
                >
                  {{ STATUT_CONFIG[s.statut]?.label ?? s.statut }}
                </span>

                <!-- Cible -->
                <span class="flex items-center gap-1 text-xs text-muted">
                  <i
                    :class="`fa-solid ${CIBLE_CONFIG[s.cibleType]?.icon ?? 'fa-circle'} text-[10px] ${CIBLE_CONFIG[s.cibleType]?.color}`"
                  ></i>
                  {{ s.cibleType }}
                </span>

                <span class="text-xs text-muted flex items-center gap-1">
                  <i class="fa-solid fa-building text-[10px]"></i>
                  {{ s.projetNom }}
                </span>

                <span class="text-xs text-muted flex items-center gap-1">
                  <i class="fa-solid fa-user text-[10px]"></i>
                  {{ s.auteurNom }}
                </span>

                <span class="text-xs text-muted flex items-center gap-1">
                  <i class="fa-solid fa-calendar text-[10px]"></i>
                  {{ formatDate(s.dateDeSignalement) }}
                </span>
              </div>

              <!-- Titre + description -->
              <h3 class="font-black text-texte mb-1">{{ s.titre }}</h3>
              <p class="text-sm text-muted line-clamp-2">{{ s.description }}</p>
            </div>

            <!-- Actions rapides admin -->
            <div v-if="isAdmin" class="flex gap-2 flex-shrink-0" @click.stop>
              <button
                v-if="s.statut === 'En traitement'"
                class="flex items-center gap-1.5 rounded-xl bg-succes/10 px-3 py-1.5 text-xs font-bold text-succes transition hover:bg-succes hover:text-white"
                @click="marquerResolu(s)"
              >
                <i class="fa-solid fa-check text-[10px]"></i>
                Résoudre
              </button>
              <button
                class="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
                @click.stop="allerVersLaCible(s)"
              >
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                Voir la cible
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vide -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-attente/10">
        <i class="fa-solid fa-triangle-exclamation text-2xl text-attente"></i>
      </div>
      <p class="font-bold text-texte">Aucun signalement</p>
      <p class="mt-1 text-sm text-muted">
        {{
          filtre !== 'tous'
            ? 'Aucun signalement avec ce statut.'
            : 'Aucun signalement pour le moment.'
        }}
      </p>
    </div>

    <!-- Modal détail signalement -->
    <Teleport to="body">
      <div
        v-if="signalSelectionne"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="signalSelectionne = null"
      >
        <div
          class="absolute inset-0 bg-texte/40 backdrop-blur-sm"
          @click="signalSelectionne = null"
        />
        <div
          class="relative z-10 w-full max-w-lg rounded-2xl bg-carte border border-bordure shadow-2xl max-h-[90vh] flex flex-col"
        >
          <!-- Header modal -->
          <div
            class="flex items-center justify-between border-b border-bordure px-6 py-4 flex-shrink-0"
          >
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                :class="STATUT_CONFIG[signalSelectionne.statut]?.badge"
              >
                {{ STATUT_CONFIG[signalSelectionne.statut]?.label }}
              </span>
              <h2 class="text-base font-black text-texte">{{ signalSelectionne.titre }}</h2>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition hover:bg-fond"
              @click="signalSelectionne = null"
            >
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Contenu -->
          <div class="overflow-y-auto flex-1 p-6 space-y-4">
            <!-- Infos -->
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-xl bg-fond p-3">
                <p class="text-[11px] text-muted mb-1">Projet</p>
                <p class="text-sm font-bold text-texte">{{ signalSelectionne.projetNom }}</p>
              </div>
              <div class="rounded-xl bg-fond p-3">
                <p class="text-[11px] text-muted mb-1">Cible</p>
                <p class="text-sm font-bold text-texte flex items-center gap-1.5">
                  <i
                    :class="`fa-solid ${CIBLE_CONFIG[signalSelectionne.cibleType]?.icon} text-xs ${CIBLE_CONFIG[signalSelectionne.cibleType]?.color}`"
                  ></i>
                  {{ signalSelectionne.cibleType }}
                </p>
              </div>
              <div class="rounded-xl bg-fond p-3">
                <p class="text-[11px] text-muted mb-1">Signalé par</p>
                <p class="text-sm font-bold text-texte">{{ signalSelectionne.auteurNom }}</p>
              </div>
              <div class="rounded-xl bg-fond p-3">
                <p class="text-[11px] text-muted mb-1">Date</p>
                <p class="text-sm font-bold text-texte">
                  {{ formatDate(signalSelectionne.dateDeSignalement) }}
                </p>
              </div>
            </div>

            <!-- Description -->
            <div>
              <p class="text-xs font-bold text-muted mb-2">Description</p>
              <div class="rounded-xl bg-fond p-4">
                <p class="text-sm text-texte leading-relaxed whitespace-pre-wrap">
                  {{ signalSelectionne.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Footer actions admin -->
          <div
            v-if="isAdmin"
            class="border-t border-bordure px-6 py-4 flex justify-between items-center flex-shrink-0"
          >
            <button
              class="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
              @click="
                allerVersLaCible(signalSelectionne)
                signalSelectionne = null
              "
            >
              <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
              Aller vers la cible
            </button>

            <button
              v-if="signalSelectionne.statut === 'En traitement'"
              class="flex items-center gap-2 rounded-xl bg-succes px-4 py-2 text-sm font-bold text-white transition hover:bg-succes/90"
              @click="marquerResolu(signalSelectionne)"
            >
              <i class="fa-solid fa-check text-xs"></i>
              Marquer comme résolu
            </button>
            <span v-else class="text-xs font-bold text-succes flex items-center gap-1">
              <i class="fa-solid fa-circle-check"></i>
              Résolu
            </span>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal création signalement -->
    <ModalSignalement
      v-if="showModal"
      :projets="projets"
      @close="showModal = false"
      @saved="onSaved"
    />
  </AppLayout>
</template>
