import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Wrench, AlertTriangle, ClipboardList,
  Package, Search, LogOut, Users, BarChart2, RefreshCw, Factory,
  Map, BookOpen, ChevronDown, QrCode, MoreHorizontal, Menu,
  Calendar, X, Shield
} from 'lucide-react'
import NotificationBell from './NotificationBell'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/schema', label: 'Schéma Interactif', icon: Map },
  { to: '/base-connaissances', label: 'Base Connaissances', icon: BookOpen },
  { to: '/lignes', label: 'Lignes & Process', icon: Factory },
  { to: '/machines', label: 'Machines', icon: Wrench },
  { to: '/pannes', label: 'Pannes', icon: AlertTriangle },
  { to: '/interventions', label: 'Bons de Travail', icon: ClipboardList },
  { to: '/pieces', label: 'Pièces', icon: Package },
  { to: '/maintenance-preventive', label: 'Prévention', icon: RefreshCw },
  { to: '/recherche', label: 'Recherche', icon: Search },
]

const roleColors: Record<string, string> = {
  admin: 'text-purple-400',
  manager: 'text-blue-400',
  technicien: 'text-gray-400',
}

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  technicien: 'Technicien',
}

// ─── Bottom nav tabs (5 primary items) ─────────────────────────────
const bottomNavTabs = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/schema', label: 'Schéma', icon: Map },
  { to: '/equipement', label: 'Scanner QR', icon: QrCode },
  { to: '/pannes', label: 'Pannes', icon: AlertTriangle },
  { to: 'more', label: 'Plus', icon: MoreHorizontal },
]

// ─── "Plus" drawer items ──────────────────────────────────────────
const moreMenuItems = [
  { to: '/base-connaissances', label: 'Base Connaissances', icon: BookOpen },
  { to: '/lignes', label: 'Lignes & Process', icon: Factory },
  { to: '/machines', label: 'Machines', icon: Wrench },
  { to: '/interventions', label: 'Bons de Travail', icon: ClipboardList },
  { to: '/pieces', label: 'Pièces', icon: Package },
  { to: '/maintenance-preventive', label: 'Prévention', icon: RefreshCw },
  { to: '/maintenance-preventive/calendar', label: 'Calendrier', icon: Calendar },
  { to: '/recherche', label: 'Recherche', icon: Search },
  { to: '/dashboard-superviseur', label: 'Dashboard Superviseur', icon: LayoutDashboard },
  { to: '/quick-panne', label: 'Signaler Panne', icon: AlertTriangle },
]

const adminMenuItems = [
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/activite', label: "Journal d'activité", icon: BarChart2 },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // ─── Mobile detection ────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => setIsMobile(window.innerWidth < 768), 100)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeout)
    }
  }, [])

  // ─── Plus drawer state ───────────────────────────────────────
  const [plusDrawerOpen, setPlusDrawerOpen] = useState(false)

  const openPlusDrawer = useCallback(() => setPlusDrawerOpen(true), [])
  const closePlusDrawer = useCallback(() => setPlusDrawerOpen(false), [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // ─── Determine if a bottom tab is active ────────────────────
  const isTabActive = (tab: typeof bottomNavTabs[0]) => {
    if (tab.to === 'more') return false
    if (tab.exact) return location.pathname === tab.to
    return location.pathname.startsWith(tab.to)
  }

  // ═══════════════════════════════════════════════════════════
  //  MOBILE LAYOUT
  // ═══════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden">
        {/* ─── Top Header Bar ────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-gray-800 border-b border-gray-700 z-50 flex items-center justify-between px-3 shrink-0">
          {/* Left: hamburger / menu */}
          <button
            onClick={openPlusDrawer}
            className="flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 active:bg-gray-600 transition-colors"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>

          {/* Center: title + role badge */}
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-base">TriMaint</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              user?.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
              user?.role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {roleLabels[user?.role || ''] || user?.role}
            </span>
          </div>

          {/* Right: notification bell */}
          <div className="w-10 h-10 flex items-center justify-center -mr-1">
            <NotificationBell isMobile={true} />
          </div>
        </header>

        {/* ─── Main content area ────────────────────────────── */}
        <main className="flex-1 overflow-auto pt-14 pb-20">
          <Outlet />
        </main>

        {/* ─── Bottom Navigation Bar ────────────────────────── */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-gray-800 border-t border-gray-700 z-50 flex items-center justify-around px-1">
          {bottomNavTabs.map(tab => {
            const Icon = tab.icon
            const active = tab.to === 'more' ? false : isTabActive(tab)

            if (tab.to === 'more') {
              return (
                <button
                  key="more"
                  onClick={openPlusDrawer}
                  className="flex flex-col items-center justify-center w-16 h-12 rounded-lg text-gray-400 hover:text-white active:bg-gray-700 transition-colors"
                >
                  <Icon size={20} strokeWidth={2} />
                  <span className="text-[10px] mt-0.5 leading-tight">Plus</span>
                </button>
              )
            }

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.exact}
                className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors ${
                  active
                    ? 'text-orange-500'
                    : 'text-gray-400 hover:text-white active:bg-gray-700'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] mt-0.5 leading-tight ${active ? 'font-semibold' : ''}`}>
                  {tab.label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* ─── "Plus" Drawer (bottom sheet) ─────────────────── */}
        {plusDrawerOpen && (
          <div className="fixed inset-0 z-[60]" onClick={closePlusDrawer}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 transition-opacity" />

            {/* Bottom sheet */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="sticky top-0 bg-gray-800 pt-3 pb-2 px-4 border-b border-gray-700 z-10">
                <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-bold text-base">Menu</h2>
                  <button
                    onClick={closePlusDrawer}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-1">
                {/* Regular menu items */}
                {moreMenuItems.map(item => {
                  const Icon = item.icon
                  const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                  return (
                    <button
                      key={item.to}
                      onClick={() => {
                        closePlusDrawer()
                        navigate(item.to)
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[52px] ${
                        active
                          ? 'bg-orange-500/15 text-orange-400'
                          : 'text-gray-300 hover:bg-gray-700/60 active:bg-gray-700'
                      }`}
                    >
                      <Icon size={20} className="shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}

                {/* Admin section */}
                {user?.role === 'admin' && (
                  <>
                    <div className="pt-3 mt-2 border-t border-gray-700">
                      <p className="px-4 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield size={11} />
                        Administration
                      </p>
                    </div>
                    {adminMenuItems.map(item => {
                      const Icon = item.icon
                      const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                      return (
                        <button
                          key={item.to}
                          onClick={() => {
                            closePlusDrawer()
                            navigate(item.to)
                          }}
                          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[52px] ${
                            active
                              ? 'bg-orange-500/15 text-orange-400'
                              : 'text-gray-300 hover:bg-gray-700/60 active:bg-gray-700'
                          }`}
                        >
                          <Icon size={20} className="shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Logout at the bottom */}
                <div className="pt-3 mt-2 border-t border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors min-h-[52px]"
                  >
                    <LogOut size={20} className="shrink-0" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>

              {/* Bottom safe area */}
              <div className="h-6" />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  //  DESKTOP LAYOUT (unchanged)
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">

        {/* Logo */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <Wrench size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">TriMaint</h1>
              <p className="text-xs text-gray-400">GMAO Triselec</p>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Section admin */}
          {user?.role === 'admin' && (
            <div className="pt-3 mt-3 border-t border-gray-700">
              <p className="px-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </p>
              <NavLink
                to="/utilisateurs"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`
                }
              >
                <Users size={18} />
                Utilisateurs
              </NavLink>
              <NavLink
                to="/activite"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`
                }
              >
                <BarChart2 size={18} />
                Journal d'activité
              </NavLink>
            </div>
          )}
        </nav>

        {/* Pied de sidebar */}
        <div className="px-3 py-4 border-t border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-gray-700/40 rounded-lg">
            <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-orange-400">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className={`text-xs capitalize font-medium ${roleColors[user?.role || ''] || 'text-gray-400'}`}>
                {roleLabels[user?.role || ''] || user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}