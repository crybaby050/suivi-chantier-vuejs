<script setup>
import { ref, computed, onMounted } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import tacheService from '@/services/tacheService'
import affectationService from '@/services/affectationService'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  tache: { type: Object, required: true },
})
const emit = defineEmits(['close', 'saved', 'deleted'])
const { showToast } = useToast()

const editMode = ref(false)
const loading = ref(false)
const loadingAffectations = ref(false)
const confirmDelete = ref(false)
const loadingDelete = ref(false)
const errors = ref({})

const affectations = ref([])

const STATUTS_EDIT = [
  { value: 'A faire', label: 'À faire' },
  { value: 'En cours', label: 'En cours' },
  { value: 'Terminer', label: 'Terminé' },
  { value: 'Valider', label: 'À valider' },
  { value: 'Renvoyer', label: 'Renvoyé' },
]

const form = ref({
  titre: '',
  description: '',
  dateDeDebut: '',
  dateDeFin: '',
  statutTache: 'A faire',
})

function chargerForm() {
  form.value = {
    titre: props.tache.titre ?? '',
    description: props.tache.description ?? '',
    dateDeDebut: props.tache.dateDeDebut?.slice(0, 10) ?? '',
    dateDeFin: props.tache.dateDeFin?.slice(0, 10) ?? '',
    statutTache: props.tache.statutTache ?? 'A faire',
  }
}
chargerForm()

onMounted(async () => {
  loadingAffectations.value = true
  try {
    affectations.value = await affectationService.listerParTache(props.tache.id)
  } finally {
    loadingAffectations.value = false
  }
})

// ─── Progression calculée ───────────────────────────────────────────────────
const progressionGlobale = computed(() => {
  if (!affectations.value.length) return 0
  const total = affectations.value.reduce((s, a) => s + (a.progression ?? 0), 0)
  return Math.round(total / affectations.value.length)
})

const tousComplets = computed(
  () =>
    affectations.value.length > 0 && affectations.value.every((a) => (a.progression ?? 0) === 100),
)

// ─── Édition ─────────────────────────────────────────────────────────────────
function activerEdition() {
  editMode.value = true
}

function annulerEdition() {
  chargerForm()
  errors.value = {}
  editMode.value = false
}

function valider() {
  errors.value = {}
  if (!form.value.titre.trim()) errors.value.titre = 'Le titre est requis'
  return Object.keys(errors.value).length === 0
}

async function enregistrer() {
  if (!valider()) return
  loading.value = true
  try {
    const result = await tacheService.modifier(props.tache.id, {
      titre: form.value.titre.trim(),
      description: form.value.description.trim() || undefined,
      dateDeDebut: form.value.dateDeDebut || undefined,
      dateDeFin: form.value.dateDeFin || undefined,
      statutTache: form.value.statutTache,
    })
    showToast('Tâche modifiée.')
    emit('saved', result)
    editMode.value = false
  } catch (e) {
    errors.value.global = e.response?.data?.erreur ?? 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

// ─── Suppression ─────────────────────────────────────────────────────────────
async function supprimer() {
  loadingDelete.value = true
  try {
    await tacheService.supprimer(props.tache.id)
    showToast('Tâche supprimée.')
    emit('deleted', props.tache.id)
  } catch (e) {
    showToast('Erreur lors de la suppression.', 'error')
  } finally {
    loadingDelete.value = false
    confirmDelete.value = false
  }
}
</script>

<template>
  <AppModal title="Détail de la tâche" size="lg" @close="emit('close')">
    <div class="space-y-5">
      <div
        v-if="errors.global"
        class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-sm text-bloque"
      >
        {{ errors.global }}
      </div>

      <!-- Infos tâche (inputs toujours présents, activés seulement en édition) -->
      <AppInput v-model="form.titre" label="Titre" :error="errors.titre" :disabled="!editMode" />

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-texte">Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          :disabled="!editMode"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition resize-none disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <AppInput
          v-model="form.dateDeDebut"
          label="Date de début"
          type="date"
          :disabled="!editMode"
        />
        <AppInput v-model="form.dateDeFin" label="Date de fin" type="date" :disabled="!editMode" />
      </div>

      <AppSelect
        v-model="form.statutTache"
        label="Statut"
        :options="STATUTS_EDIT"
        :disabled="!editMode"
      />

      <!-- Progression globale — lecture seule, calculée -->
      <div class="rounded-xl bg-fond p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-texte">Progression globale (calculée)</span>
          <span class="text-sm font-black text-primary">{{ progressionGlobale }}%</span>
        </div>
        <div class="h-3 w-full rounded-full bg-white overflow-hidden">
          <div
            class="h-3 rounded-full bg-primary transition-all duration-700"
            :style="{ width: `${progressionGlobale}%` }"
          ></div>
        </div>
        <p v-if="!tousComplets" class="text-[11px] text-muted mt-2">
          <i class="fa-solid fa-circle-info mr-1"></i>
          La tâche ne pourra être validée que lorsque tous les ouvriers auront atteint 100%.
        </p>
        <p v-else class="text-[11px] text-succes mt-2 font-semibold">
          <i class="fa-solid fa-circle-check mr-1"></i>
          Tous les ouvriers ont terminé leur part — prête pour validation.
        </p>
      </div>

      <!-- Ouvriers assignés -->
      <div>
        <p class="text-xs font-bold text-muted mb-3">
          Ouvriers assignés
          <span class="ml-1 font-normal">({{ affectations.length }})</span>
        </p>

        <div v-if="loadingAffectations" class="flex justify-center py-6">
          <i class="fa-solid fa-spinner fa-spin text-primary text-sm"></i>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="aff in affectations"
            :key="aff.id"
            class="rounded-xl border border-bordure p-4"
          >
            <div class="flex items-center gap-3 mb-2">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary flex-shrink-0"
              >
                {{ String(aff.utilisateurId).slice(-2) }}
              </div>
              <div class="flex-1 min-w-0 flex items-center justify-between">
                <span class="text-sm font-bold text-texte">Ouvrier #{{ aff.utilisateurId }}</span>
                <span
                  class="text-[11px] font-bold rounded-full px-2 py-0.5"
                  :class="{
                    'bg-attente/10 text-attente': ['Non commencer', 'En attente'].includes(
                      aff.statutPersonnel,
                    ),
                    'bg-secondary/10 text-secondary': aff.statutPersonnel === 'En cours',
                    'bg-succes/10 text-succes': aff.statutPersonnel === 'Valider',
                    'bg-bloque/10 text-bloque': aff.statutPersonnel === 'Renvoyer',
                  }"
                >
                  {{ aff.statutPersonnel }}
                </span>
              </div>
            </div>

            <!-- Barre individuelle, lecture seule -->
            <div class="h-2 w-full rounded-full bg-fond overflow-hidden">
              <div
                class="h-2 rounded-full bg-secondary transition-all duration-500"
                :style="{ width: `${aff.progression ?? 0}%` }"
              ></div>
            </div>
            <p class="text-[11px] text-muted mt-1 text-right">{{ aff.progression ?? 0 }}%</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between w-full">
        <button
          v-if="!editMode"
          class="flex items-center gap-2 rounded-xl border border-bloque/30 px-4 py-2 text-sm font-bold text-bloque transition hover:bg-bloque/10"
          @click="confirmDelete = true"
        >
          <i class="fa-solid fa-trash text-xs"></i>
          Supprimer
        </button>
        <div v-else></div>

        <div class="flex gap-3">
          <template v-if="!editMode">
            <button
              class="rounded-xl border border-bordure px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond"
              @click="emit('close')"
            >
              Fermer
            </button>
            <button
              class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
              @click="activerEdition"
            >
              <i class="fa-solid fa-pen text-xs"></i>
              Modifier
            </button>
          </template>
          <template v-else>
            <button
              class="rounded-xl border border-bordure px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond"
              @click="annulerEdition"
            >
              Annuler
            </button>
            <button
              class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60"
              :disabled="loading"
              @click="enregistrer"
            >
              <i v-if="loading" class="fa-solid fa-spinner fa-spin text-xs"></i>
              <i v-else class="fa-solid fa-check text-xs"></i>
              Enregistrer
            </button>
          </template>
        </div>
      </div>
    </template>

    <!-- Confirmation suppression -->
    <Teleport to="body">
      <div
        v-if="confirmDelete"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="confirmDelete = false"
      >
        <div class="absolute inset-0 bg-texte/40 backdrop-blur-sm" />
        <div
          class="relative z-10 w-full max-w-sm rounded-2xl bg-carte border border-bordure shadow-2xl p-6"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bloque/10">
            <i class="fa-solid fa-trash text-bloque"></i>
          </div>
          <h3 class="text-base font-black text-texte mb-1">Supprimer la tâche</h3>
          <p class="text-sm text-muted mb-5">
            Cette action est irréversible. Les affectations et rapports liés seront supprimés.
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
              @click="supprimer"
            >
              <i v-if="loadingDelete" class="fa-solid fa-spinner fa-spin text-xs"></i>
              <i v-else class="fa-solid fa-trash text-xs"></i>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppModal>
</template>
