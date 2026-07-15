import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Wrench, AlertTriangle, ClipboardList, Package,
  User, Plus, Edit2, Trash2, ShieldCheck, KeyRound,
  ShieldOff, RefreshCw, Filter, BarChart2
} from 'lucide-react'

interface LogEntry {
  id: number
  username: string
  user_role: string
  action: string
  entity_type: string
  entity_id: number | null
  entity_label: string | null
  created_at: string
}

const entityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  machine:      { icon: Wrench,         color: 'text-blue-400 bg-blue-900/30',    label: 'Machine' },
  panne:        { icon: AlertTriangle,  color: 'text-red-400 bg-red-900/30',      label: 'Panne' },
  intervention: { icon: ClipboardList, color: 'text-green-400 bg-green-900/30',  label: 'Intervention' },
  'pièce':      { icon: Package,        color: 'text-yellow-400 bg-yellow-900/30', label: 'Pièce' },
  utilisateur:  { icon: User,           color: 'text-purple-400 bg-purple-900/30', label: 'Utilisateur' },
}

const actionConfig: Record<string, { color: string; icon: React.ElementType }> = {
  'créé':          { color: 'text-green-400 bg-green-900/40 border-green-700',   icon: Plus },
  'modifié':       { color: 'text-blue-400 bg-blue-900/40 border-blue-700',      icon: Edit2 },
  'supprimé':      { color: 'text-red-400 bg-red-900/40 border-red-700',         icon: Trash2 },
  'validé':        { color: 'text-orange-400 bg-orange-900/40 border-orange-700', icon: ShieldCheck },
  'réinitialisé':  { color: 'text-yellow-400 bg-yellow-900/40 border-yellow-700', icon: KeyRound },
  'désactivé':     { color: 'text-gray-400 bg-gray-700/40 border-gray-600',      icon: ShieldOff },
  'activé':        { color: 'text-teal-400 bg-teal-900/40 border-teal-700',      icon: ShieldCheck },
}

const roleColors: Record<string, string> = {
  admin: 'text-purple-400', manager: 'text-blue-400', technicien: 'text-gray-400',
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const ENTITY_TYPES = ['', 'machine', 'panne', 'intervention', 'pièce', 'utilisateur']

export default function Activite() {
  const { user: me } = useAuth()
  const navigate = useNavigate()

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    if (me && me.role !== 'admin') navigate('/')
  }, [me, navigate])

  const fetchLogs = useCallback(() => {
    const params: Record<string, string> = { limit: '80' }
    if (filterType) params.entity_type = filterType
    if (filterUser) params.username = filterUser
    api.get('/admin/activite', { params })
      .then(r => { setLogs(r.data); setLastRefresh(new Date()) })
      .finally(() => setLoading(false))
  }, [filterType, filterUser])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchLogs, 15000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchLogs])

  const usernames = Array.from(new Set(logs.map(l => l.username)))

  const actionCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.action] = (acc[l.action] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-orange-500" />
            Journal d'activité
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {logs.length} événement{logs.length > 1 ? 's' : ''} — actualisé à{' '}
            {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-orange-500/20 border-orange-600 text-orange-400'
                : 'bg-gray-700 border-gray-600 text-gray-400 hover:text-white'
            }`}
          >
            <RefreshCw size={13} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto 15s' : 'Auto-refresh'}
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw size={13} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(actionCounts).slice(0, 4).map(([action, count]) => {
          const cfg = actionConfig[action] || { color: 'text-gray-400 bg-gray-700 border-gray-600', icon: BarChart2 }
          const Icon = cfg.icon
          return (
            <div key={action} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.color}`}>
              <Icon size={18} />
              <div>
                <p className="text-lg font-bold leading-none">{count}</p>
                <p className="text-xs mt-0.5 opacity-80 capitalize">{action}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Filter size={15} className="text-gray-500" />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-orange-500"
        >
          <option value="">Tous les types</option>
          {ENTITY_TYPES.filter(Boolean).map(t => (
            <option key={t} value={t}>{entityConfig[t]?.label || t}</option>
          ))}
        </select>
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-orange-500"
        >
          <option value="">Tous les utilisateurs</option>
          {usernames.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        {(filterType || filterUser) && (
          <button
            onClick={() => { setFilterType(''); setFilterUser('') }}
            className="text-xs text-orange-400 hover:text-orange-300 underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <RefreshCw size={18} className="animate-spin mr-2" /> Chargement...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <BarChart2 size={36} className="mb-3 opacity-40" />
            <p className="text-sm">Aucune activité enregistrée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {logs.map((log, idx) => {
              const entity = entityConfig[log.entity_type] || { icon: BarChart2, color: 'text-gray-400 bg-gray-700', label: log.entity_type }
              const action = actionConfig[log.action] || { color: 'text-gray-400 bg-gray-700 border-gray-600', icon: BarChart2 }
              const EntityIcon = entity.icon
              const ActionIcon = action.icon

              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-700/30 transition-colors">
                  {/* Icône entité */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${entity.color}`}>
                    <EntityIcon size={15} />
                  </div>

                  {/* Corps */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${roleColors[log.user_role] || 'text-gray-300'}`}>
                        {log.username}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${action.color}`}>
                        <ActionIcon size={10} />
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-500">{entity.label}</span>
                      {log.entity_label && (
                        <span className="text-xs text-gray-300 font-medium truncate max-w-xs">
                          — {log.entity_label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horodatage */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400" title={fullDate(log.created_at)}>
                      {timeAgo(log.created_at)}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <p className="text-xs text-gray-600 mt-3 text-center">
          Affichage des {logs.length} dernières entrées — utilisez les filtres pour affiner
        </p>
      )}
    </div>
  )
}
