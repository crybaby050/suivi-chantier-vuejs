<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import affectationService from '@/services/affectationService'
import tacheService from '@/services/tacheService'
import ModalRapportTache from '@/components/rapports/ModalRapportTache.vue'
import phaseService from '@/services/phaseService'

const auth = useAuthStore()
const { showToast } = useToast()

const affectations = ref([])
const loading = ref(true)
const filtre = ref('tous')
const actionLoading = ref(null) // id affectation en cours d'action

const FILTRES = [
  { value: 'tous', label: 'Toutes' },
  { value: 'A faire', label: 'À faire' },
  { value: 'En cours', label: 'En cours' },
  { value: 'Valider', label: 'À valider' },
  { value: 'Renvoyer', label: 'Renvoyées' },
  { value: 'Terminer', label: 'Terminées' },
]

const STATUT_CONFIG = {
  'A faire': { badge: 'bg-attente/10 text-attente', dot: 'bg-attente', label: 'À faire' },
  'En cours': { badge: 'bg-secondary/10 text-secondary', dot: 'bg-secondary', label: 'En cours' },
  Terminer: { badge: 'bg-succes/10 text-succes', dot: 'bg-succes', label: 'Terminé' },
  Valider: { badge: 'bg-primary/10 text-primary', dot: 'bg-primary', label: 'À valider' },
  Renvoyer: { badge: 'bg-bloque/10 text-bloque', dot: 'bg-bloque', label: 'Renvoyée' },
}

// ─── Données enrichies ───────────────────────────────────────────────────────

const tachesFiltrees = computed(() => {
  const liste = affectations.value
  if (filtre.value === 'tous') return liste
  return liste.filter((a) => a.tache?.statutTache === filtre.value)
})

// ─── Chargement ───────────────────────────────────────────────────────────────

async function charger() {
  loading.value = true
  try {
    const data = await affectationService.listerParUtilisateur(auth.user.id)
    affectations.value = await Promise.all(
      data.map(async (aff) => {
        const tache = await tacheService.detail(aff.tacheId)
        const phase = await phaseService.detail(tache.phaseId)
        return { ...aff, tache, phaseId: tache.phaseId, projetId: phase.projetId }
      }),
    )
  } finally {
    loading.value = false
  }
}

onMounted(charger)

// ─── Actions ──────────────────────────────────────────────────────────────────

async function demarrerTache(affectation) {
  actionLoading.value = affectation.id
  try {
    // Passe le statut tâche à "En cours"
    await tacheService.modifier(affectation.tacheId, { statutTache: 'En cours' })
    // Passe le statut personnel à "En cours"
    await affectationService.modifier(affectation.id, { statutPersonnel: 'En cours' })
    showToast('Tâche démarrée.')
    await charger()
  } catch (e) {
    showToast('Erreur lors du démarrage.', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function mettreAJourProgression(affectation, progression) {
  try {
    await tacheService.modifier(affectation.tacheId, { progression: Number(progression) })
    // Mise à jour locale immédiate
    const idx = affectations.value.findIndex((a) => a.id === affectation.id)
    if (idx !== -1) affectations.value[idx].tache.progression = Number(progression)
  } catch (e) {
    showToast('Erreur lors de la mise à jour.', 'error')
  }
}

// Ouvre la modal de rapport avant de terminer
const showModalRapport = ref(false)
const affectationEnCours = ref(null)

function ouvrirRapport(affectation) {
  affectationEnCours.value = affectation
  showModalRapport.value = true
}

async function terminerTache(affectation) {
  actionLoading.value = affectation.id
  try {
    await affectationService.modifier(affectation.id, { statutPersonnel: 'Valider' })
    // Si une seule affectation → tâche passe en attente de validation
    await tacheService.modifier(affectation.tacheId, { statutTache: 'Valider' })
    showToast('Tâche soumise pour validation.')
    await charger()
  } catch (e) {
    showToast('Erreur.', 'error')
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <AppLayout title="Mes tâches">
    <!-- En-tête -->
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-texte">Mes tâches</h1>
        <p class="mt-1 text-sm text-muted">{{ affectations.length }} tâche(s) assignée(s)</p>
      </div>
    </div>

    <!-- Filtres -->
    <div class="mb-5 flex flex-wrap gap-2">
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
              ? affectations.length
              : affectations.filter((a) => a.tache?.statutTache === f.value).length
          }}
        </span>
      </button>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="flex justify-center py-20">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <!-- Liste des tâches -->
    <div v-else-if="tachesFiltrees.length" class="space-y-4">
      <div
        v-for="aff in tachesFiltrees"
        :key="aff.id"
        class="rounded-2xl bg-carte border border-bordure shadow-card overflow-hidden"
      >
        <!-- Bandeau statut -->
        <div
          class="h-1 w-full"
          :class="STATUT_CONFIG[aff.tache?.statutTache]?.dot ?? 'bg-muted'"
        ></div>

        <div class="p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <!-- Infos tâche -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-black text-texte">{{ aff.tache?.titre }}</h3>
                <span
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-bold flex-shrink-0"
                  :class="STATUT_CONFIG[aff.tache?.statutTache]?.badge ?? 'bg-muted/10 text-muted'"
                >
                  {{ STATUT_CONFIG[aff.tache?.statutTache]?.label ?? aff.tache?.statutTache }}
                </span>
              </div>

              <p v-if="aff.tache?.description" class="text-sm text-muted mb-3">
                {{ aff.tache.description }}
              </p>

              <div class="flex flex-wrap gap-3 text-xs text-muted mb-4">
                <span v-if="aff.tache?.dateDeDebut" class="flex items-center gap-1">
                  <i class="fa-solid fa-calendar-day text-[10px]"></i>
                  Début : {{ new Date(aff.tache.dateDeDebut).toLocaleDateString('fr-FR') }}
                </span>
                <span v-if="aff.tache?.dateDeFin" class="flex items-center gap-1">
                  <i class="fa-solid fa-flag-checkered text-[10px]"></i>
                  Échéance : {{ new Date(aff.tache.dateDeFin).toLocaleDateString('fr-FR') }}
                </span>
              </div>

              <!-- Progression (visible seulement si En cours) -->
              <div v-if="aff.tache?.statutTache === 'En cours'" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-texte">Ma progression</span>
                  <span class="text-xs font-black text-primary"
                    >{{ aff.tache?.progression ?? 0 }}%</span
                  >
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  :value="aff.tache?.progression ?? 0"
                  class="w-full accent-primary"
                  @change="mettreAJourProgression(aff, $event.target.value)"
                />
                <div class="h-2 w-full rounded-full bg-fond overflow-hidden">
                  <div
                    class="h-2 rounded-full bg-secondary transition-all duration-500"
                    :style="{ width: `${aff.tache?.progression ?? 0}%` }"
                  ></div>
                </div>

                <!-- Alerte rapport obligatoire si 100% -->
                <div
                  v-if="aff.tache?.progression === 100"
                  class="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-xs text-primary flex items-center gap-2"
                >
                  <i class="fa-solid fa-file-lines"></i>
                  Progression à 100% — un rapport avec photos est requis avant de terminer.
                </div>
              </div>

              <!-- Tâche renvoyée -->
              <div
                v-if="aff.tache?.statutTache === 'Renvoyer'"
                class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-xs text-bloque flex items-center gap-2"
              >
                <i class="fa-solid fa-triangle-exclamation"></i>
                Cette tâche a été renvoyée. Corrigez le travail et soumettez à nouveau.
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 flex-shrink-0">
              <!-- Bouton Démarrer -->
              <button
                v-if="aff.tache?.statutTache === 'A faire'"
                class="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-white transition hover:bg-secondary/90 disabled:opacity-60"
                :disabled="actionLoading === aff.id"
                @click="demarrerTache(aff)"
              >
                <i v-if="actionLoading === aff.id" class="fa-solid fa-spinner fa-spin text-xs"></i>
                <i v-else class="fa-solid fa-play text-xs"></i>
                Démarrer
              </button>

              <!-- Bouton Écrire le rapport (si 100%) -->
              <button
                v-if="aff.tache?.statutTache === 'En cours' && aff.tache?.progression === 100"
                class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
                @click="ouvrirRapport(aff)"
              >
                <i class="fa-solid fa-file-pen text-xs"></i>
                Écrire le rapport
              </button>

              <!-- Bouton Soumettre (si rapport déjà écrit) -->
              <button
                v-if="
                  aff.tache?.statutTache === 'En cours' &&
                  aff.tache?.progression === 100 &&
                  aff.rapportId
                "
                class="flex items-center gap-2 rounded-xl bg-succes px-4 py-2 text-sm font-bold text-white transition hover:bg-succes/90 disabled:opacity-60"
                :disabled="actionLoading === aff.id"
                @click="terminerTache(aff)"
              >
                <i v-if="actionLoading === aff.id" class="fa-solid fa-spinner fa-spin text-xs"></i>
                <i v-else class="fa-solid fa-check text-xs"></i>
                Terminer la tâche
              </button>

              <!-- Si tâche renvoyée — re-soumettre après correction -->
              <button
                v-if="aff.tache?.statutTache === 'Renvoyer'"
                class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
                @click="ouvrirRapport(aff)"
              >
                <i class="fa-solid fa-rotate-left text-xs"></i>
                Corriger et soumettre
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vide -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <i class="fa-solid fa-list-check text-2xl text-primary"></i>
      </div>
      <p class="font-bold text-texte">Aucune tâche</p>
      <p class="mt-1 text-sm text-muted">
        {{
          filtre !== 'tous'
            ? 'Aucune tâche avec ce statut.'
            : "Tu n'as pas encore de tâches assignées."
        }}
      </p>
    </div>

    <!-- Modal rapport (à implémenter dans la prochaine étape) -->
    <ModalRapportTache
      v-if="showModalRapport"
      :affectation="affectationEnCours"
      :projet-id="affectationEnCours?.projetId"
      @close="showModalRapport = false"
      @termine="charger"
    />
    <!-- <ModalRapportTache v-if="showModalRapport" ... /> -->
  </AppLayout>
</template>
