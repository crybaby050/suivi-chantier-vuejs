import api from './api'

const utilisateurService = {
    async lister() { return (await api.get('/utilisateurs')).data },
    async detail(id) { return (await api.get(`/utilisateurs/${id}`)).data },
}

export default utilisateurService