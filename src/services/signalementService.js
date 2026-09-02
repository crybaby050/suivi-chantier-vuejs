import api from './api'

const signalementService = {
    async listerParProjet(projetId) { return (await api.get(`/projets/${projetId}/signalements`)).data },
    async listerParPhase(phaseId) { return (await api.get(`/phases/${phaseId}/signalements`)).data },
    async listerParTache(tacheId) { return (await api.get(`/taches/${tacheId}/signalements`)).data },
    async detail(id) { return (await api.get(`/signalements/${id}`)).data },
    async creer(projetId, data) { return (await api.post(`/projets/${projetId}/signalements`, data)).data },
    async modifierStatut(id, statut) { return (await api.patch(`/signalements/${id}`, { statut })).data },
    async supprimer(id) { return (await api.delete(`/signalements/${id}`)).data },
}

export default signalementService