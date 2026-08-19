<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Restaure la session au démarrage (token présent dans localStorage)
onMounted(() => {
  auth.fetchMe()
})
</script>

<template>
  <RouterView />
</template>
