import api from './api'

const tacheService = {
    async listerParPhase(phaseId) { return (await api.get(`/phases/${phaseId}/taches`)).data },
    async detail(id) { return (await api.get(`/taches/${id}`)).data },
    async creer(phaseId, data) { return (await api.post(`/phases/${phaseId}/taches`, data)).data },
    async modifier(id, data) { return (await api.put(`/taches/${id}`, data)).data },
    async supprimer(id) { return (await api.delete(`/taches/${id}`)).data },
}

export default tacheService