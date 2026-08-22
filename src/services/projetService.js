import api from './api'

const projetService = {
    async lister() { return (await api.get('/projets')).data },
    async detail(id) { return (await api.get(`/projets/${id}`)).data },
    async creer(data) { return (await api.post('/projets', data)).data },
    async modifier(id, data) { return (await api.patch(`/projets/${id}`, data)).data },
    async supprimer(id) { return (await api.delete(`/projets/${id}`)).data },
    async listerMembres(id) { return (await api.get(`/projets/${id}/membres`)).data },
    async ajouterMembre(id, utilisateurId) {
        return (await api.post(`/projets/${id}/membres`, { utilisateurId })).data
    },
    async retirerMembre(projetId, utilisateurId) {
        return (await api.delete(`/projets/${projetId}/membres/${utilisateurId}`)).data
    },
}

export default projetService