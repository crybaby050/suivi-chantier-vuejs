import api from './api'

const phaseService = {
    async listerParProjet(projetId) { return (await api.get(`/projets/${projetId}/phases`)).data },
    async detail(id) { return (await api.get(`/phases/${id}`)).data },
    async creer(projetId, data) { return (await api.post(`/projets/${projetId}/phases`, data)).data },
    async modifier(id, data) { return (await api.put(`/phases/${id}`, data)).data },
    async supprimer(id) { return (await api.delete(`/phases/${id}`)).data },
}

export default phaseService