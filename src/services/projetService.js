import api from './api'

const projetService = {
    async lister() { return (await api.get('/projets')).data },
    async detail(id) { return (await api.get(`/projets/${id}`)).data },
    async creer(data) { return (await api.post('/projets', data)).data },
    async modifier(id, data) { return (await api.put(`/projets/${id}`, data)).data },
    async supprimer(id) { return (await api.delete(`/projets/${id}`)).data },
    async listerMembres(id) { return (await api.get(`/projets/${id}/membres`)).data },
}

export default projetService