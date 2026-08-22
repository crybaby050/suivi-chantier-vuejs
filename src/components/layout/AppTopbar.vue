<script setup>
defineProps({
  title: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <header class="h-14 bg-white border-b border-gray-200 flex items-center px-6">
    <h1 class="text-base font-semibold text-gray-800">{{ title }}</h1>
    <slot />
  </header>
</template>
