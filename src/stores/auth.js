import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import authService from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
    // --- État ---
    const user = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const initialized = ref(false)
    let initPromise = null

    // --- Getters ---
    const isAuthenticated = computed(() => !!user.value)
    const userRole = computed(() => user.value?.roleGlobal || null)

    function hasRole(...roles) {
        return roles.includes(userRole.value)
    }

    // --- Actions ---
    async function login(email, password) {
        loading.value = true
        error.value = null

        try {
            const data = await authService.login(email, password)
            user.value = data.user
        } catch (err) {
            error.value =
                err.response?.data?.message ||
                'Identifiants incorrects'
            throw err
        } finally {
            loading.value = false
        }
    }

    async function fetchMe() {
        try {
            const data = await authService.me()
            user.value = data.user
        } catch (err) {
            if (err.response?.status === 401) {
                user.value = null
            }
            console.error('Erreur lors de la restauration de la session :', err)
        }
    }

    // Appelée une seule fois au démarrage de l'app.
    // Le router attend cette promesse avant de trancher sur l'auth.
    function init() {
        if (!initPromise) {
            initPromise = fetchMe().finally(() => {
                initialized.value = true
            })
        }
        return initPromise
    }

    async function logout() {
        try {
            await authService.logout()
        } finally {
            user.value = null
        }
    }

    return {
        user,
        loading,
        error,
        initialized,
        isAuthenticated,
        userRole,
        hasRole,
        login,
        fetchMe,
        init,
        logout,
    }
})