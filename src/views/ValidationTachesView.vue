<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useToast } from '@/composables/useToast'
import projetService from '@/services/projetService'
import phaseService from '@/services/phaseService'
import tacheService from '@/services/tacheService'
import affectationService from '@/services/affectationService'
import rapportService from '@/services/rapportService'

const { showToast } = useToast()

const tachesAValider = ref([])
const loading = ref(true)
const actionLoading = ref(null)
const tacheSelectee = ref(null) // pour le modal détail

// ─── Chargement ───────────────────────────────────────────────────────────────

async function charger() {
  loading.value = true
  try {
    const projets = await projetService.lister()
    const toutes = []

    await Promise.all(
      projets.map(async (projet) => {
        const phases = await phaseService.listerParProjet(projet.id)
        await Promise.all(
          phases.map(async (phase) => {
            const taches = await tacheService.listerParPhase(phase.id)
            const aValider = taches.filter((t) => t.statutTache === 'Valider')
            await Promise.all(
              aValider.map(async (tache) => {
                const affectations = await affectationService.listerParTache(tache.id)
                const rapports = await rapportService.listerParProjet(projet.id)
                toutes.push({
                  ...tache,
                  phase,
                  projet,
                  affectations,
                  rapports: rapports.filter((r) => r.contenu), // rapports liés
                })
              }),
            )
          }),
        )
      }),
    )

    tachesAValider.value = toutes
  } finally {
    loading.value = false
  }
}

onMounted(charger)

// ─── Actions ──────────────────────────────────────────────────────────────────

async function validerTache(tache) {
  actionLoading.value = tache.id
  try {
    await tacheService.modifier(tache.id, { statutTache: 'Terminer' })
    showToast(`Tâche "${tache.titre}" validée.`)
    await charger()
    tacheSelectee.value = null
  } catch (e) {
    showToast('Erreur lors de la validation.', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function renvoyerTache(tache) {
  actionLoading.value = tache.id
  try {
    await tacheService.modifier(tache.id, { statutTache: 'Renvoyer' })
    // Repasse toutes les affectations à "Renvoyer"
    await Promise.all(
      tache.affectations.map((aff) =>
        affectationService.modifier(aff.id, { statutPersonnel: 'Renvoyer' }),
      ),
    )
    showToast(`Tâche "${tache.titre}" renvoyée.`)
    await charger()
    tacheSelectee.value = null
  } catch (e) {
    showToast('Erreur lors du renvoi.', 'error')
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <AppLayout title="Validation des tâches">
    <div class="mb-5">
      <h1 class="text-2xl font-black text-texte">Validation des tâches</h1>
      <p class="mt-1 text-sm text-muted">
        {{ tachesAValider.length }} tâche(s) en attente de validation
      </p>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="flex justify-center py-20">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <!-- Liste -->
    <div v-else-if="tachesAValider.length" class="space-y-4">
      <div
        v-for="tache in tachesAValider"
        :key="tache.id"
        class="rounded-2xl bg-carte border border-primary/20 shadow-card overflow-hidden cursor-pointer transition hover:shadow-soft"
        @click="tacheSelectee = tache"
      >
        <div class="h-1 w-full bg-primary"></div>
        <div class="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex-1 min-w-0">
            <!-- Titre + badge -->
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-black text-texte truncate">{{ tache.titre }}</h3>
              <span
                class="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary flex-shrink-0"
              >
                À valider
              </span>
            </div>

            <!-- Projet > Phase -->
            <p class="text-xs text-muted mb-2">
              <i class="fa-solid fa-building mr-1"></i>
              {{ tache.projet?.nom }}
              <i class="fa-solid fa-chevron-right mx-1 text-[9px]"></i>
              {{ tache.phase?.libelle }}
            </p>

            <!-- Ouvriers assignés -->
            <div class="flex flex-wrap gap-2">
              <span
                v-for="aff in tache.affectations"
                :key="aff.id"
                class="flex items-center gap-1.5 rounded-full bg-fond px-2.5 py-1 text-xs font-semibold text-texte"
              >
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary"
                >
                  {{ aff.utilisateurId }}
                </span>
                Ouvrier #{{ aff.utilisateurId }}
                <span
                  class="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  :class="
                    aff.statutPersonnel === 'Valider'
                      ? 'bg-succes/10 text-succes'
                      : 'bg-attente/10 text-attente'
                  "
                >
                  {{ aff.statutPersonnel }}
                </span>
              </span>
            </div>
          </div>

          <!-- Actions rapides -->
          <div class="flex gap-2 flex-shrink-0" @click.stop>
            <button
              class="flex items-center gap-2 rounded-xl border border-bloque/30 px-3 py-2 text-xs font-bold text-bloque transition hover:bg-bloque/10 disabled:opacity-60"
              :disabled="actionLoading === tache.id"
              @click="renvoyerTache(tache)"
            >
              <i class="fa-solid fa-rotate-left text-[10px]"></i>
              Renvoyer
            </button>
            <button
              class="flex items-center gap-2 rounded-xl bg-succes px-3 py-2 text-xs font-bold text-white transition hover:bg-succes/90 disabled:opacity-60"
              :disabled="actionLoading === tache.id"
              @click="validerTache(tache)"
            >
              <i
                v-if="actionLoading === tache.id"
                class="fa-solid fa-spinner fa-spin text-[10px]"
              ></i>
              <i v-else class="fa-solid fa-check text-[10px]"></i>
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vide -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-succes/10">
        <i class="fa-solid fa-clipboard-check text-2xl text-succes"></i>
      </div>
      <p class="font-bold text-texte">Tout est à jour</p>
      <p class="mt-1 text-sm text-muted">Aucune tâche en attente de validation.</p>
    </div>

    <!-- Modal détail tâche -->
    <Teleport to="body">
      <div
        v-if="tacheSelectee"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="tacheSelectee = null"
      >
        <div class="absolute inset-0 bg-texte/40 backdrop-blur-sm" @click="tacheSelectee = null" />
        <div
          class="relative z-10 w-full max-w-2xl rounded-2xl bg-carte border border-bordure shadow-2xl max-h-[90vh] flex flex-col"
        >
          <!-- Header modal -->
          <div
            class="flex items-center justify-between border-b border-bordure px-6 py-4 flex-shrink-0"
          >
            <h2 class="text-base font-black text-texte">{{ tacheSelectee.titre }}</h2>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition hover:bg-fond"
              @click="tacheSelectee = null"
            >
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Contenu scrollable -->
          <div class="overflow-y-auto flex-1 p-6 space-y-5">
            <!-- Infos tâche -->
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-xl bg-fond p-3">
                <p class="text-xs text-muted mb-1">Projet</p>
                <p class="font-bold text-texte">{{ tacheSelectee.projet?.nom }}</p>
              </div>
              <div class="rounded-xl bg-fond p-3">
                <p class="text-xs text-muted mb-1">Phase</p>
                <p class="font-bold text-texte">{{ tacheSelectee.phase?.libelle }}</p>
              </div>
              <div v-if="tacheSelectee.dateDeDebut" class="rounded-xl bg-fond p-3">
                <p class="text-xs text-muted mb-1">Date de début</p>
                <p class="font-bold text-texte">
                  {{ new Date(tacheSelectee.dateDeDebut).toLocaleDateString('fr-FR') }}
                </p>
              </div>
              <div v-if="tacheSelectee.dateDeFin" class="rounded-xl bg-fond p-3">
                <p class="text-xs text-muted mb-1">Échéance</p>
                <p class="font-bold text-texte">
                  {{ new Date(tacheSelectee.dateDeFin).toLocaleDateString('fr-FR') }}
                </p>
              </div>
            </div>

            <!-- Description -->
            <div v-if="tacheSelectee.description">
              <p class="text-xs font-bold text-muted mb-1">Description</p>
              <p class="text-sm text-texte">{{ tacheSelectee.description }}</p>
            </div>

            <!-- Ouvriers + progression individuelle -->
            <div>
              <p class="text-xs font-bold text-muted mb-3">Ouvriers assignés</p>
              <div class="space-y-3">
                <div
                  v-for="aff in tacheSelectee.affectations"
                  :key="aff.id"
                  class="flex items-center gap-3 rounded-xl bg-fond p-3"
                >
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary flex-shrink-0"
                  >
                    {{ aff.utilisateurId }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-bold text-texte"
                        >Ouvrier #{{ aff.utilisateurId }}</span
                      >
                      <span
                        class="text-[11px] font-bold rounded-full px-2 py-0.5"
                        :class="
                          aff.statutPersonnel === 'Valider'
                            ? 'bg-succes/10 text-succes'
                            : 'bg-attente/10 text-attente'
                        "
                      >
                        {{ aff.statutPersonnel }}
                      </span>
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-white overflow-hidden">
                      <div
                        class="h-1.5 rounded-full bg-secondary transition-all"
                        :style="{ width: `${tacheSelectee.progression ?? 0}%` }"
                      ></div>
                    </div>
                    <p class="text-[11px] text-muted mt-0.5">
                      {{ tacheSelectee.progression ?? 0 }}% complété
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rapports associés -->
            <div v-if="tacheSelectee.rapports?.length">
              <p class="text-xs font-bold text-muted mb-3">Rapport(s) soumis</p>
              <div class="space-y-3">
                <div
                  v-for="rapport in tacheSelectee.rapports"
                  :key="rapport.id"
                  class="rounded-xl border border-bordure p-4"
                >
                  <p class="text-sm text-texte mb-3">{{ rapport.contenu }}</p>
                  <div v-if="rapport.photos?.length" class="grid grid-cols-3 gap-2">
                    <img
                      v-for="(url, idx) in rapport.photos"
                      :key="idx"
                      :src="url"
                      class="rounded-lg aspect-square object-cover w-full cursor-pointer hover:opacity-90 transition"
                    />
                  </div>
                  <p class="text-[11px] text-muted mt-2">
                    {{ new Date(rapport.date).toLocaleDateString('fr-FR') }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer actions -->
          <div class="border-t border-bordure px-6 py-4 flex justify-end gap-3 flex-shrink-0">
            <button
              class="flex items-center gap-2 rounded-xl border border-bloque/30 px-4 py-2 text-sm font-bold text-bloque transition hover:bg-bloque/10 disabled:opacity-60"
              :disabled="actionLoading === tacheSelectee.id"
              @click="renvoyerTache(tacheSelectee)"
            >
              <i class="fa-solid fa-rotate-left text-xs"></i>
              Renvoyer
            </button>
            <button
              class="flex items-center gap-2 rounded-xl bg-succes px-4 py-2 text-sm font-bold text-white transition hover:bg-succes/90 disabled:opacity-60"
              :disabled="actionLoading === tacheSelectee.id"
              @click="validerTache(tacheSelectee)"
            >
              <i
                v-if="actionLoading === tacheSelectee.id"
                class="fa-solid fa-spinner fa-spin text-xs"
              ></i>
              <i v-else class="fa-solid fa-check text-xs"></i>
              Valider la tâche
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
