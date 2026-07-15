import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Wrench, AlertTriangle, ClipboardList,
  Package, Search, LogOut, Users, BarChart2, RefreshCw, Factory,
  Map, BookOpen, ChevronDown
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

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
                {user?.role === 'admin' ? 'Administrateur' : user?.role === 'manager' ? 'Manager' : 'Technicien'}
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