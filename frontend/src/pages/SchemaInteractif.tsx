import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  ZoomIn, ZoomOut, Maximize2, ArrowLeft,
  Search, X, Filter, MapPin, Layers, QrCode,
  ChevronUp, ChevronDown, Thermometer
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   TriMaint – Schéma Interactif (Photo + Hotspots)
   Mobile-first responsive avec pinch-to-zoom
   ═══════════════════════════════════════════════════════════════════ */

// ─── Types ────────────────────────────────────────────────────────
interface SchemaMachine {
  id: number; nom: string; code_interne: string | null; statut: string
  zone: string | null; etage: number | null; ligne: string | null
  pos_x: number | null; pos_y: number | null; type: string; modele?: string | null
}
interface SchemaData {
  machines: SchemaMachine[]; zones: string[]; etages: number[]; lignes: string[]
}
interface HeatmapZoneData {
  open_pannes: number
  recent_pannes: number
  avg_criticite: number
}
interface HeatmapMachineData {
  machine_id: number
  panne_count: number
  avg_criticite: number
}
interface HeatmapData {
  zones: Record<string, HeatmapZoneData>
  machines: HeatmapMachineData[]
}

// ─── Coordinate mapping (DB → % of image) ────────────────────────
const MAP = { minX: 5.2, maxX: 157.2, minY: 4.4, maxY: 111.7 }
const rangeX = MAP.maxX - MAP.minX
const rangeY = MAP.maxY - MAP.minY
const toPctX = (x: number) => ((x - MAP.minX) / rangeX) * 100
const toPctY = (y: number) => ((y - MAP.minY) / rangeY) * 100

// ─── Zone definitions ─────────────────────────────────────────────
const ZONE_DEFS: Record<string, { label: string; color: string; border: string }> = {
  'Entree':        { label: 'Réception',     color: '#43a047', border: '#66bb6a' },
  'Pretri':        { label: 'Pré-tri',       color: '#f9a825', border: '#fdd835' },
  'Triage':        { label: 'Triage',        color: '#1e88e5', border: '#42a5f5' },
  'TriageOptique': { label: 'Tri optique',   color: '#ff8f00', border: '#ffb300' },
  'Affinage':      { label: 'Affinage',      color: '#00897b', border: '#26a69a' },
  'Compactage':    { label: 'Compactage',    color: '#e53935', border: '#ef5350' },
  'Stockage':      { label: 'Stockage',      color: '#5e35b1', border: '#7e57c2' },
  'Refus':         { label: 'Refus',         color: '#546e7a', border: '#78909c' },
}

// ─── Equipment type config ────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  convoyeur:    { label: 'Convoyeur',   color: '#f9a825' },
  broyeur:      { label: 'Broyeur',     color: '#e53935' },
  automate:     { label: 'Automate',    color: '#1565c0' },
  deverseur:    { label: 'Déverseur',   color: '#7b1fa2' },
  crible:       { label: 'Crible',      color: '#2e7d32' },
  poste_arret:  { label: 'Poste arrêt', color: '#f57f17' },
  equipement:   { label: 'Équipement',  color: '#546e7a' },
}

const STATUT_DOT: Record<string, string> = {
  operationnel: '#22c55e', en_panne: '#ef4444', maintenance: '#f97316', arret: '#6b7280',
}

// ─── Hotspot size (responsive) ────────────────────────────────────
const HOTSPOT_PX = 28

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function SchemaInteractif() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // ─── State ────────────────────────────────────────────────────
  const [data, setData] = useState<SchemaData>({ machines: [], zones: [], etages: [], lignes: [] })
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedMachine, setSelectedMachine] = useState<SchemaMachine | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [hiddenZones, setHiddenZones] = useState<Set<string>>(new Set())
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [selectedEtage, setSelectedEtage] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [heatmapMode, setHeatmapMode] = useState(false)
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)

  // Refs for touch handling
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTouchDist = useRef(0)
  const lastTouchCenter = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 })

  // ─── Fetch heatmap data when mode toggles on ───────────────
  useEffect(() => {
    if (!heatmapMode) { setHeatmapData(null); return }
    api.get('/kpi/heatmap').then(r => setHeatmapData(r.data)).catch(() => {})
  }, [heatmapMode])

  // ─── Heatmap helpers ─────────────────────────────────────────
  const heatmapMachineMap = useMemo(() => {
    const map = new Map<number, HeatmapMachineData>()
    heatmapData?.machines.forEach(m => map.set(m.machine_id, m))
    return map
  }, [heatmapData])

  const getHeatmapColor = (count: number): string => {
    if (count === 0) return 'rgba(34, 197, 94, 0.25)'   // green
    if (count <= 3)  return 'rgba(234, 179, 8, 0.35)'    // yellow
    if (count <= 7)  return 'rgba(249, 115, 22, 0.40)'   // orange
    return 'rgba(239, 68, 68, 0.50)'                      // red
  }

  const getHeatmapTextColor = (count: number): string => {
    if (count === 0) return '#86efac'
    if (count <= 3)  return '#fde047'
    if (count <= 7)  return '#fdba74'
    return '#fca5a5'
  }

  // ─── Zone bounding boxes (approximate % coordinates) ──────────
  const ZONE_BOUNDS: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {
    'Entree':        { x1: 0, y1: 0, x2: 18, y2: 30 },
    'Pretri':        { x1: 18, y1: 0, x2: 38, y2: 35 },
    'Triage':        { x1: 38, y1: 0, x2: 60, y2: 35 },
    'TriageOptique': { x1: 60, y1: 0, x2: 78, y2: 30 },
    'Affinage':      { x1: 38, y1: 35, x2: 60, y2: 70 },
    'Compactage':    { x1: 60, y1: 30, x2: 82, y2: 65 },
    'Stockage':      { x1: 78, y1: 30, x2: 100, y2: 70 },
    'Refus':         { x1: 0, y1: 70, x2: 38, y2: 100 },
  }

  // ─── Detect mobile ───────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ─── Fetch data ──────────────────────────────────────────────
  const fetchData = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedEtage !== null) params.set('etage', String(selectedEtage))
    api.get(`/machines/schema-data${params ? '?' + params : ''}`).then(r => {
      setData(r.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedEtage])
  useEffect(() => { setLoading(true); fetchData() }, [fetchData])

  // ─── Filtered machines ───────────────────────────────────────
  const filteredMachines = useMemo(() => {
    let items = data.machines
    if (hiddenZones.size > 0)
      items = items.filter(m => !hiddenZones.has(m.zone || ''))
    if (hiddenTypes.size > 0)
      items = items.filter(m => !hiddenTypes.has(m.type))
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(m =>
        (m.nom || '').toLowerCase().includes(q) ||
        (m.code_interne || '').toLowerCase().includes(q)
      )
    }
    return items
  }, [data.machines, hiddenZones, hiddenTypes, searchQuery])

  const visibleIds = useMemo(() => new Set(filteredMachines.map(m => m.id)), [filteredMachines])

  // ─── Image load ─────────────────────────────────────────────
  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
    setImgLoaded(true)
  }, [])

  // ─── Zoom controls ──────────────────────────────────────────
  const zoomIn = useCallback(() => setZoom(z => Math.min(8, z * 1.3)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.3, z / 1.3)), [])
  const fitAll = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom(z => Math.max(0.3, Math.min(8, z * factor)))
  }, [])

  // ─── Touch: pinch-to-zoom + pan ─────────────────────────────
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }
  const getTouchCenter = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDist.current = getTouchDist(e.touches)
      lastTouchCenter.current = getTouchCenter(e.touches)
    } else if (e.touches.length === 1) {
      isDragging.current = true
      dragStart.current = {
        x: e.touches[0].clientX, y: e.touches[0].clientY,
        px: pan.x, py: pan.y
      }
    }
  }, [pan])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2) {
      // Pinch zoom
      const dist = getTouchDist(e.touches)
      const center = getTouchCenter(e.touches)
      if (lastTouchDist.current > 0) {
        const scale = dist / lastTouchDist.current
        const newZoom = Math.max(0.3, Math.min(8, zoom * scale))
        // Pan towards pinch center
        const dx = center.x - lastTouchCenter.current.x
        const dy = center.y - lastTouchCenter.current.y
        setZoom(newZoom)
        setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      }
      lastTouchDist.current = dist
      lastTouchCenter.current = center
    } else if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy })
    }
  }, [zoom])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
    lastTouchDist.current = 0
  }, [])

  // ─── Mouse pan (desktop) ────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-hotspot]')) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy })
  }, [])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  // ─── Toggle helpers ─────────────────────────────────────────
  const toggleZone = useCallback((z: string) => {
    setHiddenZones(prev => { const s = new Set(prev); s.has(z) ? s.delete(z) : s.add(z); return s })
  }, [])
  const toggleType = useCallback((t: string) => {
    setHiddenTypes(prev => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s })
  }, [])
  const resetView = useCallback(() => {
    setZoom(1); setPan({ x: 0, y: 0 }); setHiddenZones(new Set()); setHiddenTypes(new Set())
    setSearchQuery(''); setSelectedEtage(null)
  }, [])

  // ─── Navigate to machine ────────────────────────────────────
  const goToMachine = useCallback((m: SchemaMachine) => navigate(`/machines/${m.id}`), [navigate])

  // ─── Counts for filters ─────────────────────────────────────
  const zoneCounts = useMemo(() => {
    const c: Record<string, number> = {}
    data.machines.forEach(m => { const z = m.zone || 'Autre'; c[z] = (c[z] || 0) + 1 })
    return c
  }, [data.machines])
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {}
    data.machines.forEach(m => { c[m.type] = (c[m.type] || 0) + 1 })
    return c
  }, [data.machines])

  // ─── Search highlight ───────────────────────────────────────
  const searchMatch = useMemo(() => {
    if (!searchQuery) return null
    const q = searchQuery.toLowerCase()
    return data.machines.find(m =>
      (m.code_interne || '').toLowerCase() === q || (m.nom || '').toLowerCase() === q
    ) || null
  }, [searchQuery, data.machines])

  // ─── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
          <p className="text-lg">Chargement du schéma de process...</p>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="h-dvh flex flex-col bg-gray-900 overflow-hidden">

      {/* ─── Top Bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate('/dashboard')}
                  className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 shrink-0">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white font-semibold text-base truncate">
            {isMobile ? 'Schéma Process' : 'Schéma de Process — Trisélec'}
          </h1>
          <span className="text-gray-500 text-xs shrink-0 hidden sm:inline">
            {filteredMachines.length}/{data.machines.length}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setShowSearch(!showSearch)}
                  className={`p-1.5 rounded-lg hover:bg-gray-700 ${showSearch ? 'text-blue-400' : 'text-gray-300'}`}>
            <Search size={18} />
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
                  className={`p-1.5 rounded-lg hover:bg-gray-700 ${showFilters ? 'text-blue-400' : 'text-gray-300'}`}>
            <Filter size={18} />
          </button>
          <button onClick={() => setHeatmapMode(!heatmapMode)}
                  className={`p-1.5 rounded-lg hover:bg-gray-700 ${heatmapMode ? 'text-red-400' : 'text-gray-300'}`}
                  title="Heatmap pannes">
            <Thermometer size={18} />
          </button>
          <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300">
            <ZoomOut size={18} />
          </button>
          <span className="text-gray-500 text-[10px] w-10 text-center hidden sm:inline">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300">
            <ZoomIn size={18} />
          </button>
          <button onClick={fitAll} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* ─── Search bar ───────────────────────────────────────── */}
      {showSearch && (
        <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0 z-20">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher (code, nom)..."
              className="w-full pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Filter panel (slide-down on mobile, sidebar on desktop) ── */}
      {showFilters && (
        <div className={`${isMobile ? '' : 'absolute left-0 top-[52px] z-20'} bg-gray-800 border-b border-gray-700
                          ${isMobile ? 'shrink-0' : 'w-60 rounded-br-lg shadow-xl'}`}>
          <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
            {/* Étage */}
            <div>
              <h3 className="text-gray-400 text-[10px] font-bold uppercase mb-1.5 flex items-center gap-1">
                <Layers size={12} /> Étage
              </h3>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setSelectedEtage(null)}
                        className={`px-2.5 py-1 rounded-md text-xs ${selectedEtage === null ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                  Tous
                </button>
                {[0, 1, 2].map(e => (
                  <button key={e} onClick={() => setSelectedEtage(e)}
                          className={`px-2.5 py-1 rounded-md text-xs ${selectedEtage === e ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    E{e}
                  </button>
                ))}
              </div>
            </div>

            {/* Zones */}
            <div>
              <h3 className="text-gray-400 text-[10px] font-bold uppercase mb-1.5 flex items-center gap-1">
                <MapPin size={12} /> Zones
              </h3>
              <div className="flex flex-wrap gap-1">
                {Object.entries(ZONE_DEFS).map(([key, def]) => (
                  <button key={key} onClick={() => toggleZone(key)}
                          className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 border
                            ${hiddenZones.has(key)
                              ? 'border-gray-600 text-gray-500 line-through opacity-40'
                              : 'text-gray-200'}`}
                          style={hiddenZones.has(key) ? {} : { borderColor: def.border, background: def.color + '22' }}>
                    <span className="w-2 h-2 rounded-sm" style={{ background: def.color }} />
                    {isMobile ? def.label.split(' ')[0] : def.label}
                    <span className="text-gray-500">({zoneCounts[key] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Types */}
            <div>
              <h3 className="text-gray-400 text-[10px] font-bold uppercase mb-1.5 flex items-center gap-1">
                <QrCode size={12} /> Types
              </h3>
              <div className="flex flex-wrap gap-1">
                {Object.entries(TYPE_CONFIG).map(([key, tc]) => (
                  <button key={key} onClick={() => toggleType(key)}
                          className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 border
                            ${hiddenTypes.has(key)
                              ? 'border-gray-600 text-gray-500 line-through opacity-40'
                              : 'text-gray-200 border-gray-600'}`}>
                    <span className="w-2 h-2 rounded-sm" style={{ background: tc.color }} />
                    {tc.label}
                    <span className="text-gray-500">({typeCounts[key] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            <button onClick={resetView}
                    className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* ─── Main canvas: image + hotspots ──────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-950 touch-none select-none"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transform container: zoom + pan */}
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            willChange: 'transform',
          }}
        >
          {/* The process image */}
          <img
            src="/process2.jpg"
            alt="Schéma de process Trisélec"
            className="block max-w-none"
            style={{ width: imgLoaded ? '100vw' : undefined, height: 'auto' }}
            onLoad={handleImgLoad}
            draggable={false}
          />

          {/* Hotspots layer (same size as image, positioned on top) */}
          {imgLoaded && (
            <div
              className="absolute inset-0"
              style={{ pointerEvents: 'none' }}
            >
              {/* ─── Heatmap zone overlays ────────────────────────── */}
              {heatmapMode && heatmapData && Object.entries(heatmapData.zones).map(([zoneKey, zoneData]) => {
                const bounds = ZONE_BOUNDS[zoneKey]
                if (!bounds) return null
                const count = zoneData.open_pannes + zoneData.recent_pannes
                return (
                  <div
                    key={zoneKey}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: `${bounds.x1}%`,
                      top: `${bounds.y1}%`,
                      width: `${bounds.x2 - bounds.x1}%`,
                      height: `${bounds.y2 - bounds.y1}%`,
                      background: getHeatmapColor(count),
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      className="font-bold text-lg drop-shadow-lg"
                      style={{ color: getHeatmapTextColor(count), textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
                    >
                      {count}
                    </span>
                  </div>
                )
              })}

              {data.machines.map(m => {
                if (!m.pos_x || !m.pos_y) return null
                if (!visibleIds.has(m.id)) return null

                const left = toPctX(m.pos_x)
                const top = toPctY(m.pos_y)
                const isHovered = hoveredId === m.id
                const isSearch = searchMatch?.id === m.id
                const tc = TYPE_CONFIG[m.type]
                const sc = STATUT_DOT[m.statut] || '#6b7280'
                const size = isHovered || isSearch ? HOTSPOT_PX + 8 : HOTSPOT_PX

                return (
                  <div
                    key={m.id}
                    data-hotspot="true"
                    className="absolute group"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => { e.stopPropagation(); setSelectedMachine(m) }}
                    onMouseEnter={() => setHoveredId(m.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Pulse ring for search match */}
                    {isSearch && (
                      <div className="absolute inset-0 rounded-full animate-ping bg-yellow-400 opacity-40"
                           style={{ width: size + 12, height: size + 12, margin: -(size + 12 - size) / 2 }} />
                    )}

                    {/* Pulsing red ring in heatmap mode for machines with open pannes */}
                    {heatmapMode && heatmapMachineMap.get(m.id)?.panne_count ? (
                      <div className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-60"
                           style={{ width: size + 14, height: size + 14, margin: -(size + 14 - size) / 2 }} />
                    ) : null}

                    {/* Hotspot dot */}
                    <div
                      className="rounded-full border-2 flex items-center justify-center transition-all duration-150"
                      style={{
                        width: size,
                        height: size,
                        borderColor: isHovered ? '#60a5fa' : (heatmapMode && heatmapMachineMap.get(m.id)?.panne_count) ? '#ef4444' : sc,
                        background: (isHovered || isSearch) ? (tc?.color || '#60a5fa') + 'cc' : (heatmapMode && heatmapMachineMap.get(m.id)?.panne_count) ? '#ef444488' : sc + '88',
                        boxShadow: (isHovered || isSearch) ? `0 0 12px ${tc?.color || '#60a5fa'}66` :
                                   (heatmapMode && heatmapMachineMap.get(m.id)?.panne_count) ? '0 0 10px rgba(239,68,68,0.5)' : 'none',
                      }}
                    >
                      {/* Type icon letter */}
                      <span className="text-white font-bold"
                            style={{ fontSize: isHovered ? 11 : 9, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                        {m.type === 'convoyeur' ? 'C' :
                         m.type === 'broyeur' ? 'B' :
                         m.type === 'automate' ? 'A' :
                         m.type === 'deverseur' ? 'D' :
                         m.type === 'crible' ? 'Cr' : '?'}
                      </span>
                    </div>

                    {/* Desktop tooltip on hover */}
                    {!isMobile && isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-xl pointer-events-none">
                        <div className="text-white font-bold text-sm">{m.code_interne || m.nom}</div>
                        <div className="text-gray-400 text-xs">
                          {tc?.label || m.type} · {m.zone}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: sc }}>
                          {m.statut}
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Zoom indicator (bottom-left) */}
        <div className="absolute bottom-3 left-3 bg-gray-800/80 rounded-lg px-2 py-1 text-gray-400 text-xs backdrop-blur-sm">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* ─── Mobile bottom sheet ──────────────────────────────── */}
      {isMobile && selectedMachine && (
        <div className="fixed inset-0 z-40" onClick={() => setSelectedMachine(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 pt-3 pb-2 px-4 border-b border-gray-700">
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">
                  {selectedMachine.code_interne || selectedMachine.nom}
                </h2>
                <button onClick={() => setSelectedMachine(null)} className="text-gray-400 p-1">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full"
                      style={{ background: STATUT_DOT[selectedMachine.statut] || '#6b7280' }} />
                <span className="text-sm capitalize" style={{ color: STATUT_DOT[selectedMachine.statut] || '#6b7280' }}>
                  {selectedMachine.statut}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="text-white font-medium">{TYPE_CONFIG[selectedMachine.type]?.label || selectedMachine.type}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Zone</div>
                  <div className="text-white font-medium">{selectedMachine.zone || '—'}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Étage</div>
                  <div className="text-white font-medium">Étage {selectedMachine.etage}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Ligne</div>
                  <div className="text-white font-medium text-xs">{selectedMachine.ligne || '—'}</div>
                </div>
              </div>
              <button onClick={() => goToMachine(selectedMachine)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold transition-colors">
                Voir la fiche complète
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Desktop detail panel ────────────────────────────── */}
      {!isMobile && selectedMachine && (
        <div className="absolute right-0 top-[52px] bottom-0 w-80 bg-gray-800 border-l border-gray-700 z-20 overflow-y-auto shadow-2xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Détail Équipement</h3>
              <button onClick={() => setSelectedMachine(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">{selectedMachine.code_interne || selectedMachine.nom}</div>
                <div className="text-sm text-gray-400">{selectedMachine.modele || ''}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-700/30 rounded-lg p-2">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="text-white font-medium">{TYPE_CONFIG[selectedMachine.type]?.label || selectedMachine.type}</div>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-2">
                  <div className="text-gray-500 text-xs">Zone</div>
                  <div className="text-white font-medium">{selectedMachine.zone || '—'}</div>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-2">
                  <div className="text-gray-500 text-xs">Étage</div>
                  <div className="text-white font-medium">Étage {selectedMachine.etage}</div>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-2">
                  <div className="text-gray-500 text-xs">Ligne</div>
                  <div className="text-white font-medium text-xs">{selectedMachine.ligne || '—'}</div>
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">Statut</div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full"
                        style={{ background: STATUT_DOT[selectedMachine.statut] || '#6b7280' }} />
                  <span className="text-white font-medium capitalize">{selectedMachine.statut}</span>
                </div>
              </div>
              <button onClick={() => goToMachine(selectedMachine)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm">
                Voir la fiche complète
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mobile legend bar (bottom) ──────────────────────── */}
      {isMobile && (
        <div className="flex items-center justify-center gap-3 px-2 py-1.5 bg-gray-800 border-t border-gray-700 shrink-0 overflow-x-auto">
          {Object.entries(TYPE_CONFIG).map(([key, tc]) => (
            <div key={key} className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: tc.color }} />
              <span className="text-gray-400 text-[10px]">{tc.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}