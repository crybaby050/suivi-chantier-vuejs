<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import projetService from '@/services/projetService'
import phaseService from '@/services/phaseService'
import tacheService from '@/services/tacheService'
import { useRole } from '@/composables/useRole'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import ModalProjet from '@/components/projets/ModalProjet.vue'
import ModalPhase from '@/components/phases/ModalPhase.vue'
import ModalTache from '@/components/taches/ModalTache.vue'
import ModalDetailTache from '@/components/taches/ModalDetailTache.vue'
import affectationService from '@/services/affectationService'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { canManage, isAdmin } = useRole()
const { showToast } = useToast()

// ─── État ─────────────────────────────────────────────────────────────────────
const projet = ref(null)
const phases = ref([])
const taches = ref([])
const phaseActive = ref(null)
const loadingProjet = ref(true)
const loadingTaches = ref(false)
const loadingDelete = ref(false)

const showModal = ref(false)
const confirmDelete = ref(false)
const showModalPhase = ref(false)
const phaseEditee = ref(null)
const showModalTache = ref(false)
const tacheEditee = ref(null)

const showModalDetailTache = ref(false)
const tacheDetail = ref(null)

const progressionParPhase = ref({})
const confirmDeletePhase = ref(null)

// ─── Configs statuts ──────────────────────────────────────────────────────────
const STATUT_PROJET = {
  Planifier: { label: 'Planifié', badge: 'bg-attente/10 text-attente', dot: 'bg-attente' },
  'En cours': { label: 'En cours', badge: 'bg-secondary/10 text-secondary', dot: 'bg-secondary' },
  Suspendu: { label: 'Suspendu', badge: 'bg-inactif/10 text-inactif', dot: 'bg-inactif' },
  Terminer: { label: 'Terminé', badge: 'bg-succes/10 text-succes', dot: 'bg-succes' },
}

const STATUT_PHASE = {
  'En attente': { badge: 'bg-attente/10 text-attente', icon: 'fa-hourglass-half' },
  'En cours': { badge: 'bg-secondary/10 text-secondary', icon: 'fa-spinner' },
  Terminer: { badge: 'bg-succes/10 text-succes', icon: 'fa-circle-check' },
}

const COLONNES_KANBAN = [
  {
    statut: 'A faire',
    label: 'À faire',
    color: 'border-t-attente',
    bg: 'bg-attente/5',
    dot: 'bg-attente',
  },
  {
    statut: 'En cours',
    label: 'En cours',
    color: 'border-t-secondary',
    bg: 'bg-secondary/5',
    dot: 'bg-secondary',
  },
  {
    statut: 'Terminer',
    label: 'Terminé',
    color: 'border-t-succes',
    bg: 'bg-succes/5',
    dot: 'bg-succes',
  },
  {
    statut: 'Valider',
    label: 'À valider',
    color: 'border-t-primary',
    bg: 'bg-primary/5',
    dot: 'bg-primary',
  },
  {
    statut: 'Renvoyer',
    label: 'Renvoyé',
    color: 'border-t-bloque',
    bg: 'bg-bloque/5',
    dot: 'bg-bloque',
  },
]

const progressionProjet = computed(() => {
  if (!phases.value.length) return 0
  const terminees = phases.value.filter((p) => p.statutPhase === 'Terminer').length
  return Math.round((terminees / phases.value.length) * 100)
})

// ─── Calculés ─────────────────────────────────────────────────────────────────
// APRÈS
function calcProgPhase(listeTaches) {
  if (!listeTaches.length) return 0
  const terminees = listeTaches.filter((t) => t.statutTache === 'Terminer').length
  return Math.round((terminees / listeTaches.length) * 100)
}

const progressionPhase = computed(() => calcProgPhase(taches.value))

function tachesDeLaColonne(statut) {
  return taches.value.filter((t) => t.statutTache === statut)
}

// ─── Chargement ───────────────────────────────────────────────────────────────
async function chargerProjet() {
  loadingProjet.value = true
  try {
    const [p, ph] = await Promise.all([
      projetService.detail(route.params.id),
      phaseService.listerParProjet(route.params.id),
    ])
    projet.value = p
    phases.value = ph

    // Calcul progression de toutes les phases en parallèle
    await Promise.all(
      ph.map(async (phase) => {
        const t = await tacheService.listerParPhase(phase.id)
        progressionParPhase.value[phase.id] = calcProgPhase(t)
      }),
    )

    if (ph.length) await selectionnerPhase(ph[0])
  } finally {
    loadingProjet.value = false
  }
}

async function selectionnerPhase(phase) {
  phaseActive.value = phase
  loadingTaches.value = true
  try {
    const liste = await tacheService.listerParPhase(phase.id)
    taches.value = await Promise.all(
      liste.map(async (t) => {
        const affs = await affectationService.listerParTache(t.id)
        return { ...t, progressionCalculee: calcProgressionMoyenne(affs) }
      }),
    )
    progressionParPhase.value[phase.id] = calcProgPhase(taches.value)
  } finally {
    loadingTaches.value = false
  }
}

async function demarrerProjet() {
  try {
    const updated = await projetService.modifier(projet.value.id, { statutProjet: 'En cours' })
    projet.value = updated
    showToast('Projet démarré.')
  } catch (e) {
    showToast('Erreur lors du démarrage.', 'error')
  }
}

async function demarrerPhase(phase, e) {
  e.stopPropagation()
  try {
    const updated = await phaseService.modifier(phase.id, { statutPhase: 'En cours' })
    const idx = phases.value.findIndex((p) => p.id === phase.id)
    if (idx !== -1) phases.value[idx] = updated
    showToast('Phase démarrée.')
  } catch (e) {
    showToast('Erreur lors du démarrage.', 'error')
  }
}

// ─── Actions projet ───────────────────────────────────────────────────────────
function ouvrirEdition() {
  showModal.value = true
}

function onSaved(projetModifie) {
  projet.value = projetModifie
  showToast('Projet modifié avec succès.')
}

async function supprimerProjet() {
  loadingDelete.value = true
  try {
    await projetService.supprimer(projet.value.id)
    showToast('Projet supprimé.')
    router.push('/projets')
  } catch (e) {
    showToast('Erreur lors de la suppression.', 'error')
  } finally {
    loadingDelete.value = false
    confirmDelete.value = false
  }
}

function calcProgressionMoyenne(affs) {
  if (!affs.length) return 0
  const total = affs.reduce((s, a) => s + (a.progression ?? 0), 0)
  return Math.round(total / affs.length)
}

// ─── Actions phase ────────────────────────────────────────────────────────────
function ouvrirCreationPhase() {
  phaseEditee.value = null
  showModalPhase.value = true
}

function ouvrirEditionPhase(phase, e) {
  e.stopPropagation()
  phaseEditee.value = phase
  showModalPhase.value = true
}

function onPhaseSaved(phase) {
  const idx = phases.value.findIndex((p) => p.id === phase.id)
  if (idx !== -1) phases.value[idx] = phase
  else phases.value.push(phase)
}

// ─── Actions tâche ────────────────────────────────────────────────────────────
function ouvrirCreationTache() {
  if (!phaseActive.value) return
  tacheEditee.value = null
  showModalTache.value = true
}

function ouvrirDetailTache(tache, e) {
  e.stopPropagation()
  tacheDetail.value = tache
  showModalDetailTache.value = true
}

function onTacheDeleted(tacheId) {
  taches.value = taches.value.filter((t) => t.id !== tacheId)
  if (phaseActive.value) {
    progressionParPhase.value[phaseActive.value.id] = calcProgPhase(taches.value)
  }
  showModalDetailTache.value = false
}

function onTacheSaved(tache) {
  const idx = taches.value.findIndex((t) => t.id === tache.id)
  if (idx !== -1) taches.value[idx] = tache
  else taches.value.push(tache)

  if (phaseActive.value) {
    progressionParPhase.value[phaseActive.value.id] = calcProgPhase(taches.value)
  }
}

function demanderSuppressionPhase(phase, e) {
  e.stopPropagation()
  confirmDeletePhase.value = phase
}

async function supprimerPhaseConfirmee() {
  if (!confirmDeletePhase.value) return
  try {
    await phaseService.supprimer(confirmDeletePhase.value.id)
    phases.value = phases.value.filter((p) => p.id !== confirmDeletePhase.value.id)
    if (phaseActive.value?.id === confirmDeletePhase.value.id) {
      phaseActive.value = phases.value[0] ?? null
      if (phaseActive.value) await selectionnerPhase(phaseActive.value)
      else taches.value = []
    }
    showToast('Phase supprimée.')
  } catch (e) {
    showToast('Erreur lors de la suppression de la phase.', 'error')
  } finally {
    confirmDeletePhase.value = null
  }
}

onMounted(chargerProjet)
</script>

<template>
  <AppLayout :title="projet?.nom ?? 'Projet'">
    <!-- Loader initial -->
    <div v-if="loadingProjet" class="flex justify-center py-20">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <div v-else-if="projet" class="space-y-5">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs text-muted">
        <button
          class="hover:text-primary transition font-semibold"
          @click="router.push('/projets')"
        >
          Projets
        </button>
        <i class="fa-solid fa-chevron-right text-[9px]"></i>
        <span class="font-bold text-texte truncate">{{ projet.nom }}</span>
      </div>

      <!-- Header projet -->
      <div class="rounded-2xl bg-carte border border-bordure shadow-card overflow-hidden">
        <div
          class="h-1.5 w-full"
          :class="STATUT_PROJET[projet.statutProjet]?.dot ?? 'bg-muted'"
        ></div>
        <div class="p-5 sm:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h1 class="text-xl font-black text-texte">{{ projet.nom }}</h1>
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  :class="STATUT_PROJET[projet.statutProjet]?.badge ?? 'bg-muted/10 text-muted'"
                >
                  {{ STATUT_PROJET[projet.statutProjet]?.label ?? projet.statutProjet }}
                </span>
              </div>
              <div class="flex flex-wrap gap-4 text-xs text-muted mt-2">
                <span class="flex items-center gap-1.5">
                  <i class="fa-solid fa-location-dot"></i>
                  {{ projet.adresse }}
                </span>
                <span class="flex items-center gap-1.5">
                  <i class="fa-solid fa-calendar-day"></i>
                  Début : {{ new Date(projet.dateDeDebut).toLocaleDateString('fr-FR') }}
                </span>
                <span v-if="projet.dateDeFinPrevue" class="flex items-center gap-1.5">
                  <i class="fa-solid fa-flag-checkered"></i>
                  Fin prévue : {{ new Date(projet.dateDeFinPrevue).toLocaleDateString('fr-FR') }}
                </span>
              </div>
              <p v-if="projet.description" class="mt-3 text-sm text-muted">
                {{ projet.description }}
              </p>
              <div class="mt-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-muted">Progression globale</span>
                  <span class="text-xs font-black text-primary">{{ progressionProjet }}%</span>
                </div>
                <div class="h-1.5 w-full rounded-full bg-fond overflow-hidden">
                  <div
                    class="h-1.5 rounded-full transition-all duration-700"
                    :class="STATUT_PROJET[projet.statutProjet]?.dot ?? 'bg-primary'"
                    :style="{ width: `${progressionProjet}%` }"
                  ></div>
                </div>
                <p class="text-[11px] text-muted mt-1">
                  {{ phases.filter((p) => p.statutPhase === 'Terminer').length }} /
                  {{ phases.length }} phase(s) terminée(s)
                </p>
              </div>
            </div>

            <!-- Actions projet -->
            <div v-if="canManage" class="flex gap-2 flex-shrink-0">
              <!-- Bouton Démarrer — visible uniquement si Planifier -->
              <button
                v-if="projet.statutProjet === 'Planifier'"
                class="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-white transition hover:bg-secondary/90"
                @click="demarrerProjet"
              >
                <i class="fa-solid fa-play text-[10px]"></i>
                Démarrer le projet
              </button>

              <button
                class="flex items-center gap-2 rounded-xl border border-bordure px-3 py-2 text-xs font-bold text-muted transition hover:bg-fond hover:text-primary"
                @click="ouvrirEdition"
              >
                <i class="fa-solid fa-pen text-[10px]"></i>
                Modifier
              </button>
              <button
                v-if="isAdmin"
                class="flex items-center gap-2 rounded-xl border border-bloque/30 px-3 py-2 text-xs font-bold text-bloque transition hover:bg-bloque/10"
                @click="confirmDelete = true"
              >
                <i class="fa-solid fa-trash text-[10px]"></i>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Corps : phases + tâches -->
      <div class="flex gap-4 min-h-[600px]">
        <!-- ── Panneau gauche : phases ── -->
        <div class="w-64 flex-shrink-0 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-black uppercase tracking-widest text-muted/70">
              Phases <span class="ml-1 text-muted">{{ phases.length }}</span>
            </h2>
            <button
              v-if="canManage"
              class="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary hover:text-white"
              title="Ajouter une phase"
              @click="ouvrirCreationPhase"
            >
              <i class="fa-solid fa-plus text-[10px]"></i>
            </button>
          </div>

          <!-- État vide phases -->
          <div
            v-if="!phases.length"
            class="rounded-2xl border border-dashed border-bordure p-6 text-center"
          >
            <p class="text-xs text-muted">Aucune phase créée</p>
          </div>

          <!-- Liste des phases -->
          <div
            v-for="phase in phases"
            :key="phase.id"
            role="button"
            tabindex="0"
            class="group w-full text-left rounded-xl border transition-all duration-150 overflow-hidden cursor-pointer"
            :class="
              phaseActive?.id === phase.id
                ? 'border-primary/30 bg-primary/5 shadow-soft'
                : 'border-bordure bg-carte hover:border-primary/20 hover:bg-fond'
            "
            @click="selectionnerPhase(phase)"
            @keydown.enter="selectionnerPhase(phase)"
          >
            <div class="p-3">
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <span
                  class="text-sm font-bold truncate"
                  :class="phaseActive?.id === phase.id ? 'text-primary' : 'text-texte'"
                >
                  {{ phase.libelle }}
                </span>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <!-- Démarrer phase — visible si En attente -->
                  <button
                    v-if="canManage && phase.statutPhase === 'En attente'"
                    class="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 rounded-lg bg-secondary/10 px-1.5 py-0.5 text-[9px] font-bold text-secondary hover:bg-secondary hover:text-white"
                    @click.stop="demarrerPhase(phase, $event)"
                  >
                    <i class="fa-solid fa-play text-[8px]"></i>
                    Démarrer
                  </button>

                  <button
                    v-if="canManage"
                    class="opacity-0 group-hover:opacity-100 transition flex h-5 w-5 items-center justify-center rounded text-muted hover:text-primary"
                    @click.stop="ouvrirEditionPhase(phase, $event)"
                  >
                    <i class="fa-solid fa-pen text-[9px]"></i>
                  </button>
                  <button
                    v-if="isAdmin"
                    class="opacity-0 group-hover:opacity-100 transition flex h-5 w-5 items-center justify-center rounded text-muted hover:text-bloque"
                    @click.stop="demanderSuppressionPhase(phase, $event)"
                  >
                    <i class="fa-solid fa-trash text-[9px]"></i>
                  </button>
                  <i
                    class="fa-solid text-[10px]"
                    :class="[
                      STATUT_PHASE[phase.statutPhase]?.icon ?? 'fa-circle',
                      phaseActive?.id === phase.id ? 'text-primary' : 'text-muted',
                    ]"
                  ></i>
                </div>
              </div>

              <div class="h-1 w-full rounded-full bg-fond overflow-hidden">
                <div
                  class="h-1 rounded-full transition-all duration-500"
                  :class="phaseActive?.id === phase.id ? 'bg-primary' : 'bg-bordure'"
                  :style="{ width: `${progressionParPhase[phase.id] ?? 0}%` }"
                ></div>
              </div>

              <div class="mt-1.5 flex items-center justify-between">
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  :class="STATUT_PHASE[phase.statutPhase]?.badge ?? 'bg-muted/10 text-muted'"
                >
                  {{ phase.statutPhase }}
                </span>
                <span class="text-[10px] text-muted">Ordre {{ phase.ordre }}</span>
              </div>
            </div>

            <div v-if="phaseActive?.id === phase.id" class="h-0.5 w-full bg-primary"></div>
          </div>
        </div>

        <!-- ── Panneau droit : kanban des tâches ── -->
        <div class="flex-1 min-w-0">
          <!-- Header kanban -->
          <div class="mb-3 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-black text-texte">
                {{ phaseActive ? phaseActive.libelle : 'Sélectionne une phase' }}
              </h2>
              <p v-if="phaseActive" class="text-xs text-muted mt-0.5">
                {{ taches.length }} tâche(s) · Progression {{ progressionPhase }}%
              </p>
            </div>
            <button
              v-if="phaseActive && canManage"
              class="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
              @click="ouvrirCreationTache"
            >
              <i class="fa-solid fa-plus text-[10px]"></i>
              Ajouter une tâche
            </button>
          </div>

          <!-- Loader tâches -->
          <div v-if="loadingTaches" class="flex justify-center py-16">
            <i class="fa-solid fa-spinner fa-spin text-primary text-xl"></i>
          </div>

          <!-- Kanban -->
          <div v-else-if="phaseActive" class="flex gap-3 overflow-x-auto pb-4">
            <div
              v-for="col in COLONNES_KANBAN"
              :key="col.statut"
              class="flex-shrink-0 w-56 flex flex-col rounded-2xl border-t-2 border border-bordure overflow-hidden"
              :class="[col.color, col.bg]"
            >
              <!-- Header colonne -->
              <div class="flex items-center justify-between px-3 py-2.5 border-b border-bordure/50">
                <div class="flex items-center gap-2">
                  <div class="h-2 w-2 rounded-full" :class="col.dot"></div>
                  <span class="text-xs font-black text-texte">{{ col.label }}</span>
                </div>
                <span class="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-muted">
                  {{ tachesDeLaColonne(col.statut).length }}
                </span>
              </div>

              <!-- Cartes tâches -->
              <div class="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[520px]">
                <!-- État vide -->
                <div
                  v-if="!tachesDeLaColonne(col.statut).length"
                  class="flex items-center justify-center py-6 text-center"
                >
                  <p class="text-[11px] text-muted/60">Aucune tâche</p>
                </div>

                <!-- Carte tâche -->
                <div
                  v-for="tache in tachesDeLaColonne(col.statut)"
                  :key="tache.id"
                  class="group rounded-xl bg-carte border border-bordure p-3 shadow-card transition-all hover:shadow-soft hover:-translate-y-0.5 cursor-pointer"
                  @click="ouvrirDetailTache(tache, $event)"
                >
                  <p class="text-xs font-bold text-texte line-clamp-2 mb-2">{{ tache.titre }}</p>

                  <!-- Barre de progression -->
                  <div class="mb-2">
                    <div class="flex justify-between mb-1">
                      <span class="text-[10px] text-muted">Progression</span>
                      <span class="text-[10px] font-bold text-texte"
                        >{{ tache.progressionCalculee ?? 0 }}%</span
                      >
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-fond overflow-hidden">
                      <div
                        class="h-1.5 rounded-full transition-all"
                        :class="col.dot"
                        :style="{ width: `${tache.progressionCalculee ?? 0}%` }"
                      ></div>
                    </div>
                  </div>

                  <!-- Footer carte tâche -->
                  <div class="flex items-center justify-between">
                    <span v-if="tache.dateDeFin" class="text-[10px] text-muted">
                      <i class="fa-solid fa-flag-checkered mr-0.5"></i>
                      {{ new Date(tache.dateDeFin).toLocaleDateString('fr-FR') }}
                    </span>
                    <span v-else class="text-[10px] text-muted italic">Pas d'échéance</span>
                    <i
                      class="fa-solid fa-chevron-right text-[9px] text-muted opacity-0 group-hover:opacity-100 transition"
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pas de phase sélectionnée -->
          <div
            v-else
            class="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-bordure"
          >
            <i class="fa-solid fa-arrow-left text-2xl text-muted/40 mb-3"></i>
            <p class="text-sm font-bold text-muted">Sélectionne une phase</p>
            <p class="text-xs text-muted/60 mt-1">pour voir ses tâches</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal modification projet -->
    <ModalProjet v-if="showModal" :projet="projet" @close="showModal = false" @saved="onSaved" />

    <!-- Modal phase -->
    <ModalPhase
      v-if="showModalPhase"
      :phase="phaseEditee"
      :projet-id="Number(route.params.id)"
      :nombre-phases="phases.length"
      @close="showModalPhase = false"
      @saved="onPhaseSaved"
    />

    <!-- Modal tâche -->
    <ModalTache
      v-if="showModalTache"
      :tache="tacheEditee"
      :phase-id="phaseActive?.id"
      @close="showModalTache = false"
      @saved="onTacheSaved"
    />

    <ModalDetailTache
      v-if="showModalDetailTache"
      :tache="tacheDetail"
      @close="showModalDetailTache = false"
      @saved="onTacheSaved"
      @deleted="onTacheDeleted"
    />

    <!-- Confirmation suppression projet -->
    <Teleport to="body">
      <div
        v-if="confirmDelete"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="confirmDelete = false"
      >
        <div class="absolute inset-0 bg-texte/40 backdrop-blur-sm" @click="confirmDelete = false" />
        <div
          class="relative z-10 w-full max-w-sm rounded-2xl bg-carte border border-bordure shadow-2xl p-6"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bloque/10">
            <i class="fa-solid fa-trash text-bloque"></i>
          </div>
          <h3 class="text-base font-black text-texte mb-1">Supprimer le projet</h3>
          <p class="text-sm text-muted mb-5">
            Cette action est irréversible. Toutes les phases, tâches et données liées seront
            supprimées.
          </p>
          <div class="flex gap-3 justify-end">
            <button
              class="rounded-xl border border-bordure px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond"
              @click="confirmDelete = false"
            >
              Annuler
            </button>
            <button
              class="flex items-center gap-2 rounded-xl bg-bloque px-4 py-2 text-sm font-bold text-white transition hover:bg-bloque/90 disabled:opacity-60"
              :disabled="loadingDelete"
              @click="supprimerProjet"
            >
              <i v-if="loadingDelete" class="fa-solid fa-spinner fa-spin text-xs"></i>
              <i v-else class="fa-solid fa-trash text-xs"></i>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Confirmation suppression phase -->
    <Teleport to="body">
      <div
        v-if="confirmDeletePhase"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="confirmDeletePhase = null"
      >
        <div
          class="absolute inset-0 bg-texte/40 backdrop-blur-sm"
          @click="confirmDeletePhase = null"
        />
        <div
          class="relative z-10 w-full max-w-sm rounded-2xl bg-carte border border-bordure shadow-2xl p-6"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bloque/10">
            <i class="fa-solid fa-trash text-bloque"></i>
          </div>
          <h3 class="text-base font-black text-texte mb-1">Supprimer la phase</h3>
          <p class="text-sm text-muted mb-5">
            Cette action est irréversible. Toutes les tâches, affectations et rapports liés à
            <strong>{{ confirmDeletePhase.libelle }}</strong> seront supprimés.
          </p>
          <div class="flex gap-3 justify-end">
            <button
              class="rounded-xl border border-bordure px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond"
              @click="confirmDeletePhase = null"
            >
              Annuler
            </button>
            <button
              class="flex items-center gap-2 rounded-xl bg-bloque px-4 py-2 text-sm font-bold text-white transition hover:bg-bloque/90"
              @click="supprimerPhaseConfirmee"
            >
              <i class="fa-solid fa-trash text-xs"></i>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
