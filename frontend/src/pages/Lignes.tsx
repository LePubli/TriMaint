import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Factory, AlertTriangle, ChevronRight } from 'lucide-react'

interface ZoneCount { zone: string; count: number }
interface LigneInfo { ligne: string; site?: string; zones: ZoneCount[]; total: number; en_panne: number }

export default function Lignes() {
  const [lignes, setLignes] = useState<LigneInfo[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/machines/meta/lignes').then(r => setLignes(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Lignes & Process</h1>
        <p className="text-gray-400 text-sm mt-1">Vue d'ensemble des lignes de production, cliquez pour explorer le schéma et les machines</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : lignes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Factory size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucune ligne définie. Renseignez le champ "Ligne" sur vos machines pour les voir apparaître ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lignes.map(l => (
            <button
              key={l.ligne}
              onClick={() => navigate(`/lignes/${encodeURIComponent(l.ligne)}`)}
              className="text-left bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-orange-500 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-orange-500/15 rounded-lg flex items-center justify-center">
                      <Factory size={18} className="text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold">{l.ligne}</h2>
                      {l.site && <p className="text-xs text-gray-500">{l.site}</p>}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-600 group-hover:text-orange-400 transition-colors" />
              </div>

              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="text-gray-300">{l.total} machine{l.total > 1 ? 's' : ''}</span>
                {l.en_panne > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertTriangle size={13} /> {l.en_panne} en panne
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {l.zones.map(z => (
                  <span key={z.zone} className="text-[11px] px-2 py-0.5 bg-gray-700/60 text-gray-400 rounded-full">
                    {z.zone} ({z.count})
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
