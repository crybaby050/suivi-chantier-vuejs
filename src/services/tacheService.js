import api from './api'

const tacheService = {
    async listerParPhase(phaseId) { return (await api.get(`/phases/${phaseId}/taches`)).data },
    async detail(id) { return (await api.get(`/taches/${id}`)).data },
}

export default tacheService