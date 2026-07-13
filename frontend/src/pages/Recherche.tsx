import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Search, Wrench, AlertTriangle, ClipboardList, Loader2 } from 'lucide-react'

interface SearchResult {
  machines: { id: number; nom: string; code_interne?: string; statut: string }[]
  pannes: { id: number; titre: string; criticite: number; machine_id: number }[]
  interventions: { id: number; technicien: string; machine_id: number }[]
}

export default function Recherche() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults(null); return }
    const t = setTimeout(() => {
      setLoading(true)
      api.get(`/search/?q=${encodeURIComponent(query)}`)
        .then(r => setResults(r.data))
        .finally(() => setLoading(false))
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  const total = results ? results.machines.length + results.pannes.length + results.interventions.length : 0

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Recherche globale</h1>
        <p className="text-gray-400 text-sm mt-1">Cherchez dans les machines, pannes et interventions</p>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nom de machine, code interne, panne, technicien..."
          className="w-full pl-11 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          autoFocus
        />
      </div>

      {results && (
        <div>
          <p className="text-xs text-gray-500 mb-4">{total} résultat{total > 1 ? 's' : ''} pour « {query} »</p>

          {results.machines.length > 0 && (
            <div className="mb-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
                <Wrench size={13} /> Machines ({results.machines.length})
              </h2>
              <div className="space-y-2">
                {results.machines.map(m => (
                  <button key={m.id} onClick={() => navigate(`/machines/${m.id}`)}
                    className="w-full text-left p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-orange-500 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">{m.nom}</p>
                      <span className="text-xs text-gray-500">{m.statut}</span>
                    </div>
                    {m.code_interne && <p className="text-xs text-gray-400 font-mono mt-0.5">{m.code_interne}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.pannes.length > 0 && (
            <div className="mb-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
                <AlertTriangle size={13} /> Pannes ({results.pannes.length})
              </h2>
              <div className="space-y-2">
                {results.pannes.map(p => (
                  <div key={p.id} className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">{p.titre}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${p.criticite >= 4 ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                        Niv. {p.criticite}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Machine #{p.machine_id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.interventions.length > 0 && (
            <div className="mb-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
                <ClipboardList size={13} /> Interventions ({results.interventions.length})
              </h2>
              <div className="space-y-2">
                {results.interventions.map(i => (
                  <div key={i.id} className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <p className="text-white">{i.technicien}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Machine #{i.machine_id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="text-center py-10 text-gray-500">
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p>Aucun résultat pour « {query} »</p>
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="text-center py-16 text-gray-600">
          <Search size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Entrez au moins 2 caractères pour rechercher</p>
        </div>
      )}
    </div>
  )
}
