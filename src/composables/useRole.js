import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useRole() {
    const auth = useAuthStore()
    const role = computed(() => auth.user?.roleGlobal)

    const isAdmin = computed(() => role.value === 'Admin')
    const isChef = computed(() => role.value === 'Chef de chantier')
    const isOuvrier = computed(() => role.value === 'Ouvrier')
    const isClient = computed(() => role.value === 'Client')
    const canManage = computed(() => ['Admin', 'Chef de chantier'].includes(role.value))

    return { role, isAdmin, isChef, isOuvrier, isClient, canManage }
}