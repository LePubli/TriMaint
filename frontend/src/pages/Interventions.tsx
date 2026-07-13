import { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Search, X, Edit2, Trash2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

interface Intervention {
  id: number
  machine_id: number
  panne_id?: number
  technicien: string
  duree?: number
  commentaire?: string
  validee: boolean
  validee_par?: string
  date_intervention: string
}

const emptyForm = { machine_id: '', panne_id: '', technicien: '', duree: '', commentaire: '', date_intervention: '' }

export default function Interventions() {
  const { user } = useAuth()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [pannes, setPannes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Intervention | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchAll = () => {
    Promise.all([api.get('/interventions/'), api.get('/machines/'), api.get('/pannes/')]).then(([i, m, p]) => {
      setInterventions(i.data); setMachines(m.data); setPannes(p.data)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchAll() }, [])

  const filtered = interventions.filter(i =>
    i.technicien.toLowerCase().includes(search.toLowerCase()) ||
    i.commentaire?.toLowerCase().includes(search.toLowerCase())
  )

  const getMachineName = (id: number) => machines.find(m => m.id === id)?.nom || `#${id}`
  const getPanneTitre = (id?: number) => id ? pannes.find(p => p.id === id)?.titre || `#${id}` : '—'

  const openCreate = () => {
    setForm({ ...emptyForm, date_intervention: new Date().toISOString().slice(0, 16) })
    setEditing(null); setShowForm(true)
  }
  const openEdit = (i: Intervention) => {
    setForm({
      machine_id: String(i.machine_id),
      panne_id: i.panne_id ? String(i.panne_id) : '',
      technicien: i.technicien,
      duree: i.duree ? String(i.duree) : '',
      commentaire: i.commentaire || '',
      date_intervention: i.date_intervention ? new Date(i.date_intervention).toISOString().slice(0, 16) : '',
    })
    setEditing(i); setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      machine_id: Number(form.machine_id),
      panne_id: form.panne_id ? Number(form.panne_id) : null,
      technicien: form.technicien,
      duree: form.duree ? Number(form.duree) : null,
      commentaire: form.commentaire,
      date_intervention: form.date_intervention || null,
    }
    try {
      if (editing) { await api.put(`/interventions/${editing.id}`, payload); toast.success('Intervention mise à jour') }
      else { await api.post('/interventions/', payload); toast.success('Intervention créée') }
      setShowForm(false); fetchAll()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette intervention ?')) return
    try { await api.delete(`/interventions/${id}`); toast.success('Supprimée'); fetchAll() }
    catch { toast.error('Erreur') }
  }

  const handleValider = async (id: number) => {
    try { await api.post(`/interventions/${id}/valider`); toast.success('Intervention validée'); fetchAll() }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const canValidate = user?.role === 'admin' || user?.role === 'manager'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Interventions</h1>
          <p className="text-gray-400 text-sm mt-1">{interventions.length} intervention{interventions.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nouvelle intervention
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par technicien, commentaire..." className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Machine</th>
              <th className="text-left px-4 py-3">Panne liée</th>
              <th className="text-left px-4 py-3">Technicien</th>
              <th className="text-left px-4 py-3">Durée</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">Chargement...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">Aucune intervention</td></tr>
              : filtered.map(i => (
                <tr key={i.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-white">{getMachineName(i.machine_id)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[150px] truncate">{getPanneTitre(i.panne_id)}</td>
                  <td className="px-4 py-3 text-gray-300">{i.technicien}</td>
                  <td className="px-4 py-3 text-gray-400">{i.duree ? `${i.duree} min` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(i.date_intervention).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    {i.validee
                      ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={13} /> Validée{i.validee_par ? ` (${i.validee_par})` : ''}</span>
                      : <span className="text-yellow-400 text-xs">En attente</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canValidate && !i.validee && (
                        <button onClick={() => handleValider(i.id)} className="text-gray-400 hover:text-green-400 transition-colors" title="Valider">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      <button onClick={() => openEdit(i)} className="text-gray-400 hover:text-blue-400 transition-colors"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(i.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 my-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">{editing ? 'Modifier' : 'Nouvelle intervention'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Machine *</label>
                <select value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Sélectionner...</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Panne liée</label>
                <select value={form.panne_id} onChange={e => setForm(f => ({ ...f, panne_id: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Aucune</option>
                  {pannes.filter(p => !form.machine_id || p.machine_id === Number(form.machine_id)).map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Technicien *</label>
                <input value={form.technicien} onChange={e => setForm(f => ({ ...f, technicien: e.target.value }))} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Durée (min)</label>
                  <input type="number" value={form.duree} onChange={e => setForm(f => ({ ...f, duree: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input type="datetime-local" value={form.date_intervention} onChange={e => setForm(f => ({ ...f, date_intervention: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
                <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">Annuler</button>
                <button type="submit" className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">{editing ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
