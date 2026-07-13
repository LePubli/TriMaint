import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, AlertTriangle, ClipboardList, QrCode, X } from 'lucide-react'

export default function MachineDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [machine, setMachine] = useState<any>(null)
  const [pannes, setPannes] = useState<any[]>([])
  const [interventions, setInterventions] = useState<any[]>([])
  const [showQr, setShowQr] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/machines/${id}`),
      api.get(`/pannes/?machine_id=${id}`),
      api.get(`/interventions/?machine_id=${id}&limit=10`),
    ]).then(([m, p, i]) => {
      setMachine(m.data)
      setPannes(p.data)
      setInterventions(i.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" /></div>
  if (!machine) return <div className="p-6 text-gray-400">Machine introuvable</div>

  const statutColor: Record<string, string> = {
    operationnel: 'text-green-400', en_panne: 'text-red-400',
    maintenance: 'text-yellow-400', arret: 'text-gray-400',
  }

  return (
    <div className="p-6">
      <button onClick={() => navigate('/machines')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm transition-colors">
        <ArrowLeft size={16} /> Retour aux machines
      </button>

      {/* Header */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{machine.nom}</h1>
            <p className="text-gray-400 text-sm mt-1 font-mono">{machine.code_interne || 'Pas de code interne'}</p>
          </div>
          <div className="flex items-center gap-3">
            {machine.qr_code && (
              <button onClick={() => setShowQr(true)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors">
                <QrCode size={14} /> QR Code
              </button>
            )}
            <span className={`text-sm font-semibold ${statutColor[machine.statut] || 'text-gray-400'}`}>
              ● {machine.statut?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-700">
          {[
            ['Site', machine.site],
            ['Ligne', machine.ligne],
            ['Zone', machine.zone],
            ['Fabricant', machine.fabricant],
            ['Modèle', machine.modele],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm text-white">{val || '—'}</p>
            </div>
          ))}
        </div>

        {machine.notes && (
          <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-300">{machine.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pannes */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            Pannes ({pannes.length})
          </h2>
          {pannes.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune panne enregistrée</p>
          ) : (
            <div className="space-y-2">
              {pannes.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{p.titre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Criticité: {p.criticite}/5</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${p.criticite >= 4 ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                    Niv. {p.criticite}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interventions */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-400" />
            Dernières interventions ({interventions.length})
          </h2>
          {interventions.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune intervention enregistrée</p>
          ) : (
            <div className="space-y-2">
              {interventions.map(i => (
                <div key={i.id} className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-white">{i.technicien}</p>
                    <span className={`text-xs ${i.validee ? 'text-green-400' : 'text-yellow-400'}`}>
                      {i.validee ? '✓ Validée' : 'En attente'}
                    </span>
                  </div>
                  {i.commentaire && <p className="text-xs text-gray-400 mt-1 truncate">{i.commentaire}</p>}
                  <p className="text-xs text-gray-500 mt-1">{new Date(i.date_intervention).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showQr && machine.qr_code && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">QR Code — {machine.nom}</h3>
              <button onClick={() => setShowQr(false)}><X size={18} className="text-gray-400 hover:text-white" /></button>
            </div>
            <img src={machine.qr_code} alt="QR Code" className="w-full rounded-lg bg-white p-2" />
          </div>
        </div>
      )}
    </div>
  )
}
