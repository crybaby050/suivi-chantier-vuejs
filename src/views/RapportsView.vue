<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'
import { useToast } from '@/composables/useToast'
import rapportService from '@/services/rapportService'
import projetService from '@/services/projetService'
import phaseService from '@/services/phaseService'
import tacheService from '@/services/tacheService'
import affectationService from '@/services/affectationService'
import ModalRapport from '@/components/rapports/ModalRapport.vue'

const auth = useAuthStore()
const { isAdmin, isOuvrier, isClient, canManage } = useRole()
const { showToast } = useToast()

const rapports = ref([])
const projets = ref([])
const loading = ref(true)
const showModal = ref(false)
const rapportSelectionne = ref(null)
const confirmSupprimer = ref(null)
const filtre = ref('tous')

const FILTRES = [
  { value: 'tous', label: 'Tous' },
  { value: 'Brouillon', label: 'Brouillons' },
  { value: 'Publié', label: 'Publiés' },
]

// ─── Chargement ───────────────────────────────────────────────────────────────

async function charger() {
  loading.value = true
  try {
    const tousLesProjets = await projetService.lister()
    let projetsFiltres = tousLesProjets

    // Ouvrier — seulement ses projets via affectations
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

    // Client — seulement ses projets (membres)
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

    // Charge les rapports de chaque projet accessible
    const tousLesRapports = []
    await Promise.all(
      projetsFiltres.map(async (projet) => {
        const r = await rapportService.listerParProjet(projet.id)
        r.forEach((rapport) => tousLesRapports.push({ ...rapport, projetNom: projet.nom }))
      }),
    )

    // Trie par date décroissante
    rapports.value = tousLesRapports
      .filter((r) => !r.supprime)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  } finally {
    loading.value = false
  }
}

onMounted(charger)

// ─── Filtrés ──────────────────────────────────────────────────────────────────

const rapportsFiltres = computed(() =>
  filtre.value === 'tous'
    ? rapports.value
    : rapports.value.filter((r) => r.statutRapport === filtre.value),
)

// ─── Actions ──────────────────────────────────────────────────────────────────

function ouvrirCreation() {
  rapportSelectionne.value = null
  showModal.value = true
}

function voirRapport(rapport) {
  rapportSelectionne.value = rapport
  showModal.value = true
}

async function supprimerRapport(rapport) {
  try {
    await rapportService.supprimer(rapport.id)
    rapports.value = rapports.value.filter((r) => r.id !== rapport.id)
    showToast('Rapport supprimé.')
  } catch (e) {
    showToast('Erreur lors de la suppression.', 'error')
  } finally {
    confirmSupprimer.value = null
  }
}

function onSaved(rapport) {
  const idx = rapports.value.findIndex((r) => r.id === rapport.id)
  if (idx !== -1) rapports.value[idx] = { ...rapport, projetNom: rapports.value[idx].projetNom }
  else charger()
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <AppLayout title="Rapports">
    <!-- En-tête -->
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-texte">Rapports</h1>
        <p class="mt-1 text-sm text-muted">{{ rapports.length }} rapport(s) au total</p>
      </div>
      <!-- Tout le monde sauf admin peut créer -->
      <button
        v-if="!isAdmin"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary/90"
        @click="ouvrirCreation"
      >
        <i class="fa-solid fa-plus text-xs"></i>
        Nouveau rapport
      </button>
    </div>

    <!-- Filtres -->
    <div class="mb-5 flex gap-2">
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
              ? rapports.length
              : rapports.filter((r) => r.statutRapport === f.value).length
          }}
        </span>
      </button>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="flex justify-center py-20">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <!-- Liste des rapports -->
    <div v-else-if="rapportsFiltres.length" class="space-y-4">
      <div
        v-for="rapport in rapportsFiltres"
        :key="rapport.id"
        class="rounded-2xl bg-carte border border-bordure shadow-card overflow-hidden transition hover:shadow-soft cursor-pointer"
        @click="voirRapport(rapport)"
      >
        <div class="p-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex-1 min-w-0">
              <!-- Header -->
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  :class="
                    rapport.statutRapport === 'Publié'
                      ? 'bg-succes/10 text-succes'
                      : 'bg-attente/10 text-attente'
                  "
                >
                  {{ rapport.statutRapport }}
                </span>
                <span class="text-xs text-muted">
                  <i class="fa-solid fa-building mr-1 text-[10px]"></i>
                  {{ rapport.projetNom }}
                </span>
                <span class="text-xs text-muted">
                  <i class="fa-solid fa-calendar mr-1 text-[10px]"></i>
                  {{ formatDate(rapport.date) }}
                </span>
              </div>

              <!-- Contenu préview -->
              <p class="text-sm text-texte line-clamp-2">{{ rapport.contenu }}</p>

              <!-- Photos -->
              <div v-if="rapport.photos?.length" class="mt-3 flex gap-2">
                <img
                  v-for="(url, idx) in rapport.photos.slice(0, 4)"
                  :key="idx"
                  :src="url"
                  class="h-12 w-12 rounded-lg object-cover"
                />
                <div
                  v-if="rapport.photos.length > 4"
                  class="flex h-12 w-12 items-center justify-center rounded-lg bg-fond text-xs font-bold text-muted"
                >
                  +{{ rapport.photos.length - 4 }}
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 flex-shrink-0" @click.stop>
              <!-- Supprimer — admin seulement -->
              <button
                v-if="isAdmin"
                class="flex items-center gap-1.5 rounded-xl border border-bloque/30 px-3 py-1.5 text-xs font-bold text-bloque transition hover:bg-bloque/10"
                @click="confirmSupprimer = rapport"
              >
                <i class="fa-solid fa-trash text-[10px]"></i>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vide -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <i class="fa-solid fa-file-lines text-2xl text-primary"></i>
      </div>
      <p class="font-bold text-texte">Aucun rapport</p>
      <p class="mt-1 text-sm text-muted">
        {{
          filtre !== 'tous' ? 'Aucun rapport avec ce statut.' : 'Aucun rapport créé pour le moment.'
        }}
      </p>
    </div>

    <!-- Modal rapport -->
    <ModalRapport
      v-if="showModal"
      :rapport="rapportSelectionne"
      :projets="projets"
      @close="showModal = false"
      @saved="onSaved"
    />

    <!-- Confirmation suppression -->
    <Teleport to="body">
      <div
        v-if="confirmSupprimer"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="confirmSupprimer = null"
      >
        <div
          class="absolute inset-0 bg-texte/40 backdrop-blur-sm"
          @click="confirmSupprimer = null"
        />
        <div
          class="relative z-10 w-full max-w-sm rounded-2xl bg-carte border border-bordure shadow-2xl p-6"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bloque/10">
            <i class="fa-solid fa-trash text-bloque"></i>
          </div>
          <h3 class="text-base font-black text-texte mb-1">Supprimer le rapport</h3>
          <p class="text-sm text-muted mb-5">Cette action est irréversible.</p>
          <div class="flex gap-3 justify-end">
            <button
              class="rounded-xl border border-bordure px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond"
              @click="confirmSupprimer = null"
            >
              Annuler
            </button>
            <button
              class="rounded-xl bg-bloque px-4 py-2 text-sm font-bold text-white transition hover:bg-bloque/90"
              @click="supprimerRapport(confirmSupprimer)"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
