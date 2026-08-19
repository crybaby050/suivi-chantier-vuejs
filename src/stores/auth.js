import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import authService from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
    // --- État ---
    const user = ref(null)
    const token = ref(localStorage.getItem('token') || null)
    const loading = ref(false)
    const error = ref(null)

    // --- Getters ---
    const isAuthenticated = computed(() => !!token.value)
    const userRole = computed(() => user.value?.role || null)

    // Vérifie si l'utilisateur a un rôle donné
    function hasRole(...roles) {
        return roles.includes(userRole.value)
    }

    // --- Actions ---
    async function login(email, password) {
        loading.value = true
        error.value = null
        try {
            const data = await authService.login(email, password)
            token.value = data.token
            user.value = data.user
            localStorage.setItem('token', data.token)
        } catch (err) {
            error.value = err.response?.data?.message || 'Identifiants incorrects'
            throw err
        } finally {
            loading.value = false
        }
    }

    // Appelé au démarrage de l'app pour restaurer la session
    async function fetchMe() {
        if (!token.value) return
        try {
            const data = await authService.me()
            user.value = data.user
        } catch (_) {
            // Token expiré ou invalide — l'intercepteur axios gère la redirection
            logout()
        }
    }

    function logout() {
        authService.logout()
        token.value = null
        user.value = null
        localStorage.removeItem('token')
    }

    return {
        user,
        token,
        loading,
        error,
        isAuthenticated,
        userRole,
        hasRole,
        login,
        fetchMe,
        logout,
    }
})