<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')

async function handleLogin() {
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'Dashboard' })
  } catch (_) {
    // L'erreur est déjà dans auth.error, on l'affiche dans le template
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Suivi de Chantier</h1>
      <p class="text-sm text-gray-500 mb-8">Connectez-vous pour accéder à votre espace</p>

      <!-- Message d'erreur -->
      <div v-if="auth.error" class="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
        {{ auth.error }}
      </div>

      <div class="space-y-4">
        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> Email </label>
          <input
            v-model="email"
            type="email"
            placeholder="exemple@email.com"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Mot de passe -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> Mot de passe </label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Bouton -->
        <button
          @click="handleLogin"
          :disabled="auth.loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {{ auth.loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </div>
    </div>
  </div>
</template>
