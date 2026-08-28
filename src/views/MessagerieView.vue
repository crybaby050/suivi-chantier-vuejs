<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useRole } from '@/composables/useRole'
import { useToast } from '@/composables/useToast'
import conversationService from '@/services/conversationService'
import messageService from '@/services/messageService'
import projetService from '@/services/projetService'
import affectationService from '@/services/affectationService'
import tacheService from '@/services/tacheService'
import phaseService from '@/services/phaseService'

const auth = useAuthStore()
const { isAdmin } = useRole()
const { showToast } = useToast()

// ─── État ─────────────────────────────────────────────────────────────────────
const conversations = ref([])
const conversationActive = ref(null)
const messages = ref([])
const loadingConvs = ref(true)
const loadingMessages = ref(false)
const contenu = ref('')
const photosEnAttente = ref([])
const previewsEnAttente = ref([])
const envoyant = ref(false)
const messagesRef = ref(null)

async function selectionnerConversation(conv) {
  conversationActive.value = conv
  loadingMessages.value = true
  try {
    messages.value = await messageService.lister(conv.id)
    await conversationService.marquerLue(conv.id)
    scrollBas()
  } finally {
    loadingMessages.value = false
  }
}

function retourListe() {
  conversationActive.value = null
}

function scrollBas() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

async function chargerConversations() {
  loadingConvs.value = true
  try {
    const projets = await projetService.lister()
    let projetsFiltres = projets

    if (!isAdmin.value) {
      const affectations = await affectationService.listerParUtilisateur(auth.user.id)

      if (auth.user.roleGlobal === 'Ouvrier') {
        const projetIds = new Set()

        await Promise.all(
          affectations.map(async (aff) => {
            try {
              const tache = await tacheService.detail(aff.tacheId)
              const phase = await phaseService.detail(tache.phaseId)
              projetIds.add(phase.projetId)
            } catch (_) {}
          }),
        )

        projetsFiltres = projets.filter((p) => projetIds.has(p.id))
      } else {
        const membershipsResults = await Promise.all(
          projets.map(async (projet) => {
            try {
              const membres = await projetService.listerMembres(projet.id)
              const estMembre = membres.some((m) => m.utilisateurId === auth.user.id)
              return estMembre ? projet : null
            } catch (_) {
              return null
            }
          }),
        )
        projetsFiltres = membershipsResults.filter(Boolean)
      }
    }

    const convs = await Promise.all(
      projetsFiltres.map(async (projet) => {
        try {
          const conv = await conversationService.getOuCreerGroupeProjet(projet.id)
          return { ...conv, projetNom: projet.nom }
        } catch (_) {
          return null
        }
      }),
    )

    conversations.value = convs.filter(Boolean)
  } finally {
    loadingConvs.value = false
  }
}

watch(messages, scrollBas)

onMounted(chargerConversations)

// ─── Photos ───────────────────────────────────────────────────────────────────

function onPhotosChange(e) {
  Array.from(e.target.files).forEach((f) => {
    photosEnAttente.value.push(f)
    previewsEnAttente.value.push(URL.createObjectURL(f))
  })
  e.target.value = ''
}

function retirerPhoto(idx) {
  URL.revokeObjectURL(previewsEnAttente.value[idx])
  photosEnAttente.value.splice(idx, 1)
  previewsEnAttente.value.splice(idx, 1)
}

// ─── Envoi message ────────────────────────────────────────────────────────────

async function envoyerMessage() {
  if (!contenu.value.trim() && !photosEnAttente.value.length) return
  if (!conversationActive.value) return

  envoyant.value = true
  try {
    let urls = []

    if (photosEnAttente.value.length) {
      const res = await messageService.uploaderPhotos(photosEnAttente.value)
      urls = res.urls
    }

    const msg = await messageService.envoyer(conversationActive.value.id, {
      contenu: contenu.value.trim() || undefined,
      photos: urls,
    })

    messages.value.push(msg)
    contenu.value = ''
    photosEnAttente.value = []
    previewsEnAttente.value = []
    scrollBas()
  } catch (e) {
    showToast("Erreur lors de l'envoi.", 'error')
  } finally {
    envoyant.value = false
  }
}

function onEnter(e) {
  if (!e.shiftKey) {
    e.preventDefault()
    envoyerMessage()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estMoi(msg) {
  return msg.auteurId === auth.user?.id
}

function formatHeure(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatJour(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function memeJour(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}
</script>

<template>
  <AppLayout title="Messagerie">
    <div
      class="flex gap-0 h-[calc(100vh-theme(spacing.32))] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-2xl border border-bordure shadow-card bg-carte"
    >
      <!-- ── Panneau gauche : liste des groupes ── -->
      <!-- Mobile/tablette : plein écran, masqué si une conversation est ouverte -->
      <!-- Desktop (lg+) : toujours visible, largeur fixe -->
      <div
        class="w-full lg:w-72 flex-shrink-0 flex-col border-r border-bordure"
        :class="conversationActive ? 'hidden lg:flex' : 'flex'"
      >
        <!-- Header -->
        <div class="px-4 py-4 border-b border-bordure">
          <h2 class="text-sm font-black text-texte">Mes groupes</h2>
          <p class="text-xs text-muted mt-0.5">{{ conversations.length }} conversation(s)</p>
        </div>

        <!-- Liste -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="loadingConvs" class="flex justify-center py-8">
            <i class="fa-solid fa-spinner fa-spin text-primary"></i>
          </div>

          <div v-else-if="!conversations.length" class="px-4 py-8 text-center">
            <i class="fa-solid fa-comments text-2xl text-muted/30 mb-2"></i>
            <p class="text-xs text-muted">Aucune conversation</p>
          </div>

          <button
            v-for="conv in conversations"
            :key="conv.id"
            class="w-full flex items-start gap-3 px-4 py-3 text-left transition border-b border-bordure/50 last:border-0"
            :class="conversationActive?.id === conv.id ? 'bg-primary/5' : 'hover:bg-fond'"
            @click="selectionnerConversation(conv)"
          >
            <!-- Icône groupe -->
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10"
            >
              <i class="fa-solid fa-building text-sm text-primary"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <p
                  class="text-sm font-bold truncate"
                  :class="conversationActive?.id === conv.id ? 'text-primary' : 'text-texte'"
                >
                  {{ conv.projetNom }}
                </p>
              </div>
              <p v-if="conv.dernierMessage" class="text-xs text-muted truncate mt-0.5">
                {{ conv.dernierMessage }}
              </p>
              <p v-else class="text-xs text-muted/50 italic mt-0.5">Aucun message</p>
            </div>
          </button>
        </div>
      </div>

      <!-- ── Panneau droit : messages ── -->
      <!-- Mobile/tablette : plein écran, visible seulement si une conversation est ouverte -->
      <!-- Desktop (lg+) : toujours visible -->
      <div class="flex-1 min-w-0 flex-col" :class="conversationActive ? 'flex' : 'hidden lg:flex'">
        <!-- Pas de conversation sélectionnée (desktop uniquement, car masqué sur mobile) -->
        <div
          v-if="!conversationActive"
          class="flex-1 flex flex-col items-center justify-center text-center p-8"
        >
          <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fond">
            <i class="fa-solid fa-comments text-2xl text-muted/40"></i>
          </div>
          <p class="font-bold text-texte">Sélectionne un groupe</p>
          <p class="text-sm text-muted mt-1">pour voir les messages</p>
        </div>

        <template v-else>
          <!-- Header conversation -->
          <div
            class="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-bordure flex-shrink-0"
          >
            <!-- Bouton retour, visible seulement en dessous de lg -->
            <button
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-fond hover:text-primary lg:hidden"
              @click="retourListe"
            >
              <i class="fa-solid fa-arrow-left text-sm"></i>
            </button>
            <div
              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10"
            >
              <i class="fa-solid fa-building text-sm text-primary"></i>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-black text-texte truncate">
                {{ conversationActive.projetNom }}
              </p>
              <p class="text-xs text-muted">Groupe projet</p>
            </div>
          </div>

          <!-- Messages -->
          <div ref="messagesRef" class="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-1">
            <div v-if="loadingMessages" class="flex justify-center py-8">
              <i class="fa-solid fa-spinner fa-spin text-primary"></i>
            </div>

            <div
              v-else-if="!messages.length"
              class="flex flex-col items-center justify-center h-full text-center"
            >
              <i class="fa-solid fa-message text-3xl text-muted/20 mb-3"></i>
              <p class="text-sm text-muted">Aucun message. Soyez le premier à écrire !</p>
            </div>

            <template v-else>
              <template v-for="(msg, idx) in messages" :key="msg.id">
                <!-- Séparateur de date -->
                <div
                  v-if="idx === 0 || !memeJour(messages[idx - 1].dateEnvoi, msg.dateEnvoi)"
                  class="flex items-center gap-3 my-4"
                >
                  <div class="flex-1 h-px bg-bordure"></div>
                  <span class="text-[11px] font-bold text-muted px-2 capitalize">
                    {{ formatJour(msg.dateEnvoi) }}
                  </span>
                  <div class="flex-1 h-px bg-bordure"></div>
                </div>

                <!-- Bulle message -->
                <div class="flex gap-2 mb-1" :class="estMoi(msg) ? 'flex-row-reverse' : 'flex-row'">
                  <!-- Avatar -->
                  <div
                    v-if="!estMoi(msg)"
                    class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary self-end"
                  >
                    {{ msg.auteurId }}
                  </div>

                  <!-- Contenu -->
                  <div
                    class="max-w-[80%] sm:max-w-[65%] flex flex-col gap-1"
                    :class="estMoi(msg) ? 'items-end' : 'items-start'"
                  >
                    <!-- Texte -->
                    <div
                      v-if="msg.contenu && !msg.supprime"
                      class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      :class="
                        estMoi(msg)
                          ? 'bg-primary text-white rounded-tr-sm'
                          : 'bg-fond text-texte rounded-tl-sm'
                      "
                    >
                      {{ msg.contenu }}
                    </div>

                    <!-- Message supprimé -->
                    <div
                      v-else-if="msg.supprime"
                      class="rounded-2xl px-4 py-2.5 text-sm text-muted italic bg-fond"
                    >
                      Message supprimé
                    </div>

                    <!-- Photos -->
                    <div
                      v-if="msg.photos?.length && !msg.supprime"
                      class="grid gap-1"
                      :class="msg.photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
                    >
                      <img
                        v-for="(url, i) in msg.photos"
                        :key="i"
                        :src="url"
                        class="rounded-xl max-w-[150px] sm:max-w-[200px] object-cover cursor-pointer hover:opacity-90 transition"
                      />
                    </div>

                    <!-- Heure -->
                    <span class="text-[10px] text-muted px-1">
                      {{ formatHeure(msg.dateEnvoi) }}
                    </span>
                  </div>
                </div>
              </template>
            </template>
          </div>

          <!-- Zone de saisie -->
          <div class="border-t border-bordure px-3 sm:px-4 py-3 flex-shrink-0">
            <!-- Previews photos -->
            <div v-if="previewsEnAttente.length" class="flex gap-2 mb-3 flex-wrap">
              <div v-for="(url, idx) in previewsEnAttente" :key="idx" class="relative group">
                <img :src="url" class="h-16 w-16 rounded-xl object-cover" />
                <button
                  class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-bloque text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                  @click="retirerPhoto(idx)"
                >
                  <i class="fa-solid fa-xmark text-[9px]"></i>
                </button>
              </div>
            </div>

            <div class="flex items-end gap-2">
              <!-- Bouton photo -->
              <label
                class="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl bg-fond text-muted transition hover:bg-primary/10 hover:text-primary"
              >
                <i class="fa-solid fa-image text-sm"></i>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="onPhotosChange"
                />
              </label>

              <!-- Textarea -->
              <textarea
                v-model="contenu"
                placeholder="Écris un message... (Shift+Entrée pour sauter une ligne)"
                rows="1"
                class="flex-1 resize-none rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 max-h-32"
                @keydown.enter="onEnter"
              />

              <!-- Bouton envoyer -->
              <button
                class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40"
                :class="
                  contenu.trim() || photosEnAttente.length
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-fond text-muted'
                "
                :disabled="(!contenu.trim() && !photosEnAttente.length) || envoyant"
                @click="envoyerMessage"
              >
                <i v-if="envoyant" class="fa-solid fa-spinner fa-spin text-sm"></i>
                <i v-else class="fa-solid fa-paper-plane text-sm"></i>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </AppLayout>
</template>
