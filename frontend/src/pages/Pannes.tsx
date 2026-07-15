import { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Search, X, Edit2, Trash2, AlertTriangle, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface Panne {
  id: number
  machine_id: number
  titre: string
  description?: string
  causes_possibles: string[]
  cause_reelle?: string
  solution?: string
  criticite: number
  temps_moyen_reparation?: number
  created_at: string
}

interface Machine { id: number; nom: string }

const criticiteColors: Record<number, string> = {
  1: 'bg-green-900/50 text-green-400 border-green-700',
  2: 'bg-blue-900/50 text-blue-400 border-blue-700',
  3: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  4: 'bg-orange-900/50 text-orange-400 border-orange-700',
  5: 'bg-red-900/50 text-red-400 border-red-700',
}
const criticiteLabel: Record<number, string> = { 1: 'Très faible', 2: 'Faible', 3: 'Moyen', 4: 'Élevé', 5: 'Critique' }

const emptyForm = { machine_id: '', titre: '', description: '', causes_possibles: '', cause_reelle: '', solution: '', criticite: '3', temps_moyen_reparation: '' }

export default function Pannes() {
  const [pannes, setPannes] = useState<Panne[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Panne | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchAll = () => {
    Promise.all([api.get('/pannes/'), api.get('/machines/')]).then(([p, m]) => {
      setPannes(p.data); setMachines(m.data)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { fetchAll() }, [])

  const filtered = pannes.filter(p =>
    p.titre.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase()) ||
    p.solution?.toLowerCase().includes(search.toLowerCase())
  )

  const getMachineName = (id: number) => machines.find(m => m.id === id)?.nom || `Machine #${id}`

  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowForm(true) }
  const openEdit = (p: Panne) => {
    setForm({
      machine_id: String(p.machine_id),
      titre: p.titre,
      description: p.description || '',
      causes_possibles: p.causes_possibles.join('\n'),
      cause_reelle: p.cause_reelle || '',
      solution: p.solution || '',
      criticite: String(p.criticite),
      temps_moyen_reparation: p.temps_moyen_reparation ? String(p.temps_moyen_reparation) : '',
    })
    setEditing(p); setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      machine_id: Number(form.machine_id),
      titre: form.titre,
      description: form.description,
      causes_possibles: form.causes_possibles.split('\n').map(s => s.trim()).filter(Boolean),
      cause_reelle: form.cause_reelle,
      solution: form.solution,
      criticite: Number(form.criticite),
      temps_moyen_reparation: form.temps_moyen_reparation ? Number(form.temps_moyen_reparation) : null,
    }
    try {
      if (editing) {
        await api.put(`/pannes/${editing.id}`, payload)
        toast.success('Panne mise à jour')
      } else {
        await api.post('/pannes/', payload)
        toast.success('Panne créée')
      }
      setShowForm(false); fetchAll()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Erreur') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette panne ?')) return
    try { await api.delete(`/pannes/${id}`); toast.success('Panne supprimée'); fetchAll() }
    catch { toast.error('Erreur') }
  }

  const exportCsv = async () => {
    const res = await api.get('/pannes/export/csv', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href = url; a.download = 'pannes.csv'; a.click()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pannes</h1>
          <p className="text-gray-400 text-sm mt-1">{pannes.length} panne{pannes.length > 1 ? 's' : ''} enregistrée{pannes.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">Export CSV</button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nouvelle panne
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Panne</th>
              <th className="text-left px-4 py-3">Machine</th>
              <th className="text-left px-4 py-3">Criticité</th>
              <th className="text-left px-4 py-3">Tps. rép.</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Chargement...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucune panne trouvée</td></tr>
              : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{p.titre}</p>
                    {p.description && <p className="text-gray-500 text-xs truncate max-w-xs">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{getMachineName(p.machine_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded border text-xs font-medium ${criticiteColors[p.criticite]}`}>
                      {criticiteLabel[p.criticite] || `Niv. ${p.criticite}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.temps_moyen_reparation ? `${p.temps_moyen_reparation} min` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/pannes/${p.id}`} className="text-gray-400 hover:text-orange-400 transition-colors" title="Voir le détail"><Eye size={15} /></Link>
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-400 transition-colors" title="Modifier"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-400 transition-colors" title="Supprimer"><Trash2 size={15} /></button>
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
              <h3 className="text-white font-semibold">{editing ? 'Modifier la panne' : 'Nouvelle panne'}</h3>
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
                <label className="block text-xs text-gray-400 mb-1">Titre *</label>
                <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description / Symptôme</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Causes possibles (une par ligne)</label>
                <textarea value={form.causes_possibles} onChange={e => setForm(f => ({ ...f, causes_possibles: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cause réelle</label>
                <input value={form.cause_reelle} onChange={e => setForm(f => ({ ...f, cause_reelle: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Solution</label>
                <textarea value={form.solution} onChange={e => setForm(f => ({ ...f, solution: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Criticité (1-5)</label>
                  <select value={form.criticite} onChange={e => setForm(f => ({ ...f, criticite: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {criticiteLabel[n]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Temps rép. (min)</label>
                  <input type="number" value={form.temps_moyen_reparation} onChange={e => setForm(f => ({ ...f, temps_moyen_reparation: e.target.value }))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                </div>
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
