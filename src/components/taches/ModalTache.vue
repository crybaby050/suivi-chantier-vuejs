<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import tacheService from '@/services/tacheService'
import utilisateurService from '@/services/utilisateurService'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  tache: { type: Object, default: null },
  phaseId: { type: Number, required: true },
})
const emit = defineEmits(['close', 'saved'])
const { showToast } = useToast()

const loading = ref(false)
const errors = ref({})
const ouvriers = ref([])
const loadingOuvriers = ref(false)

const isEdit = computed(() => !!props.tache)

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
  utilisateurIds: [],
  statutTache: 'A faire',
  progression: 0,
})

watch(
  () => props.tache,
  (t) => {
    if (!t) return
    form.value = {
      titre: t.titre ?? '',
      description: t.description ?? '',
      dateDeDebut: t.dateDeDebut?.slice(0, 10) ?? '',
      dateDeFin: t.dateDeFin?.slice(0, 10) ?? '',
      utilisateurId: '',
      statutTache: t.statutTache ?? 'A faire',
      progression: t.progression ?? 0,
    }
  },
  { immediate: true },
)

onMounted(async () => {
  loadingOuvriers.value = true
  try {
    const liste = await utilisateurService.ouvriersDisponibles()
    ouvriers.value = liste.map((u) => ({
      value: u.id,
      label: `${u.nom} — ${u.statutDisponibilite}`,
    }))
  } finally {
    loadingOuvriers.value = false
  }
})

function valider() {
  errors.value = {}
  if (!form.value.titre.trim()) errors.value.titre = 'Le titre est requis'
  if (!isEdit.value && !form.value.utilisateurIds.length)
    errors.value.utilisateurIds = 'Assigner au moins un ouvrier est obligatoire'
  return Object.keys(errors.value).length === 0
}

async function soumettre() {
  if (!valider()) return
  loading.value = true
  try {
    const payload = isEdit.value
      ? {
          titre: form.value.titre.trim(),
          description: form.value.description.trim() || undefined,
          dateDeDebut: form.value.dateDeDebut || undefined,
          dateDeFin: form.value.dateDeFin || undefined,
          statutTache: form.value.statutTache,
          progression: Number(form.value.progression),
        }
      : {
          titre: form.value.titre.trim(),
          description: form.value.description.trim() || undefined,
          dateDeDebut: form.value.dateDeDebut || undefined,
          dateDeFin: form.value.dateDeFin || undefined,
          utilisateurId: Number(form.value.utilisateurId),
        }

    const result = isEdit.value
      ? await tacheService.modifier(props.tache.id, payload)
      : await tacheService.creer(props.phaseId, payload)

    if (!isEdit.value) {
      await Promise.all(
        form.value.utilisateurIds.map((id) =>
          tacheService.affecter(result.id, { utilisateurId: Number(id) }),
        ),
      )
    }

    showToast(isEdit.value ? 'Tâche modifiée.' : 'Tâche créée et assignée.')
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

      <!-- Assignation ouvriers — création uniquement -->
      <div v-if="!isEdit">
        <label class="text-xs font-bold text-texte mb-2 block">
          Assigner à des ouvriers <span class="text-bloque">*</span>
        </label>

        <div v-if="loadingOuvriers" class="text-xs text-muted">
          <i class="fa-solid fa-spinner fa-spin mr-1"></i> Chargement...
        </div>

        <div
          v-else-if="!ouvriers.length"
          class="rounded-xl bg-attente/10 px-4 py-3 text-xs text-attente flex items-center gap-2"
        >
          <i class="fa-solid fa-triangle-exclamation"></i>
          Aucun ouvrier disponible pour le moment.
        </div>

        <div
          v-else
          class="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-bordure bg-fond p-3"
        >
          <label
            v-for="ouvrier in ouvriers"
            :key="ouvrier.value"
            class="flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-white transition"
          >
            <input
              type="checkbox"
              :value="ouvrier.value"
              v-model="form.utilisateurIds"
              class="accent-primary w-4 h-4 flex-shrink-0"
            />
            <span class="text-sm text-texte font-medium">{{ ouvrier.label }}</span>
          </label>
        </div>

        <p v-if="errors.utilisateurIds" class="mt-1 text-xs text-bloque flex items-center gap-1">
          <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
          {{ errors.utilisateurIds }}
        </p>

        <div class="mt-2 rounded-xl bg-fond px-4 py-3 text-xs text-muted flex items-center gap-2">
          <i class="fa-solid fa-info-circle text-primary"></i>
          {{ form.utilisateurIds.length }} ouvrier(s) sélectionné(s) · Statut initial :
          <strong class="text-texte ml-1">À faire</strong>
        </div>
      </div>

      <!-- Statut + progression — édition uniquement -->
      <template v-if="isEdit">
        <AppSelect v-model="form.statutTache" label="Statut" :options="STATUTS_EDIT" />
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
            class="w-full accent-primary mt-1"
          />
        </div>
      </template>
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
          {{ isEdit ? 'Enregistrer' : 'Créer et assigner' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
