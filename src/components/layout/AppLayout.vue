<script setup>
import { ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import AppBottomNav from './AppBottomNav.vue'
import { useSidebar } from '@/composables/useSidebar'

defineProps({ title: { type: String, default: '' } })

const { collapsed } = useSidebar()
const sidebarRef = ref(null)
</script>

<template>
  <div class="flex min-h-screen bg-fond">
    <!-- Sidebar : visible seulement à partir de lg -->
    <div class="hidden lg:block">
      <AppSidebar ref="sidebarRef" />
    </div>

    <div
      class="flex flex-1 flex-col min-w-0 transition-all duration-300"
      :class="collapsed ? 'lg:ml-16' : 'lg:ml-64'"
    >
      <AppTopbar :title="title" @toggle-sidebar="sidebarRef.mobileOpen = !sidebarRef.mobileOpen" />
      <main class="flex-1 p-4 pt-20 pb-24 sm:p-6 sm:pt-20 lg:p-8 lg:pt-20 lg:pb-8">
        <slot />
      </main>
    </div>

    <AppBottomNav />
  </div>
</template>