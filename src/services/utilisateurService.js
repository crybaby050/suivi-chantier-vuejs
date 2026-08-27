import api from './api'

const utilisateurService = {
    async lister() { return (await api.get('/utilisateurs')).data },
    async detail(id) { return (await api.get(`/utilisateurs/${id}`)).data },
    async inscrire(data) { return (await api.post('/auth/register', data)).data },
    async modifier(id, data) { return (await api.patch(`/utilisateurs/${id}`, data)).data },
    async changerRole(id, role) { return (await api.patch(`/utilisateurs/${id}/role`, { roleGlobal: role })).data },
    async ouvriersDisponibles() {
        const users = await this.lister()
        return users.filter(u =>
            u.roleGlobal === 'Ouvrier' &&
            u.statutUtilisateur === 'Actif' &&
            u.statutDisponibilite === 'Disponible'
        )
    },
}

export default utilisateurService