import api from './api'

const conversationService = {
    async listerConversationsDirectes() {
        return (await api.get('/conversations/directes')).data
    },

    async getOuCreerGroupeProjet(projetId) {
        // GET — crée automatiquement si n'existe pas
        return (await api.get(`/projets/${projetId}/conversation`)).data
    },

    async marquerLue(conversationId) {
        return (await api.patch(`/conversations/${conversationId}/lecture`)).data
    },
}

export default conversationService