<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import phaseService from '@/services/phaseService'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  phase: { type: Object, default: null },
  projetId: { type: Number, required: true },
  nombrePhases: { type: Number, default: 0 }, // pour l'ordre auto
})
const emit = defineEmits(['close', 'saved'])
const { showToast } = useToast()

const loading = ref(false)
const errors = ref({})

const isEdit = computed(() => !!props.phase)

const STATUTS = [
  { value: 'En attente', label: 'En attente' },
  { value: 'En cours', label: 'En cours' },
  { value: 'Terminer', label: 'Terminé' },
]

const form = ref({
  libelle: '',
  dateDeDebut: '',
  dateDeFinPrevue: '',
  statutPhase: 'En attente',
})

watch(
  () => props.phase,
  (p) => {
    if (!p) return
    form.value = {
      libelle: p.libelle ?? '',
      dateDeDebut: p.dateDeDebut?.slice(0, 10) ?? '',
      dateDeFinPrevue: p.dateDeFinPrevue?.slice(0, 10) ?? '',
      statutPhase: p.statutPhase ?? 'En attente',
    }
  },
  { immediate: true },
)

function valider() {
  errors.value = {}
  if (!form.value.libelle.trim()) errors.value.libelle = 'Le libellé est requis'
  return Object.keys(errors.value).length === 0
}

async function soumettre() {
  if (!valider()) return
  loading.value = true
  try {
    const payload = {
      libelle: form.value.libelle.trim(),
      ordre: isEdit.value ? props.phase.ordre : props.nombrePhases + 1,
      dateDeDebut: form.value.dateDeDebut || undefined,
      dateDeFinPrevue: form.value.dateDeFinPrevue || undefined,
      statutPhase: isEdit.value ? form.value.statutPhase : 'En attente',
    }
    const result = isEdit.value
      ? await phaseService.modifier(props.phase.id, payload)
      : await phaseService.creer(props.projetId, payload)

    showToast(isEdit.value ? 'Phase modifiée.' : 'Phase créée.')
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
  <AppModal :title="isEdit ? 'Modifier la phase' : 'Nouvelle phase'" @close="emit('close')">
    <div class="space-y-4">
      <div
        v-if="errors.global"
        class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-sm text-bloque"
      >
        {{ errors.global }}
      </div>

      <AppInput
        v-model="form.libelle"
        label="Libellé"
        placeholder="ex: Fondations"
        :error="errors.libelle"
        required
      />

      <!-- Statut visible uniquement en mode édition -->
      <AppSelect v-if="isEdit" v-model="form.statutPhase" label="Statut" :options="STATUTS" />

      <!-- Info ordre en création -->
      <div
        v-if="!isEdit"
        class="rounded-xl bg-fond px-4 py-3 text-xs text-muted flex items-center gap-2"
      >
        <i class="fa-solid fa-info-circle text-primary"></i>
        Cette phase sera ajoutée en position
        <strong class="text-texte">{{ nombrePhases + 1 }}</strong> avec le statut
        <strong class="text-texte">En attente</strong>.
      </div>

      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="form.dateDeDebut" label="Date de début" type="date" />
        <AppInput v-model="form.dateDeFinPrevue" label="Date de fin prévue" type="date" />
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
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60"
          :disabled="loading"
          @click="soumettre"
        >
          <i v-if="loading" class="fa-solid fa-spinner fa-spin text-xs"></i>
          <i v-else class="fa-solid fa-check text-xs"></i>
          {{ isEdit ? 'Enregistrer' : 'Créer la phase' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
