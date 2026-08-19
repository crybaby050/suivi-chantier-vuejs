import api from './api'

const authService = {
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password })
        return response.data // { token, user }
    },

    async me() {
        const response = await api.get('/auth/me')
        return response.data // { user }
    },

    async logout() {
        // Si ton backend Hono a une route logout, on l'appelle
        // Sinon cette fonction existe juste pour nettoyer le front
        try {
            await api.post('/auth/logout')
        } catch (_) {
            // silencieux : même si ça échoue, on nettoie localement
        }
    },
}

export default authService