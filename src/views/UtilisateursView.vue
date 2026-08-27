<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import utilisateurService from '@/services/utilisateurService'
import ModalUtilisateur from '@/components/utilisateurs/ModalUtilisateur.vue'

const auth = useAuthStore()
const { showToast } = useToast()

const utilisateurs = ref([])
const loading = ref(true)
const recherche = ref('')
const filtreRole = ref('tous')
const showModal = ref(false)
const utilisateurEdite = ref(null)
const confirmDesactiver = ref(null)

const ROLES = ['tous', 'Admin', 'Chef de chantier', 'Ouvrier', 'Client']

const ROLE_CONFIG = {
  Admin: { badge: 'bg-role-admin/10 text-role-admin', label: 'Admin' },
  'Chef de chantier': { badge: 'bg-role-chef/10 text-role-chef', label: 'Chef' },
  Ouvrier: { badge: 'bg-role-ouvrier/10 text-role-ouvrier', label: 'Ouvrier' },
  Client: { badge: 'bg-role-client/10 text-role-client', label: 'Client' },
}

const STATUT_CONFIG = {
  Actif: { badge: 'bg-succes/10 text-succes', dot: 'bg-succes' },
  Inactif: { badge: 'bg-inactif/10 text-inactif', dot: 'bg-inactif' },
  Bloqué: { badge: 'bg-bloque/10 text-bloque', dot: 'bg-bloque' },
}

// ─── Filtrés ──────────────────────────────────────────────────────────────────

const utilisateursFiltres = computed(() =>
  utilisateurs.value
    .filter((u) => filtreRole.value === 'tous' || u.roleGlobal === filtreRole.value)
    .filter(
      (u) =>
        !recherche.value ||
        u.nom.toLowerCase().includes(recherche.value.toLowerCase()) ||
        u.email.toLowerCase().includes(recherche.value.toLowerCase()),
    ),
)

// ─── Chargement ───────────────────────────────────────────────────────────────

async function charger() {
  loading.value = true
  try {
    utilisateurs.value = await utilisateurService.lister()
  } finally {
    loading.value = false
  }
}

onMounted(charger)

// ─── Actions ──────────────────────────────────────────────────────────────────

function ouvrirCreation() {
  utilisateurEdite.value = null
  showModal.value = true
}

function ouvrirEdition(u) {
  // Admin ne peut pas modifier un autre admin ni son propre profil ici
  if (u.roleGlobal === 'Admin' || u.id === auth.user?.id) return
  utilisateurEdite.value = u
  showModal.value = true
}

function peutModifier(u) {
  return u.roleGlobal !== 'Admin' && u.id !== auth.user?.id
}

function onSaved(u) {
  const idx = utilisateurs.value.findIndex((x) => x.id === u.id)
  if (idx !== -1) utilisateurs.value[idx] = u
  else utilisateurs.value.unshift(u)
}

async function toggleStatut(u) {
  try {
    const nouveau = u.statutUtilisateur === 'Actif' ? 'Inactif' : 'Actif'
    const updated = await utilisateurService.modifier(u.id, { statutUtilisateur: nouveau })
    const idx = utilisateurs.value.findIndex((x) => x.id === u.id)
    if (idx !== -1) utilisateurs.value[idx] = updated
    showToast(`Utilisateur ${nouveau === 'Actif' ? 'activé' : 'désactivé'}.`)
  } catch (e) {
    showToast('Erreur.', 'error')
  } finally {
    confirmDesactiver.value = null
  }
}

function initiales(nom) {
  return nom
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <AppLayout title="Utilisateurs">
    <!-- En-tête -->
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-texte">Utilisateurs</h1>
        <p class="mt-1 text-sm text-muted">{{ utilisateurs.length }} compte(s) au total</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary/90"
        @click="ouvrirCreation"
      >
        <i class="fa-solid fa-plus text-xs"></i>
        Nouvel utilisateur
      </button>
    </div>

    <!-- Filtres + recherche -->
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="role in ROLES"
          :key="role"
          class="rounded-xl px-3 py-1.5 text-xs font-bold transition"
          :class="
            filtreRole === role
              ? 'bg-primary text-white'
              : 'bg-carte border border-bordure text-muted hover:bg-fond hover:text-primary'
          "
          @click="filtreRole = role"
        >
          {{ role === 'tous' ? 'Tous' : (ROLE_CONFIG[role]?.label ?? role) }}
          <span class="ml-1 opacity-60">
            {{
              role === 'tous'
                ? utilisateurs.length
                : utilisateurs.filter((u) => u.roleGlobal === role).length
            }}
          </span>
        </button>
      </div>

      <div class="relative">
        <i
          class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted"
        ></i>
        <input
          v-model="recherche"
          type="text"
          placeholder="Rechercher..."
          class="w-full sm:w-52 rounded-xl border border-bordure bg-carte py-2 pl-8 pr-4 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="flex justify-center py-20">
      <i class="fa-solid fa-spinner fa-spin text-primary text-2xl"></i>
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-2xl border border-bordure bg-carte shadow-card">
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse">
          <thead class="bg-fond">
            <tr>
              <th
                class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
              >
                Utilisateur
              </th>
              <th
                class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
              >
                Rôle
              </th>
              <th
                class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
              >
                Statut
              </th>
              <th
                class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
              >
                Disponibilité
              </th>
              <th
                class="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted"
              >
                Membre depuis
              </th>
              <th class="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in utilisateursFiltres"
              :key="u.id"
              class="border-t border-bordure transition hover:bg-fond/50"
            >
              <!-- Utilisateur -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full overflow-hidden"
                    :class="u.photoUrl ? '' : 'bg-primary/10'"
                  >
                    <img v-if="u.photoUrl" :src="u.photoUrl" class="h-full w-full object-cover" />
                    <span v-else class="text-xs font-black text-primary">{{
                      initiales(u.nom)
                    }}</span>
                  </div>
                  <div>
                    <p class="font-bold text-texte flex items-center gap-1.5">
                      {{ u.nom }}
                      <span
                        v-if="u.id === auth.user?.id"
                        class="text-[10px] font-bold text-muted bg-fond rounded-full px-1.5 py-0.5"
                        >Moi</span
                      >
                    </p>
                    <p class="text-xs text-muted">{{ u.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Rôle -->
              <td class="px-5 py-4">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  :class="ROLE_CONFIG[u.roleGlobal]?.badge ?? 'bg-muted/10 text-muted'"
                >
                  {{ ROLE_CONFIG[u.roleGlobal]?.label ?? u.roleGlobal }}
                </span>
              </td>

              <!-- Statut -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-1.5">
                  <div
                    class="h-2 w-2 rounded-full"
                    :class="STATUT_CONFIG[u.statutUtilisateur]?.dot ?? 'bg-muted'"
                  ></div>
                  <span class="text-sm text-texte">{{ u.statutUtilisateur }}</span>
                </div>
              </td>

              <!-- Disponibilité -->
              <td class="px-5 py-4">
                <span class="text-sm text-muted">
                  {{ u.roleGlobal === 'Ouvrier' ? u.statutDisponibilite : '—' }}
                </span>
              </td>

              <!-- Date -->
              <td class="px-5 py-4 text-sm text-muted">
                {{ new Date(u.dateDeCreation).toLocaleDateString('fr-FR') }}
              </td>

              <!-- Actions -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-2 justify-end">
                  <!-- Modifier -->
                  <button
                    v-if="peutModifier(u)"
                    class="rounded-lg border border-bordure px-2.5 py-1.5 text-xs font-bold text-muted transition hover:bg-fond hover:text-primary"
                    @click="ouvrirEdition(u)"
                  >
                    <i class="fa-solid fa-pen text-[10px]"></i>
                  </button>

                  <!-- Activer / Désactiver -->
                  <button
                    v-if="peutModifier(u)"
                    class="rounded-lg border px-2.5 py-1.5 text-xs font-bold transition"
                    :class="
                      u.statutUtilisateur === 'Actif'
                        ? 'border-bloque/30 text-bloque hover:bg-bloque/10'
                        : 'border-succes/30 text-succes hover:bg-succes/10'
                    "
                    @click="confirmDesactiver = u"
                  >
                    <i
                      :class="`fa-solid ${u.statutUtilisateur === 'Actif' ? 'fa-ban' : 'fa-check'} text-[10px]`"
                    ></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Vide -->
      <div v-if="!utilisateursFiltres.length" class="py-16 text-center">
        <i class="fa-solid fa-users text-2xl text-muted/30 mb-3"></i>
        <p class="text-sm font-bold text-muted">Aucun utilisateur trouvé</p>
      </div>
    </div>

    <!-- Modal utilisateur -->
    <ModalUtilisateur
      v-if="showModal"
      :utilisateur="utilisateurEdite"
      @close="showModal = false"
      @saved="onSaved"
    />

    <!-- Confirmation activation/désactivation -->
    <Teleport to="body">
      <div
        v-if="confirmDesactiver"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="confirmDesactiver = null"
      >
        <div
          class="absolute inset-0 bg-texte/40 backdrop-blur-sm"
          @click="confirmDesactiver = null"
        />
        <div
          class="relative z-10 w-full max-w-sm rounded-2xl bg-carte border border-bordure shadow-2xl p-6"
        >
          <h3 class="text-base font-black text-texte mb-1">
            {{ confirmDesactiver.statutUtilisateur === 'Actif' ? 'Désactiver' : 'Activer' }} le
            compte
          </h3>
          <p class="text-sm text-muted mb-5">
            {{
              confirmDesactiver.statutUtilisateur === 'Actif'
                ? `${confirmDesactiver.nom} ne pourra plus se connecter.`
                : `${confirmDesactiver.nom} pourra à nouveau se connecter.`
            }}
          </p>
          <div class="flex gap-3 justify-end">
            <button
              class="rounded-xl border border-bordure px-4 py-2 text-sm font-bold text-muted transition hover:bg-fond"
              @click="confirmDesactiver = null"
            >
              Annuler
            </button>
            <button
              class="rounded-xl px-4 py-2 text-sm font-bold text-white transition"
              :class="
                confirmDesactiver.statutUtilisateur === 'Actif'
                  ? 'bg-bloque hover:bg-bloque/90'
                  : 'bg-succes hover:bg-succes/90'
              "
              @click="toggleStatut(confirmDesactiver)"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
