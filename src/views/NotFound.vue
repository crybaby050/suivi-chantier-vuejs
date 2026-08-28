<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function retour() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-fond px-4 text-center">
    <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
      <i class="fa-solid fa-helmet-safety text-3xl text-primary"></i>
    </div>

    <p class="text-7xl font-black text-primary sm:text-8xl">404</p>
    <h1 class="mt-3 text-xl font-black text-texte sm:text-2xl">Page introuvable</h1>
    <p class="mt-2 max-w-sm text-sm text-muted">
      La page que tu cherches n'existe pas ou a été déplacée.
    </p>

    <div class="mt-8 flex flex-col gap-3 sm:flex-row">
      <button
        class="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary/90"
        @click="router.push('/')"
      >
        <i class="fa-solid fa-house text-xs"></i>
        Retour à l'accueil
      </button>
      <button
        class="flex items-center justify-center gap-2 rounded-xl border border-bordure px-5 py-2.5 text-sm font-bold text-muted transition hover:bg-carte hover:text-primary"
        @click="retour"
      >
        <i class="fa-solid fa-arrow-left text-xs"></i>
        Page précédente
      </button>
    </div>
  </div>
</template>
