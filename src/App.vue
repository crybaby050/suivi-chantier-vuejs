<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppToast from '@/components/ui/AppToast.vue'

const auth = useAuthStore()

onMounted(() => {
  auth.fetchMe()
})
</script>

<template>
  <RouterView />
</template>
