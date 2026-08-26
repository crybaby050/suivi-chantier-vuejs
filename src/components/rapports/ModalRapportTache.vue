<script setup>
import { ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import rapportService from '@/services/rapportService'
import affectationService from '@/services/affectationService'
import tacheService from '@/services/tacheService'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  affectation: { type: Object, required: true },
  projetId: { type: Number, required: true },
})
const emit = defineEmits(['close', 'termine'])
const { showToast } = useToast()

const loading = ref(false)
const contenu = ref('')
const photos = ref([]) // File[]
const previews = ref([]) // URLs de prévisualisation
const errors = ref({})

// ─── Gestion photos ───────────────────────────────────────────────────────────

function onPhotosChange(e) {
  const fichiers = Array.from(e.target.files)
  fichiers.forEach((f) => {
    photos.value.push(f)
    previews.value.push(URL.createObjectURL(f))
  })
  e.target.value = '' // reset input pour permettre re-sélection
}

function retirerPhoto(idx) {
  URL.revokeObjectURL(previews.value[idx])
  photos.value.splice(idx, 1)
  previews.value.splice(idx, 1)
}

// ─── Validation ───────────────────────────────────────────────────────────────

function valider() {
  errors.value = {}
  if (!contenu.value.trim()) errors.value.contenu = 'Le contenu du rapport est requis'
  if (!photos.value.length) errors.value.photos = 'Au moins une photo est obligatoire'
  return Object.keys(errors.value).length === 0
}

// ─── Soumission ───────────────────────────────────────────────────────────────

async function soumettre() {
  if (!valider()) return
  loading.value = true
  try {
    // 1. Créer le rapport en brouillon
    const rapport = await rapportService.creer(props.projetId, {
      date: new Date().toISOString().slice(0, 10),
      contenu: contenu.value.trim(),
      statutRapport: 'Publié',
    })

    // 2. Uploader les photos
    await rapportService.ajouterPhotos(rapport.id, photos.value)

    // 3. Passer l'affectation en "Valider"
    await affectationService.modifier(props.affectation.id, {
      statutPersonnel: 'Valider',
    })

    // 4. Passer la tâche en attente de validation
    await tacheService.modifier(props.affectation.tacheId, {
      statutTache: 'Valider',
    })

    showToast('Rapport soumis. Tâche en attente de validation.')
    emit('termine')
    emit('close')
  } catch (e) {
    errors.value.global = e.response?.data?.erreur ?? 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppModal title="Rapport de tâche" size="lg" @close="emit('close')">
    <div class="space-y-5">
      <!-- Erreur globale -->
      <div
        v-if="errors.global"
        class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-sm text-bloque flex items-center gap-2"
      >
        <i class="fa-solid fa-circle-exclamation"></i>
        {{ errors.global }}
      </div>

      <!-- Info -->
      <div
        class="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-xs text-primary flex items-start gap-2"
      >
        <i class="fa-solid fa-info-circle mt-0.5"></i>
        <span>
          Ce rapport sera associé à la tâche <strong>{{ affectation.tache?.titre }}</strong
          >. Des photos sont obligatoires pour valider la soumission.
        </span>
      </div>

      <!-- Contenu -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-texte">
          Contenu du rapport <span class="text-bloque">*</span>
        </label>
        <textarea
          v-model="contenu"
          placeholder="Décrivez le travail effectué, les matériaux utilisés, les observations..."
          rows="5"
          class="w-full rounded-xl border px-4 py-3 text-sm text-texte outline-none transition placeholder:text-muted/50 resize-none"
          :class="
            errors.contenu
              ? 'border-bloque/50 bg-bloque/5'
              : 'border-bordure bg-fond focus:border-primary/40 focus:ring-2 focus:ring-primary/10'
          "
        />
        <p v-if="errors.contenu" class="text-xs text-bloque flex items-center gap-1">
          <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
          {{ errors.contenu }}
        </p>
      </div>

      <!-- Upload photos -->
      <div class="flex flex-col gap-2">
        <label class="text-xs font-bold text-texte">
          Photos <span class="text-bloque">*</span>
          <span class="ml-1 text-muted font-normal">({{ photos.length }} sélectionnée(s))</span>
        </label>

        <!-- Zone de dépôt -->
        <label
          class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition p-6"
          :class="
            errors.photos
              ? 'border-bloque/50 bg-bloque/5'
              : 'border-bordure bg-fond hover:border-primary/40 hover:bg-primary/5'
          "
        >
          <i class="fa-solid fa-cloud-arrow-up text-2xl text-muted"></i>
          <span class="text-xs text-muted text-center">
            Clique pour ajouter des photos<br />
            <span class="text-[11px]">JPG, PNG, WEBP</span>
          </span>
          <input type="file" accept="image/*" multiple class="hidden" @change="onPhotosChange" />
        </label>

        <p v-if="errors.photos" class="text-xs text-bloque flex items-center gap-1">
          <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
          {{ errors.photos }}
        </p>

        <!-- Prévisualisations -->
        <div v-if="previews.length" class="grid grid-cols-3 gap-2">
          <div
            v-for="(url, idx) in previews"
            :key="idx"
            class="relative group rounded-xl overflow-hidden aspect-square"
          >
            <img :src="url" class="w-full h-full object-cover" />
            <button
              type="button"
              class="absolute inset-0 flex items-center justify-center bg-texte/50 opacity-0 group-hover:opacity-100 transition"
              @click="retirerPhoto(idx)"
            >
              <i class="fa-solid fa-trash text-white text-sm"></i>
            </button>
          </div>
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
          class="flex items-center gap-2 rounded-xl bg-succes px-4 py-2 text-sm font-bold text-white transition hover:bg-succes/90 disabled:opacity-60"
          :disabled="loading"
          @click="soumettre"
        >
          <i v-if="loading" class="fa-solid fa-spinner fa-spin text-xs"></i>
          <i v-else class="fa-solid fa-paper-plane text-xs"></i>
          Soumettre pour validation
        </button>
      </div>
    </template>
  </AppModal>
</template>
