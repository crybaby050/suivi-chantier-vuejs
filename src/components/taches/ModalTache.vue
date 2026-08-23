<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import tacheService from '@/services/tacheService'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  tache: { type: Object, default: null },
  phaseId: { type: Number, required: true },
})
const emit = defineEmits(['close', 'saved'])
const { showToast } = useToast()

const loading = ref(false)
const errors = ref({})

const form = ref({
  titre: '',
  description: '',
  dateDeDebut: '',
  dateDeFin: '',
  progression: 0,
  statutTache: 'A faire',
})

const isEdit = computed(() => !!props.tache)

const STATUTS = [
  { value: 'A faire', label: 'À faire' },
  { value: 'En cours', label: 'En cours' },
  { value: 'Terminer', label: 'Terminé' },
  { value: 'Valider', label: 'À valider' },
  { value: 'Renvoyer', label: 'Renvoyé' },
]

watch(
  () => props.tache,
  (t) => {
    if (!t) return
    form.value = {
      titre: t.titre ?? '',
      description: t.description ?? '',
      dateDeDebut: t.dateDeDebut?.slice(0, 10) ?? '',
      dateDeFin: t.dateDeFin?.slice(0, 10) ?? '',
      progression: t.progression ?? 0,
      statutTache: t.statutTache ?? 'A faire',
    }
  },
  { immediate: true },
)

function valider() {
  errors.value = {}
  if (!form.value.titre.trim()) errors.value.titre = 'Le titre est requis'
  return Object.keys(errors.value).length === 0
}

async function soumettre() {
  if (!valider()) return
  loading.value = true
  try {
    const payload = {
      titre: form.value.titre.trim(),
      description: form.value.description.trim() || undefined,
      dateDeDebut: form.value.dateDeDebut || undefined,
      dateDeFin: form.value.dateDeFin || undefined,
      progression: Number(form.value.progression),
      statutTache: form.value.statutTache,
    }
    const result = isEdit.value
      ? await tacheService.modifier(props.tache.id, payload)
      : await tacheService.creer(props.phaseId, payload)

    showToast(isEdit.value ? 'Tâche modifiée.' : 'Tâche créée.')
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
  <AppModal :title="isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'" @close="emit('close')">
    <div class="space-y-4">
      <div
        v-if="errors.global"
        class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-sm text-bloque"
      >
        {{ errors.global }}
      </div>

      <AppInput
        v-model="form.titre"
        label="Titre"
        placeholder="ex: Coulage des fondations"
        :error="errors.titre"
        required
      />

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-texte">Description</label>
        <textarea
          v-model="form.description"
          placeholder="Détails de la tâche..."
          rows="3"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 resize-none"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <AppInput v-model="form.dateDeDebut" label="Date de début" type="date" />
        <AppInput v-model="form.dateDeFin" label="Date de fin" type="date" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <AppSelect v-model="form.statutTache" label="Statut" :options="STATUTS" />
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-texte">
            Progression <span class="text-primary font-black">{{ form.progression }}%</span>
          </label>
          <input
            v-model="form.progression"
            type="range"
            min="0"
            max="100"
            step="5"
            class="w-full accent-primary mt-2"
          />
        </div>
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
          {{ isEdit ? 'Enregistrer' : 'Créer la tâche' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
