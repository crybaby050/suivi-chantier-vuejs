<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import utilisateurService from '@/services/utilisateurService'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  utilisateur: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const { showToast } = useToast()

const loading = ref(false)
const errors = ref({})

const isEdit = computed(() => !!props.utilisateur)

const ROLES = [
  { value: 'Chef de chantier', label: 'Chef de chantier' },
  { value: 'Ouvrier', label: 'Ouvrier' },
  { value: 'Client', label: 'Client' },
]

const form = ref({
  nom: '',
  email: '',
  motDePasse: '',
  roleGlobal: 'Ouvrier',
})

watch(
  () => props.utilisateur,
  (u) => {
    if (!u) return
    form.value = {
      nom: u.nom ?? '',
      email: u.email ?? '',
      motDePasse: '', // jamais pré-rempli
      roleGlobal: u.roleGlobal ?? 'Ouvrier',
    }
  },
  { immediate: true },
)

function valider() {
  errors.value = {}
  if (!form.value.nom.trim()) errors.value.nom = 'Le nom est requis'
  if (!isEdit.value) {
    if (!form.value.email.trim()) errors.value.email = 'L\'email est requis'
    if (!form.value.motDePasse)   errors.value.motDePasse = 'Le mot de passe est requis'
  }
  if (form.value.motDePasse && form.value.motDePasse.length < 6)
    errors.value.motDePasse = 'Minimum 6 caractères'
  return Object.keys(errors.value).length === 0
}

async function soumettre() {
  if (!valider()) return
  loading.value = true
  try {
    let result

    if (isEdit.value) {
      // Seul le nom est modifiable via PATCH /utilisateurs/:id
      result = await utilisateurService.modifier(props.utilisateur.id, {
        nom: form.value.nom.trim(),
      })

      // Changement de rôle via route séparée si modifié et si pas client
      if (
        form.value.roleGlobal !== props.utilisateur.roleGlobal &&
        props.utilisateur.roleGlobal !== 'Client'
      ) {
        result = await utilisateurService.changerRole(props.utilisateur.id, form.value.roleGlobal)
      }
    } else {
      // Création via /auth/register
      result = await utilisateurService.inscrire({
        nom: form.value.nom.trim(),
        email: form.value.email.trim().toLowerCase(),
        motDePasse: form.value.motDePasse,
        roleGlobal: form.value.roleGlobal,
      })
    }

    showToast(isEdit.value ? 'Utilisateur modifié.' : 'Utilisateur créé.')
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
  <AppModal
    :title="isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div
        v-if="errors.global"
        class="rounded-xl bg-bloque/10 border border-bloque/20 px-4 py-3 text-sm text-bloque flex items-center gap-2"
      >
        <i class="fa-solid fa-circle-exclamation"></i>
        {{ errors.global }}
      </div>

      <AppInput
        v-model="form.nom"
        label="Nom complet"
        placeholder="ex: Moussa Diallo"
        :error="errors.nom"
        required
      />

      <!-- Email — création uniquement -->
      <AppInput
        v-if="!isEdit"
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="ex: moussa@gmail.com"
        :error="errors.email"
        required
      />

      <!-- Info email en édition -->
      <div
        v-if="isEdit"
        class="rounded-xl bg-fond px-4 py-3 text-xs text-muted flex items-center gap-2"
      >
        <i class="fa-solid fa-envelope text-primary"></i>
        Email : <strong class="text-texte ml-1">{{ utilisateur.email }}</strong>
        (non modifiable par l'admin)
      </div>

      <!-- Rôle — masqué si client existant -->
      <AppSelect
        v-if="!isEdit || utilisateur?.roleGlobal !== 'Client'"
        v-model="form.roleGlobal"
        label="Rôle"
        :options="ROLES"
        :placeholder="
          isEdit && utilisateur?.roleGlobal === 'Client'
            ? 'Client (non modifiable)'
            : 'Sélectionner...'
        "
        required
      />

      <!-- Info rôle client non modifiable -->
      <div
        v-if="isEdit && utilisateur?.roleGlobal === 'Client'"
        class="rounded-xl bg-fond px-4 py-3 text-xs text-muted flex items-center gap-2"
      >
        <i class="fa-solid fa-lock text-primary"></i>
        Le rôle Client ne peut pas être modifié.
      </div>

      <!-- Mot de passe — création uniquement -->
      <AppInput
        v-if="!isEdit"
        v-model="form.motDePasse"
        label="Mot de passe"
        type="password"
        placeholder="Minimum 6 caractères"
        :error="errors.motDePasse"
        required
      />

      <!-- Info si modification -->
      <div
        v-if="isEdit"
        class="rounded-xl bg-fond px-4 py-3 text-xs text-muted flex items-center gap-2"
      >
        <i class="fa-solid fa-lock text-primary"></i>
        Le mot de passe ne peut pas être modifié par l'admin. L'utilisateur peut changer le sien
        depuis son profil.
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
          {{ isEdit ? 'Enregistrer' : 'Créer le compte' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
