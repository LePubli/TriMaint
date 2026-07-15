import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { QrCode, ArrowLeft, AlertTriangle, Loader2, Camera, Search, X, Clock, Wrench, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * QR Code lookup page.
 * When a technician scans a QR code on an equipment, it redirects here
 * with the equipment code (e.g. /equipement/L403).
 * Also handles trimaint://equipement/{CODE} deep links.
 *
 * Shows: equipment status (big colored indicator), last 3 pannes with
 * "Signaler" buttons, last 3 interventions, and a big red "Quick Signaler
 * Panne" button. Mobile-first with large touch targets.
 */

interface MachineData {
  id: number; nom: string; site: string | null; ligne: string | null
  zone: string | null; etage: number | null; fabricant: string | null
  modele: string | null; code_interne: string | null; statut: string
  qr_code: string | null; notes: string | null
}

interface PanneItem {
  id: number; titre: string; criticite: number; statut: string; created_at: string
}

interface InterventionItem {
  id: number; technicien: string; type_bt: string; statut: string
  date_intervention: string; validee: boolean
}

const STATUT_CONFIG: Record<string, { label: string; dotColor: string; ringColor: string; bgColor: string }> = {
  operationnel: { label: 'Opérationnel', dotColor: 'bg-green-500', ringColor: 'ring-green-500/30', bgColor: 'bg-green-500' },
  en_panne: { label: 'En panne', dotColor: 'bg-red-500', ringColor: 'ring-red-500/30', bgColor: 'bg-red-500' },
  maintenance: { label: 'Maintenance', dotColor: 'bg-yellow-500', ringColor: 'ring-yellow-500/30', bgColor: 'bg-yellow-500' },
  arret: { label: 'À l\'arrêt', dotColor: 'bg-gray-500', ringColor: 'ring-gray-500/30', bgColor: 'bg-gray-500' },
}

const CRITICITE_COLORS: Record<number, string> = {
  1: 'text-blue-400', 2: 'text-green-400', 3: 'text-yellow-400', 4: 'text-orange-400', 5: 'text-red-400',
}

const BT_STATUT_LABELS: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'text-yellow-400' },
  termine: { label: 'Terminé', color: 'text-blue-400' },
  valide: { label: 'Validé', color: 'text-green-400' },
}

export default function QrLookup() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Try to get code from deep link query param first
  const deepLinkCode = searchParams.get('code')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [machine, setMachine] = useState<MachineData | null>(null)
  const [pannes, setPannes] = useState<PanneItem[]>([])
  const [interventions, setInterventions] = useState<InterventionItem[]>([])
  const [manualCode, setManualCode] = useState('')

  // Determine which code to use
  const effectiveCode = code || deepLinkCode || null

  useEffect(() => {
    if (!effectiveCode) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    api.get(`/machines/lookup/${encodeURIComponent(effectiveCode)}`)
      .then(res => {
        const m: MachineData = res.data
        setMachine(m)
        // Fetch last 3 pannes and interventions for this machine
        Promise.all([
          api.get(`/pannes/?machine_id=${m.id}&limit=3`),
          api.get(`/interventions/?machine_id=${m.id}&limit=3`),
        ]).then(([p, i]) => {
          setPannes(p.data)
          setInterventions(i.data)
        }).catch(() => {})
      })
      .catch(() => {
        setError(`Aucun équipement trouvé avec le code "${effectiveCode}"`)
      })
      .finally(() => setLoading(false))
  }, [effectiveCode])

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    navigate(`/equipement/${encodeURIComponent(manualCode.trim())}`, { replace: true })
  }

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // On mobile, the camera capture gives us an image.
    // For QR decoding we would need a library; here we just let the user
    // type the code manually. Reset the input so they can try again.
    toast_feedback('Prenez le QR code en photo puis saisissez le code manuellement')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toast_feedback = (msg: string) => {
    // Simple visual feedback without importing toast for this lightweight page
    setError(msg)
    setTimeout(() => setError(null), 3000)
  }

  // ─── Loading state ──────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <QrCode size={48} className="mx-auto text-orange-400 mb-4 animate-pulse" />
        <p className="text-gray-400">Recherche de l'équipement...</p>
      </div>
    </div>
  )

  // ─── No code provided → show scan / search UI ───────────────────
  if (!effectiveCode && !machine) {
    return (
      <div className="h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white font-semibold text-lg">Scanner QR Code</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {/* Big camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-36 h-36 rounded-full bg-orange-500 hover:bg-orange-600 flex flex-col items-center justify-center gap-3 shadow-lg shadow-orange-500/30 transition-all active:scale-95"
          >
            <Camera size={40} className="text-white" />
            <span className="text-white text-sm font-semibold">Scanner</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileCapture}
            className="hidden"
          />

          <p className="text-gray-500 text-sm text-center">Ouvrez l'appareil photo pour scanner un QR code</p>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-xs">ou</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Manual code input */}
          <form onSubmit={handleManualSearch} className="w-full max-w-xs">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Saisir le code équipement..."
                className="w-full pl-11 pr-12 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-base focus:outline-none focus:border-orange-500 min-h-[52px]"
              />
              {manualCode && (
                <button type="button" onClick={() => setManualCode('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full mt-3 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-colors text-base min-h-[52px]"
            >
              Rechercher
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─── Error state ────────────────────────────────────────────────
  if (error || (!machine && !loading)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-6">
          <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
          <p className="text-gray-300 text-lg mb-2">{error || "Aucun équipement trouvé"}</p>
          <p className="text-gray-500 text-sm mb-6">Vérifiez le QR code ou recherchez l'équipement dans le schéma</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => navigate('/schema')}
              className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors min-h-[48px]">
              Ouvrir le schéma
            </button>
            <button onClick={() => navigate('/recherche')}
              className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors min-h-[48px]">
              Rechercher
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!machine) return null

  // ─── Equipment found → show detail card ─────────────────────────
  const statutConf = STATUT_CONFIG[machine.statut] || STATUT_CONFIG.operationnel

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-semibold text-lg flex-1 truncate">{machine.nom}</h1>
        <button
          onClick={() => navigate(`/machines/${machine.id}`)}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs transition-colors min-h-[40px]"
        >
          Détails
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* ─── Status section with BIG indicator ─────────────────── */}
        <div className="flex items-center gap-5 bg-gray-800 rounded-2xl border border-gray-700 p-5">
          {/* Large colored circle */}
          <div className={`w-24 h-24 rounded-full ${statutConf.dotColor} shadow-lg flex items-center justify-center shrink-0 ring-8 ${statutConf.ringColor}`}>
            {machine.statut === 'en_panne' && <AlertTriangle size={40} className="text-white" />}
            {machine.statut === 'operationnel' && <CheckCircle size={40} className="text-white" />}
            {machine.statut === 'maintenance' && <Wrench size={40} className="text-white" />}
            {machine.statut === 'arret' && <AlertCircle size={40} className="text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white mb-1">{machine.code_interne || machine.nom}</h2>
            <span className={`text-lg font-semibold ${statutConf.dotColor.replace('bg-', 'text-')}`}>
              {statutConf.label}
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {machine.ligne && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-lg">{machine.ligne}</span>}
              {machine.zone && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-lg">{machine.zone}</span>}
              {machine.site && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-lg">{machine.site}</span>}
            </div>
          </div>
        </div>

        {/* ─── Quick Signaler Panne button (BIG RED) ──────────────── */}
        <button
          onClick={() => navigate(`/quick-panne?machine_id=${machine.id}`)}
          className="w-full py-5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-2xl transition-colors text-lg flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 min-h-[64px]"
        >
          <AlertTriangle size={24} />
          Signaler une panne
        </button>

        {/* ─── Last 3 Pannes ──────────────────────────────────────── */}
        <div>
          <h3 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-400" />
            Dernières pannes
            <span className="text-xs text-gray-500 font-normal">({pannes.length})</span>
          </h3>
          {pannes.length === 0 ? (
            <p className="text-gray-600 text-sm italic py-3">Aucune panne enregistrée</p>
          ) : (
            <div className="space-y-2">
              {pannes.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-gray-800 rounded-xl border border-gray-700 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.titre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold ${CRITICITE_COLORS[p.criticite] || 'text-gray-400'}`}>
                        Criticité {p.criticite}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/pannes/${p.id}`)}
                    className="shrink-0 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-colors min-h-[40px]"
                  >
                    Voir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Last 3 Interventions ───────────────────────────────── */}
        <div>
          <h3 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <Wrench size={16} className="text-blue-400" />
            Dernières interventions
            <span className="text-xs text-gray-500 font-normal">({interventions.length})</span>
          </h3>
          {interventions.length === 0 ? (
            <p className="text-gray-600 text-sm italic py-3">Aucune intervention enregistrée</p>
          ) : (
            <div className="space-y-2">
              {interventions.map(i => {
                const sConf = BT_STATUT_LABELS[i.statut] || BT_STATUT_LABELS.en_cours
                return (
                  <div key={i.id} className="flex items-center gap-3 bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      i.statut === 'valide' ? 'bg-green-900/50 text-green-400' :
                      i.statut === 'termine' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-yellow-900/50 text-yellow-400'
                    }`}>
                      {i.statut === 'valide' ? <CheckCircle size={18} /> :
                       i.statut === 'termine' ? <CheckCircle size={18} /> :
                       <Clock size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{i.technicien}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{i.type_bt} — {new Date(i.date_intervention).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${sConf.color}`}>
                      {sConf.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom spacer for mobile scrolling */}
        <div className="h-4" />
      </div>
    </div>
  )
}