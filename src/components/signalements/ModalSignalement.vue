<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppInput from '@/components/ui/AppInput.vue'
import signalementService from '@/services/signalementService'
import projetService from '@/services/projetService'
import phaseService from '@/services/phaseService'
import tacheService from '@/services/tacheService'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  projets: { type: Array, default: () => [] },
  // Pré-sélection depuis une page détail
  projetId: { type: Number, default: null },
  phaseId: { type: Number, default: null },
  tacheId: { type: Number, default: null },
})
const emit = defineEmits(['close', 'saved'])
const { showToast } = useToast()

const loading = ref(false)
const errors = ref({})
const phases = ref([])
const taches = ref([])

const form = ref({
  projetId: props.projetId ?? '',
  phaseId: props.phaseId ?? '',
  tacheId: props.tacheId ?? '',
  cibleType: 'Projet',
  titre: '',
  description: '',
})

const optionsProjets = computed(() => props.projets.map((p) => ({ value: p.id, label: p.nom })))
const optionsPhases = computed(() => phases.value.map((p) => ({ value: p.id, label: p.libelle })))
const optionsTaches = computed(() => taches.value.map((t) => ({ value: t.id, label: t.titre })))

const CIBLES = [
  { value: 'Projet', label: 'Projet entier' },
  { value: 'Phase', label: 'Phase' },
  { value: 'Tache', label: 'Tâche' },
]

watch(
  () => form.value.projetId,
  async (id) => {
    if (!id) {
      phases.value = []
      taches.value = []
      return
    }
    phases.value = await phaseService.listerParProjet(id)
  },
)

watch(
  () => form.value.phaseId,
  async (id) => {
    if (!id) {
      taches.value = []
      return
    }
    taches.value = await tacheService.listerParPhase(id)
  },
)

watch(
  () => form.value.cibleType,
  (val) => {
    if (val === 'Projet') {
      form.value.phaseId = ''
      form.value.tacheId = ''
    }
    if (val === 'Phase') {
      form.value.tacheId = ''
    }
  },
)

// Pré-sélectionne la cible selon les props
onMounted(async () => {
  if (props.tacheId) {
    form.value.cibleType = 'Tache'
    form.value.tacheId = props.tacheId
  } else if (props.phaseId) {
    form.value.cibleType = 'Phase'
    form.value.phaseId = props.phaseId
  } else if (props.projetId) {
    form.value.cibleType = 'Projet'
  }

  if (props.projetId) {
    phases.value = await phaseService.listerParProjet(props.projetId)
    if (props.phaseId) {
      taches.value = await tacheService.listerParPhase(props.phaseId)
    }
  }
})

function valider() {
  errors.value = {}
  if (!form.value.projetId) errors.value.projetId = 'Sélectionne un projet'
  if (!form.value.titre.trim()) errors.value.titre = 'Le titre est requis'
  if (!form.value.description.trim()) errors.value.description = 'La description est requise'
  if (form.value.cibleType === 'Phase' && !form.value.phaseId)
    errors.value.phaseId = 'Sélectionne une phase'
  if (form.value.cibleType === 'Tache' && !form.value.tacheId)
    errors.value.tacheId = 'Sélectionne une tâche'
  return Object.keys(errors.value).length === 0
}

async function soumettre() {
  if (!valider()) return
  loading.value = true
  try {
    const payload = {
      cibleType: form.value.cibleType,
      titre: form.value.titre.trim(),
      description: form.value.description.trim(),
    }
    if (form.value.phaseId) payload.phaseId = Number(form.value.phaseId)
    if (form.value.tacheId) payload.tacheId = Number(form.value.tacheId)

    const result = await signalementService.creer(form.value.projetId, payload)
    showToast('Signalement envoyé.')
    emit('saved', result)
    emit('close')
  } catch (e) {
    errors.value.global = e.response?.data?.erreur ?? 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppModal title="Nouveau signalement" @close="emit('close')">
    <div class="space-y-4">
      <div
        v-if="errors.global"
        class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-sm text-bloque flex items-center gap-2"
      >
        <i class="fa-solid fa-circle-exclamation"></i>
        {{ errors.global }}
      </div>

      <!-- Info -->
      <div
        class="rounded-xl bg-attente/5 border border-attente/20 px-4 py-3 text-xs text-attente flex items-start gap-2"
      >
        <i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
        <span
          >Un signalement sera transmis à l'admin pour traitement. Soyez précis dans votre
          description.</span
        >
      </div>

      <!-- Projet -->
      <AppSelect
        v-model="form.projetId"
        label="Projet concerné"
        :options="optionsProjets"
        placeholder="Sélectionner un projet..."
        :error="errors.projetId"
        required
      />

      <!-- Type de cible -->
      <AppSelect v-model="form.cibleType" label="Cible du signalement" :options="CIBLES" required />

      <!-- Phase si cible Phase ou Tâche -->
      <AppSelect
        v-if="form.cibleType !== 'Projet' && phases.length"
        v-model="form.phaseId"
        label="Phase concernée"
        :options="optionsPhases"
        placeholder="Sélectionner une phase..."
        :error="errors.phaseId"
        required
      />

      <!-- Tâche si cible Tâche -->
      <AppSelect
        v-if="form.cibleType === 'Tache' && form.phaseId && taches.length"
        v-model="form.tacheId"
        label="Tâche concernée"
        :options="optionsTaches"
        placeholder="Sélectionner une tâche..."
        :error="errors.tacheId"
        required
      />

      <!-- Titre -->
      <AppInput
        v-model="form.titre"
        label="Titre du signalement"
        placeholder="ex: Travaux non conformes au plan"
        :error="errors.titre"
        required
      />

      <!-- Description -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-texte">
          Description <span class="text-bloque">*</span>
        </label>
        <textarea
          v-model="form.description"
          placeholder="Décrivez précisément le problème observé..."
          rows="4"
          class="w-full rounded-xl border px-4 py-3 text-sm text-texte outline-none transition placeholder:text-muted/50 resize-none"
          :class="
            errors.description
              ? 'border-bloque/50 bg-bloque/5'
              : 'border-bordure bg-fond focus:border-primary/40 focus:ring-2 focus:ring-primary/10'
          "
        />
        <p v-if="errors.description" class="text-xs text-bloque flex items-center gap-1">
          <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
          {{ errors.description }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          class="rounded-xl border border-bordure px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond"
          @click="emit('close')"
        >
          Annuler
        </button>
        <button
          class="flex items-center gap-2 rounded-xl bg-attente px-4 py-2 text-sm font-bold text-white transition hover:bg-attente/90 disabled:opacity-60"
          :disabled="loading"
          @click="soumettre"
        >
          <i v-if="loading" class="fa-solid fa-spinner fa-spin text-xs"></i>
          <i v-else class="fa-solid fa-triangle-exclamation text-xs"></i>
          Envoyer le signalement
        </button>
      </div>
    </template>
  </AppModal>
</template>
