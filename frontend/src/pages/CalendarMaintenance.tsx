import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Clock, X, List, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface MaintenanceTask {
  id: number
  machine_id: number
  machine_nom: string | null
  titre: string
  description: string | null
  frequence_jours: number
  derniere_execution: string | null
  responsable: string | null
  alert_jours: number
  actif: boolean
  created_at: string
  statut?: 'ok' | 'bientot' | 'en_retard' | 'inconnu'
  jours_restants?: number | null
  prochaine_echeance?: string | null
}

interface DayTasks {
  date: string // YYYY-MM-DD
  tasks: (MaintenanceTask & { computedStatus: 'ok' | 'bientot' | 'en_retard' })[]
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function computeTasksForMonth(
  tasks: MaintenanceTask[],
  year: number,
  month: number // 0-indexed
): DayTasks[] {
  const result: DayTasks[] = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayDate = new Date(year, month, d)

    const matching: DayTasks['tasks'] = []

    for (const t of tasks) {
      if (!t.actif) continue
      if (!t.derniere_execution) {
        // No last execution: echeance is creation + frequence
        const created = new Date(t.created_at)
        const echeance = new Date(created.getTime() + t.frequence_jours * 86400000)
        if (echeance.toDateString() === dayDate.toDateString()) {
          matching.push({ ...t, computedStatus: 'en_retard' })
        }
        continue
      }

      // Compute all echeances from derniere_execution
      const start = new Date(t.derniere_execution)
      start.setHours(0, 0, 0, 0)
      let echeance = new Date(start.getTime() + t.frequence_jours * 86400000)

      // Check within a reasonable window around this month
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 1)
      // Also go back a bit to catch overdue tasks
      const searchStart = new Date(monthStart.getTime() - 90 * 86400000)

      while (echeance <= monthEnd && echeance >= searchStart) {
        if (echeance.toDateString() === dayDate.toDateString()) {
          const daysRemaining = Math.ceil((echeance.getTime() - today.getTime()) / 86400000)
          let status: 'ok' | 'bientot' | 'en_retard'
          if (daysRemaining < 0) status = 'en_retard'
          else if (daysRemaining <= t.alert_jours) status = 'bientot'
          else status = 'ok'
          matching.push({ ...t, computedStatus: status, jours_restants: daysRemaining, prochaine_echeance: echeance.toISOString() })
        }
        echeance = new Date(echeance.getTime() + t.frequence_jours * 86400000)
      }
    }

    if (matching.length > 0) {
      result.push({ date: dateStr, tasks: matching })
    }
  }

  return result
}

function getStatusDot(status: 'ok' | 'bientot' | 'en_retard') {
  switch (status) {
    case 'ok': return 'bg-green-500'
    case 'bientot': return 'bg-yellow-400'
    case 'en_retard': return 'bg-red-500'
  }
}

function getStatusBadge(status: 'ok' | 'bientot' | 'en_retard') {
  switch (status) {
    case 'ok': return 'bg-green-900/40 text-green-300 border-green-700'
    case 'bientot': return 'bg-orange-900/40 text-orange-300 border-orange-700'
    case 'en_retard': return 'bg-red-900/40 text-red-300 border-red-700'
  }
}

function getStatusLabel(status: 'ok' | 'bientot' | 'en_retard', joursRestants?: number | null) {
  switch (status) {
    case 'ok': return 'À jour'
    case 'bientot': return `Dans ${joursRestants ?? 0}j`
    case 'en_retard': return `En retard de ${Math.abs(joursRestants ?? 0)}j`
  }
}

export default function CalendarMaintenance() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'calendar' | 'liste'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const fetchTasks = useCallback(() => {
    setLoading(true)
    api.get('/maintenance-preventive/')
      .then(r => setTasks(r.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const dayTasksMap = useMemo(() => {
    const map = new Map<string, DayTasks['tasks']>()
    const computed = computeTasksForMonth(tasks, year, month)
    for (const dt of computed) {
      map.set(dt.date, dt.tasks)
    }
    return map
  }, [tasks, year, month])

  // Calendar grid
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const calendarCells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = []

  // Previous month fill
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    calendarCells.push({
      day: d,
      dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      day: d,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: true,
    })
  }

  // Next month fill
  const remaining = 42 - calendarCells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    calendarCells.push({
      day: d,
      dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    })
  }

  const goPrev = () => setCurrentDate(new Date(year, month - 1, 1))
  const goNext = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const selectedTasks = selectedDay ? dayTasksMap.get(selectedDay) : null

  const marquerEffectue = async (id: number, titre: string) => {
    try {
      await api.post(`/maintenance-preventive/${id}/effectuer`)
      toast.success(`"${titre}" marquée comme effectuée`)
      fetchTasks()
    } catch {
      toast.error('Erreur lors de l\'exécution')
    }
  }

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    )
  }

  if (viewMode === 'liste') {
    navigate('/maintenance-preventive')
    return null
  }

  return (
    <div className="p-4 md:p-6 min-h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Maintenance Préventive</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-0.5">Vue calendrier des échéances</p>
          </div>
        </div>
        <button
          onClick={() => setViewMode('liste')}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg text-sm transition-colors"
        >
          <List size={16} />
          <span className="hidden sm:inline">Liste</span>
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg border border-gray-700 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <button onClick={goToday} className="flex items-center gap-2 text-white font-semibold text-lg hover:text-orange-400 transition-colors">
          <Calendar size={18} className="text-orange-500" />
          {MONTH_NAMES[month]} {year}
        </button>
        <button onClick={goNext} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg border border-gray-700 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> OK</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Bientôt dû</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> En retard</span>
      </div>

      {/* Calendar grid */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-700">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarCells.map((cell, idx) => {
            const cellTasks = dayTasksMap.get(cell.dateStr)
            const isToday = cell.dateStr === todayStr
            const isSelected = cell.dateStr === selectedDay
            const hasRetard = cellTasks?.some(t => t.computedStatus === 'en_retard')
            const hasBientot = cellTasks?.some(t => t.computedStatus === 'bientot')
            const hasOk = cellTasks?.some(t => t.computedStatus === 'ok')

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(cell.dateStr === selectedDay ? null : cell.dateStr)}
                className={`
                  min-h-[44px] md:min-h-[72px] p-1 md:p-2 border-b border-r border-gray-700/50 text-left
                  transition-colors relative
                  ${!cell.isCurrentMonth ? 'opacity-30' : ''}
                  ${isToday ? 'bg-gray-700/50' : ''}
                  ${isSelected ? 'bg-gray-700 ring-1 ring-orange-500' : 'hover:bg-gray-750'}
                `}
              >
                <span className={`
                  text-xs md:text-sm font-medium
                  ${isToday ? 'text-orange-400' : cell.isCurrentMonth ? 'text-gray-200' : 'text-gray-600'}
                `}>
                  {cell.day}
                </span>

                {cellTasks && cellTasks.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 md:mt-1 flex-wrap">
                    {hasRetard && <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500" />}
                    {hasBientot && <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-yellow-400" />}
                    {hasOk && !hasRetard && !hasBientot && <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500" />}
                    {hasOk && (hasRetard || hasBientot) && <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500" />}
                    {cellTasks.length > 3 && (
                      <span className="text-[9px] text-gray-400 ml-0.5">+{cellTasks.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Task detail panel - desktop side panel / mobile bottom sheet */}
      {selectedDay && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSelectedDay(null)} />

          {/* Panel */}
          <div className={`
            fixed z-50 bg-gray-800 border border-gray-700 overflow-y-auto
            bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl
            lg:top-0 lg:right-0 lg:bottom-0 lg:left-auto lg:w-96 lg:max-h-full lg:rounded-none lg:rounded-l-2xl
            shadow-2xl
          `}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedTasks ? `${selectedTasks.length} tâche${selectedTasks.length > 1 ? 's' : ''}` : 'Aucune tâche'}
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 text-gray-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {selectedTasks && selectedTasks.length > 0 ? selectedTasks.map(t => {
                const StatusIcon = t.computedStatus === 'en_retard' ? AlertTriangle : t.computedStatus === 'bientot' ? Clock : CheckCircle
                return (
                  <div key={t.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${getStatusBadge(t.computedStatus)}`}>
                        <StatusIcon size={11} />
                        {getStatusLabel(t.computedStatus, t.jours_restants)}
                      </span>
                    </div>

                    <h4 className="text-white font-medium text-sm">{t.titre}</h4>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        {t.machine_nom || `Machine #${t.machine_id}`}
                      </span>
                      {t.responsable && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          {t.responsable}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Tous les {t.frequence_jours}j
                      </span>
                    </div>

                    {t.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{t.description}</p>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => marquerEffectue(t.id, t.titre)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <CheckCircle size={13} />
                        Effectuer
                      </button>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune tâche prévue ce jour</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}