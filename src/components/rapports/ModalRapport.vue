<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import rapportService from '@/services/rapportService'
import phaseService from '@/services/phaseService'
import tacheService from '@/services/tacheService'
import utilisateurService from '@/services/utilisateurService'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'

const props = defineProps({
  rapport: { type: Object, default: null }, // null = création
  projets: { type: Array, default: () => [] },
  // Pré-sélection depuis une page détail
  projetId: { type: Number, default: null },
  phaseId: { type: Number, default: null },
  tacheId: { type: Number, default: null },
})
const emit = defineEmits(['close', 'saved'])
const { showToast } = useToast()
const auth = useAuthStore()
const { isAdmin } = useRole()

const loading = ref(false)
const errors = ref({})
const phases = ref([])
const taches = ref([])
const photos = ref([])
const previews = ref([])
const auteur = ref(null)
const modeEdit = ref(false)

const isLecture = computed(() => !!props.rapport && !modeEdit.value)
const isEdit = computed(() => !!props.rapport)
const estAuteur = computed(() => props.rapport?.auteurId === auth.user?.id)

const form = ref({
  projetId: props.projetId ?? '',
  phaseId: props.phaseId ?? '',
  tacheId: props.tacheId ?? '',
  contenu: '',
  statutRapport: 'Publié',
})

const optionsProjets = computed(() => props.projets.map((p) => ({ value: p.id, label: p.nom })))
const optionsPhases = computed(() => phases.value.map((p) => ({ value: p.id, label: p.libelle })))
const optionsTaches = computed(() => taches.value.map((t) => ({ value: t.id, label: t.titre })))

// ─── Init ─────────────────────────────────────────────────────────────────────

watch(
  () => props.rapport,
  async (r) => {
    if (!r) return
    form.value = {
      projetId: r.projetId ?? '',
      phaseId: '',
      tacheId: '',
      contenu: r.contenu ?? '',
      statutRapport: r.statutRapport ?? 'Publié',
    }
    // Charge l'auteur
    try {
      auteur.value = await utilisateurService.detail(r.auteurId)
    } catch (_) {}
  },
  { immediate: true },
)

// Pré-charge les phases si projetId fourni
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
  { immediate: true },
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
  { immediate: true },
)

// ─── Photos ───────────────────────────────────────────────────────────────────

function onPhotosChange(e) {
  Array.from(e.target.files).forEach((f) => {
    photos.value.push(f)
    previews.value.push(URL.createObjectURL(f))
  })
  e.target.value = ''
}

function retirerPhoto(idx) {
  URL.revokeObjectURL(previews.value[idx])
  photos.value.splice(idx, 1)
  previews.value.splice(idx, 1)
}

// ─── Validation ───────────────────────────────────────────────────────────────

function valider() {
  errors.value = {}
  if (!form.value.projetId) errors.value.projetId = 'Sélectionne un projet'
  if (!form.value.contenu.trim()) errors.value.contenu = 'Le contenu est requis'
  return Object.keys(errors.value).length === 0
}

// ─── Soumission ───────────────────────────────────────────────────────────────

async function soumettre() {
  if (!valider()) return
  loading.value = true
  try {
    let rapport

    if (isEdit.value) {
      // Modification — auteur seulement
      rapport = await rapportService.modifier(props.rapport.id, {
        contenu: form.value.contenu.trim(),
        statutRapport: form.value.statutRapport,
      })
      if (photos.value.length) {
        await rapportService.ajouterPhotos(rapport.id, photos.value)
      }
    } else {
      // Création
      rapport = await rapportService.creer(form.value.projetId, {
        date: new Date().toISOString().slice(0, 10),
        contenu: form.value.contenu.trim(),
        statutRapport: form.value.statutRapport,
      })
      if (photos.value.length) {
        await rapportService.ajouterPhotos(rapport.id, photos.value)
      }
    }

    showToast(isEdit.value ? 'Rapport modifié.' : 'Rapport créé.')
    emit('saved', rapport)
    emit('close')
  } catch (e) {
    errors.value.global = e.response?.data?.erreur ?? 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppModal
    :title="isLecture ? 'Rapport' : isEdit ? 'Modifier le rapport' : 'Nouveau rapport'"
    size="lg"
    @close="emit('close')"
  >
    <!-- ── MODE LECTURE ── -->
    <div v-if="isLecture" class="space-y-5">
      <!-- Auteur + date + statut -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary flex-shrink-0"
          >
            {{ auteur?.nom?.charAt(0).toUpperCase() ?? '?' }}
          </div>
          <div>
            <p class="text-sm font-black text-texte">
              {{ auteur?.nom ?? `Auteur #${rapport.auteurId}` }}
            </p>
            <p class="text-xs text-muted">{{ auteur?.email }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-bold"
            :class="
              rapport.statutRapport === 'Publié'
                ? 'bg-succes/10 text-succes'
                : 'bg-attente/10 text-attente'
            "
          >
            {{ rapport.statutRapport }}
          </span>
          <span class="text-xs text-muted">
            {{
              new Date(rapport.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            }}
          </span>
        </div>
      </div>

      <!-- Contenu -->
      <div class="rounded-xl bg-fond p-4">
        <p class="text-sm text-texte leading-relaxed whitespace-pre-wrap">{{ rapport.contenu }}</p>
      </div>

      <!-- Photos -->
      <div v-if="rapport.photos?.length">
        <p class="text-xs font-bold text-muted mb-3">
          Photos <span class="ml-1 font-normal">({{ rapport.photos.length }})</span>
        </p>
        <div class="grid grid-cols-3 gap-2">
          <a v-for="(url, idx) in rapport.photos" :key="idx" :href="url" target="_blank">
            <img
              :src="url"
              class="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition cursor-pointer"
            />
          </a>
        </div>
      </div>
    </div>

    <!-- ── MODE CRÉATION / MODIFICATION ── -->
    <div v-else class="space-y-4">
      <div
        v-if="errors.global"
        class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-sm text-bloque flex items-center gap-2"
      >
        <i class="fa-solid fa-circle-exclamation"></i>
        {{ errors.global }}
      </div>

      <!-- Projet — désactivé en modification -->
      <div v-if="!isEdit">
        <AppSelect
          v-model="form.projetId"
          label="Projet"
          :options="optionsProjets"
          placeholder="Sélectionner un projet..."
          :error="errors.projetId"
          required
        />
      </div>
      <div v-else class="rounded-xl bg-fond px-4 py-3 text-xs text-muted flex items-center gap-2">
        <i class="fa-solid fa-building text-primary"></i>
        Rapport lié au projet — non modifiable
      </div>

      <!-- Phase (optionnel) — création uniquement -->
      <AppSelect
        v-if="!isEdit && phases.length"
        v-model="form.phaseId"
        label="Phase concernée (optionnel)"
        :options="optionsPhases"
        placeholder="Aucune phase spécifique"
      />

      <!-- Tâche (optionnel) — création uniquement -->
      <AppSelect
        v-if="!isEdit && form.phaseId && taches.length"
        v-model="form.tacheId"
        label="Tâche concernée (optionnel)"
        :options="optionsTaches"
        placeholder="Aucune tâche spécifique"
      />

      <!-- Statut -->
      <AppSelect
        v-model="form.statutRapport"
        label="Statut"
        :options="[
          { value: 'Brouillon', label: 'Brouillon — visible uniquement par moi' },
          { value: 'Publié', label: 'Publié — visible par tous les membres' },
        ]"
      />

      <!-- Contenu -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-texte">
          Contenu <span class="text-bloque">*</span>
        </label>
        <textarea
          v-model="form.contenu"
          placeholder="Décrivez l'avancement, les observations, les problèmes rencontrés..."
          rows="6"
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
          Photos
          <span class="ml-1 text-muted font-normal">({{ photos.length }} sélectionnée(s))</span>
        </label>
        <label
          class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-bordure bg-fond cursor-pointer transition p-5 hover:border-primary/40 hover:bg-primary/5"
        >
          <i class="fa-solid fa-cloud-arrow-up text-xl text-muted"></i>
          <span class="text-xs text-muted text-center"
            >Clique pour ajouter des photos<br /><span class="text-[11px]"
              >JPG, PNG, WEBP</span
            ></span
          >
          <input type="file" accept="image/*" multiple class="hidden" @change="onPhotosChange" />
        </label>
        <div v-if="previews.length" class="grid grid-cols-4 gap-2">
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
          {{ isLecture ? 'Fermer' : 'Annuler' }}
        </button>

        <!-- Bouton modifier — auteur en lecture -->
        <button
          v-if="isLecture && estAuteur"
          class="flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
          @click="modeEdit = true"
        >
          <i class="fa-solid fa-pen text-xs"></i>
          Modifier
        </button>

        <!-- Bouton soumettre — création ou modification -->
        <button
          v-if="!isLecture"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60"
          :disabled="loading"
          @click="soumettre"
        >
          <i v-if="loading" class="fa-solid fa-spinner fa-spin text-xs"></i>
          <i v-else class="fa-solid fa-paper-plane text-xs"></i>
          {{ isEdit ? 'Enregistrer' : 'Publier' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
