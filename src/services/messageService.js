import api from './api'

const messageService = {
    async lister(conversationId) {
        return (await api.get(`/conversations/${conversationId}/messages`)).data
    },
    async envoyer(conversationId, data) {
        return (await api.post(`/conversations/${conversationId}/messages`, data)).data
    },
    async supprimer(messageId) {
        return (await api.delete(`/messages/${messageId}`)).data
    },
    async uploaderPhotos(fichiers) {
        const form = new FormData()
        fichiers.forEach(f => form.append('photos', f))
        return (await api.post('/messages/photos', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })).data
    },
}

export default messageService