<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import projetService from '@/services/projetService'
import utilisateurService from '@/services/utilisateurService'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

const props = defineProps({
  projet: { type: Object, default: null }, // null = création, objet = modification
})

const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const chefs = ref([])
const errors = ref({})

const form = ref({
  nom: '',
  adresse: '',
  description: '',
  dateDeDebut: '',
  dateDeFinPrevue: '',
  chefId: '',
  statutProjet: 'Planifier',
})

const isEdit = computed(() => !!props.projet)
const title = computed(() => (isEdit.value ? 'Modifier le projet' : 'Nouveau projet'))

const STATUTS = [
  { value: 'Planifier', label: 'Planifié' },
  { value: 'En cours', label: 'En cours' },
  { value: 'Suspendu', label: 'Suspendu' },
  { value: 'Terminer', label: 'Terminé' },
]

// Pré-remplir en mode édition
watch(
  () => props.projet,
  (p) => {
    if (!p) return
    form.value = {
      nom: p.nom ?? '',
      adresse: p.adresse ?? '',
      description: p.description ?? '',
      dateDeDebut: p.dateDeDebut?.slice(0, 10) ?? '',
      dateDeFinPrevue: p.dateDeFinPrevue?.slice(0, 10) ?? '',
      chefId: p.chefId ?? '',
      statutProjet: p.statutProjet ?? 'Planifier',
    }
  },
  { immediate: true },
)

// Charger les chefs
onMounted(async () => {
  const users = await utilisateurService.lister()
  chefs.value = users
    .filter((u) => ['Chef de chantier', 'Admin'].includes(u.roleGlobal))
    .map((u) => ({ value: u.id, label: `${u.nom} (${u.roleGlobal})` }))
})

// ─── Validation ───────────────────────────────────────────────────────────────

function valider() {
  errors.value = {}
  if (!form.value.nom.trim()) errors.value.nom = 'Le nom est requis'
  if (!form.value.adresse.trim()) errors.value.adresse = "L'adresse est requise"
  if (!form.value.dateDeDebut) errors.value.dateDeDebut = 'La date de début est requise'
  if (!form.value.chefId) errors.value.chefId = 'Le chef de chantier est requis'
  return Object.keys(errors.value).length === 0
}

// ─── Soumission ───────────────────────────────────────────────────────────────

async function soumettre() {
  if (!valider()) return

  loading.value = true
  try {
    const payload = {
      nom: form.value.nom.trim(),
      adresse: form.value.adresse.trim(),
      description: form.value.description.trim() || undefined,
      dateDeDebut: form.value.dateDeDebut,
      dateDeFinPrevue: form.value.dateDeFinPrevue || undefined,
      chefId: Number(form.value.chefId),
      statutProjet: form.value.statutProjet,
    }

    const result = isEdit.value
      ? await projetService.modifier(props.projet.id, payload)
      : await projetService.creer(payload)

    emit('saved', result)
    showToast(isEdit.value ? 'Projet modifié avec succès.' : 'Projet créé avec succès.')
    emit('close')
  } catch (e) {
    errors.value.global = e.response?.data?.erreur ?? 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppModal :title="title" size="lg" @close="emit('close')">
    <div class="space-y-4">
      <!-- Erreur globale -->
      <div
        v-if="errors.global"
        class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-sm text-bloque flex items-center gap-2"
      >
        <i class="fa-solid fa-circle-exclamation"></i>
        {{ errors.global }}
      </div>

      <!-- Nom -->
      <AppInput
        v-model="form.nom"
        label="Nom du projet"
        placeholder="ex: Construction Résidence Yoff"
        :error="errors.nom"
        required
      />

      <!-- Adresse -->
      <AppInput
        v-model="form.adresse"
        label="Adresse / Localisation"
        placeholder="ex: Route de Yoff, Dakar"
        :error="errors.adresse"
        required
      />

      <!-- Description -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-texte">Description</label>
        <textarea
          v-model="form.description"
          placeholder="Décrivez brièvement le projet..."
          rows="3"
          class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 resize-none"
        />
      </div>

      <!-- Dates -->
      <div class="grid grid-cols-2 gap-3">
        <AppInput
          v-model="form.dateDeDebut"
          label="Date de début"
          type="date"
          :error="errors.dateDeDebut"
          required
        />
        <AppInput v-model="form.dateDeFinPrevue" label="Date de fin prévue" type="date" />
      </div>

      <!-- Chef + Statut -->
      <div class="grid grid-cols-2 gap-3">
        <AppSelect
          v-model="form.chefId"
          label="Chef de chantier"
          :options="chefs"
          placeholder="Sélectionner un chef..."
          :error="errors.chefId"
          required
        />
        <AppSelect v-model="form.statutProjet" label="Statut" :options="STATUTS" />
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          class="rounded-xl border border-bordure px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond hover:text-texte"
          @click="emit('close')"
        >
          Annuler
        </button>
        <button
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-primary/90 disabled:opacity-60"
          :disabled="loading"
          @click="soumettre"
        >
          <i v-if="loading" class="fa-solid fa-spinner fa-spin text-xs"></i>
          <i v-else class="fa-solid fa-check text-xs"></i>
          {{ isEdit ? 'Enregistrer' : 'Créer le projet' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
