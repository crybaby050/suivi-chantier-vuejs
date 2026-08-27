import api from './api'

const authService = {
    async login(email, password) {
        const response = await api.post('/auth/login', {
            email,
            motDePasse: password,
        })

        return response.data // { user }
    },

    async me() {
        const response = await api.get('/auth/me')

        return response.data // { user }
    },

    async logout() {
        await api.post('/auth/logout')
    },
}

export default authService