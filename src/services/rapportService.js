import api from './api'

const rapportService = {
    async listerParProjet(projetId) { return (await api.get(`/projets/${projetId}/rapports`)).data },
    async detail(id) { return (await api.get(`/rapports/${id}`)).data },
    async creer(projetId, data) { return (await api.post(`/projets/${projetId}/rapports`, data)).data },
    async modifier(id, data) { return (await api.patch(`/rapports/${id}`, data)).data },
    async supprimer(id) { return (await api.delete(`/rapports/${id}`)).data },
    async ajouterPhotos(rapportId, fichiers) {
        const form = new FormData()
        fichiers.forEach(f => form.append('photos', f))
        return (await api.post(`/rapports/${rapportId}/photos`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })).data
    },
}

export default rapportService