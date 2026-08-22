import api from './api'

const phaseService = {
    async listerParProjet(projetId) { return (await api.get(`/projets/${projetId}/phases`)).data },
    async detail(id) { return (await api.get(`/phases/${id}`)).data },
}

export default phaseService