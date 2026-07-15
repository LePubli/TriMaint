import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  Search, BookOpen, AlertTriangle, Wrench, Clock, ChevronRight,
  Filter, X, CheckCircle2, XCircle, HelpCircle
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────
interface KnowledgeEntry {
  id: number; machine_id: number; machine_nom: string | null
  titre: string; description: string | null; cause_reelle: string | null
  solution: string | null; protocole_reparation: string | null
  criticite: number; temps_moyen_reparation: number | null
  causes_possibles: string[]; updated_at: string | null
}

interface MachineOption {
  id: number; nom: string; ligne: string | null
}

// ─── Constants ────────────────────────────────────────────────────
const CRITICITE_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Très faible', color: 'text-green-400', bg: 'bg-green-900/30 border-green-800/50' },
  2: { label: 'Faible', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/50' },
  3: { label: 'Moyen', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800/50' },
  4: { label: 'Élevé', color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-800/50' },
  5: { label: 'Critique', color: 'text-red-400', bg: 'bg-red-900/30 border-red-800/50' },
}

export default function BaseConnaissances() {
  const navigate = useNavigate()

  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [machines, setMachines] = useState<MachineOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null)
  const [criticiteMin, setCriticiteMin] = useState<number | null>(null)
  const [criticiteMax, setCriticiteMax] = useState<number | null>(null)
  const [avecSolution, setAvecSolution] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // ─── Fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/machines/?limit=500').then(r => setMachines(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedMachine) params.set('machine_id', String(selectedMachine))
    if (criticiteMin !== null) params.set('criticite_min', String(criticiteMin))
    if (criticiteMax !== null) params.set('criticite_max', String(criticiteMax))
    if (avecSolution) params.set('avec_solution', 'true')

    api.get(`/base-connaissances/?${params.toString()}`)
      .then(r => setEntries(r.data))
      .finally(() => setLoading(false))
  }, [searchQuery, selectedMachine, criticiteMin, criticiteMax, avecSolution])

  // ─── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: entries.length,
    avecSolution: entries.filter(e => e.solution).length,
    critiques: entries.filter(e => e.criticite >= 4).length,
    tempsMoyen: entries.length > 0
      ? Math.round(entries.reduce((acc, e) => acc + (e.temps_moyen_reparation || 0), 0) / entries.length)
      : 0,
  }), [entries])

  // ─── Helpers ────────────────────────────────────────────────────
  const highlightText = (text: string | null, query: string) => {
    if (!text || !query) return text || ''
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-orange-500/30 text-orange-300 rounded px-0.5">{part}</mark> : part
    )
  }

  const clearFilters = () => {
    setSearchQuery(''); setSelectedMachine(null)
    setCriticiteMin(null); setCriticiteMax(null); setAvecSolution(false)
  }

  const hasActiveFilters = searchQuery || selectedMachine || criticiteMin !== null || criticiteMax !== null || avecSolution

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Base de Connaissances</h1>
            <p className="text-gray-400 text-sm">Consultez les pannes résolues et leurs solutions pour intervenir rapidement</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Résultats', value: stats.total, icon: Search, color: 'text-gray-400' },
          { label: 'Avec solution', value: stats.avecSolution, icon: CheckCircle2, color: 'text-green-400' },
          { label: 'Critiques', value: stats.critiques, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Temps moyen', value: `${stats.tempsMoyen} min`, icon: Clock, color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Icon size={12} /> {label}
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, symptôme, cause, solution..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                : 'bg-gray-700 border-gray-600 text-gray-400 hover:text-white'
            }`}>
            <Filter size={14} /> Filtres
            {hasActiveFilters && <span className="w-2 h-2 bg-orange-400 rounded-full" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-700">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Machine</label>
              <select value={selectedMachine || ''} onChange={e => setSelectedMachine(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                <option value="">Toutes les machines</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.nom}{m.ligne ? ` (${m.ligne})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Criticité min</label>
              <select value={criticiteMin ?? ''} onChange={e => setCriticiteMin(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                <option value="">Toutes</option>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} — {CRITICITE_CONFIG[v].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Criticité max</label>
              <select value={criticiteMax ?? ''} onChange={e => setCriticiteMax(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                <option value="">Toutes</option>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} — {CRITICITE_CONFIG[v].label}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer pb-2">
                <input type="checkbox" checked={avecSolution} onChange={e => setAvecSolution(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-0" />
                Avec solution uniquement
              </label>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-800/50 rounded-lg">
                  Effacer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Aucun résultat trouvé</p>
          <p className="text-sm mt-1">Modifiez vos critères de recherche ou <button onClick={clearFilters} className="text-orange-400 hover:underline">effacez les filtres</button></p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const crit = CRITICITE_CONFIG[entry.criticite] || CRITICITE_CONFIG[3]
            const isExpanded = expandedId === entry.id
            const hasSolution = !!entry.solution
            const hasProtocol = !!entry.protocole_reparation

            return (
              <div key={entry.id} className={`bg-gray-800 border rounded-xl overflow-hidden transition-colors ${isExpanded ? 'border-orange-500/50' : 'border-gray-700 hover:border-gray-600'}`}>
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full text-left p-4 flex items-start gap-4"
                >
                  {/* Criticite badge */}
                  <div className={`shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${crit.bg}`}>
                    <span className={`text-sm font-bold ${crit.color}`}>{entry.criticite}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-white font-semibold text-sm">{highlightText(entry.titre, searchQuery)}</h3>
                      {hasSolution && <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> Résolu</span>}
                      {!hasSolution && <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full"><HelpCircle size={10} /> Sans solution</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {entry.machine_nom && (
                        <button onClick={e => { e.stopPropagation(); navigate(`/machines/${entry.machine_id}`) }}
                          className="hover:text-orange-400 transition-colors">{entry.machine_nom}</button>
                      )}
                      {entry.temps_moyen_reparation && (
                        <span className="flex items-center gap-1"><Clock size={10} /> {entry.temps_moyen_reparation} min</span>
                      )}
                      {entry.updated_at && <span>Modifié le {new Date(entry.updated_at).toLocaleDateString('fr-FR')}</span>}
                    </div>
                    {entry.description && !isExpanded && (
                      <p className="text-gray-400 text-xs mt-1.5 line-clamp-1">{entry.description}</p>
                    )}
                  </div>

                  <ChevronRight size={16} className={`text-gray-500 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Diagnostic */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle size={12} className="text-yellow-400" /> Diagnostic
                        </h4>
                        {entry.causes_possibles?.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Causes possibles :</p>
                            <ul className="space-y-1">
                              {entry.causes_possibles.map((c, i) => (
                                <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                  <span className="text-gray-600 mt-0.5">•</span> {highlightText(c, searchQuery)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {entry.cause_reelle && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Cause réelle :</p>
                            <p className="text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-2">
                              {highlightText(entry.cause_reelle, searchQuery)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Solution */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench size={12} className="text-green-400" /> Solution
                        </h4>
                        {entry.solution ? (
                          <div className="bg-green-900/15 border border-green-800/30 rounded-lg p-3">
                            <p className="text-sm text-green-200 whitespace-pre-wrap">{highlightText(entry.solution, searchQuery)}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 italic">Aucune solution documentée</p>
                        )}
                      </div>
                    </div>

                    {/* Protocol */}
                    {entry.protocole_reparation && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <BookOpen size={12} className="text-blue-400" /> Protocole de réparation
                        </h4>
                        <div className="bg-blue-900/15 border border-blue-800/30 rounded-lg p-4">
                          <div className="text-sm text-blue-100 whitespace-pre-wrap leading-relaxed">
                            {entry.protocole_reparation.split('\n').map((line, i) => {
                              const trimmed = line.trim()
                              if (!trimmed) return <br key={i} />
                              // Numbered steps
                              const stepMatch = trimmed.match(/^(\d+)[).]\s*(.*)/)
                              if (stepMatch) {
                                return (
                                  <div key={i} className="flex items-start gap-2 mb-1.5">
                                    <span className="shrink-0 w-6 h-6 bg-blue-600/30 text-blue-300 rounded-full flex items-center justify-center text-xs font-bold">
                                      {stepMatch[1]}
                                    </span>
                                    <span>{highlightText(stepMatch[2], searchQuery)}</span>
                                  </div>
                                )
                              }
                              // Bullet points
                              if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
                                return (
                                  <div key={i} className="flex items-start gap-2 mb-1 ml-2">
                                    <span className="text-blue-500">›</span>
                                    <span>{highlightText(trimmed.replace(/^[-*•]\s*/, ''), searchQuery)}</span>
                                  </div>
                                )
                              }
                              return <p key={i} className="mb-1">{highlightText(trimmed, searchQuery)}</p>
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-700">
                      <button onClick={() => navigate(`/pannes/${entry.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors">
                        Voir la panne complète <ChevronRight size={12} />
                      </button>
                      {entry.machine_nom && (
                        <button onClick={() => navigate(`/machines/${entry.machine_id}`)}
                          className="text-xs text-gray-400 hover:text-white transition-colors">
                          Voir la machine →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}