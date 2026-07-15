import { useEffect, useState } from 'react'
import api from '../services/api'
import { Wrench, AlertTriangle, ClipboardList, Package, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface Stats {
  total_machines: number
  total_pannes: number
  total_interventions: number
  interventions_validees: number
  top_pannes: { titre: string; count: number }[]
  avg_repair_minutes: number
  machines_par_statut: { statut: string; count: number }[]
  pannes_par_criticite: { criticite: number; count: number }[]
}

const criticiteLabel = (c: number) => {
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Très faible', color: 'bg-green-500' },
    2: { label: 'Faible', color: 'bg-blue-500' },
    3: { label: 'Moyen', color: 'bg-yellow-500' },
    4: { label: 'Élevé', color: 'bg-orange-500' },
    5: { label: 'Critique', color: 'bg-red-500' },
  }
  return map[c] || { label: `Niveau ${c}`, color: 'bg-gray-500' }
}

const statutColor = (s: string) => {
  const map: Record<string, string> = {
    operationnel: 'text-green-400',
    en_panne: 'text-red-400',
    maintenance: 'text-yellow-400',
    arret: 'text-gray-400',
  }
  return map[s] || 'text-gray-400'
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/stats/').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de la maintenance Triselec</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Wrench className="text-blue-400" size={22} />} label="Machines" value={stats?.total_machines ?? 0} bg="bg-blue-500/10" />
        <StatCard icon={<AlertTriangle className="text-red-400" size={22} />} label="Pannes enreg." value={stats?.total_pannes ?? 0} bg="bg-red-500/10" />
        <StatCard icon={<ClipboardList className="text-yellow-400" size={22} />} label="Interventions" value={stats?.total_interventions ?? 0} bg="bg-yellow-500/10" />
        <StatCard icon={<CheckCircle className="text-green-400" size={22} />} label="Validées" value={stats?.interventions_validees ?? 0} bg="bg-green-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top pannes */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-400" />
            Top Pannes (par nombre d'interventions)
          </h2>
          {stats?.top_pannes.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune donnée disponible</p>
          ) : (
            <div className="space-y-3">
              {stats?.top_pannes.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.titre}</p>
                  </div>
                  <span className="text-sm font-bold text-orange-400">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Avg repair */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-orange-400" />
              Temps moyen réparation
            </h2>
            <p className="text-3xl font-bold text-white">
              {stats?.avg_repair_minutes ?? 0}
              <span className="text-base font-normal text-gray-400 ml-1">min</span>
            </p>
          </div>

          {/* Machines par statut */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Wrench size={16} className="text-orange-400" />
              État des machines
            </h2>
            <div className="space-y-2">
              {stats?.machines_par_statut.map((s, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className={`text-sm capitalize ${statutColor(s.statut)}`}>
                    {s.statut.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-bold text-white">{s.count}</span>
                </div>
              ))}
              {!stats?.machines_par_statut.length && <p className="text-gray-500 text-sm">Aucune machine</p>}
            </div>
          </div>

          {/* Pannes par criticité */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-400" />
              Pannes par criticité
            </h2>
            <div className="space-y-2">
              {stats?.pannes_par_criticite.map((p, i) => {
                const { label, color } = criticiteLabel(p.criticite)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-sm text-gray-300 flex-1">{label}</span>
                    <span className="text-sm font-bold text-white">{p.count}</span>
                  </div>
                )
              })}
              {!stats?.pannes_par_criticite.length && <p className="text-gray-500 text-sm">Aucune panne</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  )
}
