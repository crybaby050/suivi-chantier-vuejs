<script setup>
import { useToast } from '@/composables/useToast'
const { message, type, visible } = useToast()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="visible"
        class="fixed right-5 top-20 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl"
        :class="type === 'error' ? 'bg-bloque text-white' : 'bg-texte text-white'"
      >
        <i
          class="fa-solid"
          :class="type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'"
        ></i>
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>
