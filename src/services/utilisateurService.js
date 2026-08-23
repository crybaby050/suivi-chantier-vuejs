import api from './api'

const utilisateurService = {
    async lister() { return (await api.get('/utilisateurs')).data },
    async detail(id) { return (await api.get(`/utilisateurs/${id}`)).data },
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