<script setup>
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold">Dashboard</h1>
    <p class="text-gray-500 mt-2">Connecté en tant que {{ auth.user?.nom }}</p>
    <button @click="auth.logout()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm">
      Se déconnecter
    </button>
  </div>
</template>
