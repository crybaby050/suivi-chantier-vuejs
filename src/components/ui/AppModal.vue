<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Overlay -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-texte/40 backdrop-blur-sm" @click="emit('close')" />

      <!-- Fenêtre -->
      <div
        class="relative z-10 w-full rounded-2xl bg-carte border border-bordure shadow-2xl flex flex-col max-h-[90vh]"
        :class="SIZES[size]"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between border-b border-bordure px-6 py-4 flex-shrink-0"
        >
          <h2 class="text-base font-black text-texte">{{ title }}</h2>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition hover:bg-fond hover:text-texte"
            @click="emit('close')"
          >
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <!-- Contenu scrollable -->
        <div class="overflow-y-auto flex-1 px-6 py-5">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="border-t border-bordure px-6 py-4 flex-shrink-0">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
