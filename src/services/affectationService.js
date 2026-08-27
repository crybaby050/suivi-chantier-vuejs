import api from './api'

const affectationService = {
    async listerParUtilisateur(userId) {
        return (await api.get(`/utilisateurs/${userId}/affectations`)).data
    },
    async listerParTache(tacheId) {
        return (await api.get(`/taches/${tacheId}/affectations`)).data
    },
    async modifier(id, data) {
        return (await api.patch(`/affectations/${id}`, data)).data
    },
    async retirer(id) {
        return (await api.delete(`/affectations/${id}`)).data
    },
}

export default affectationService