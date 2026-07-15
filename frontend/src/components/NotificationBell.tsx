import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Check, CheckCheck, AlertTriangle, ClipboardList, Wrench } from 'lucide-react'
import { useNotifications, Notification } from '../hooks/useNotifications'

const typeStyles: Record<string, string> = {
  critique: 'border-l-red-500 bg-red-900/10',
  majeure:  'border-l-orange-500 bg-orange-900/10',
  info:     'border-l-blue-500 bg-blue-900/10',
}
const typeBadge: Record<string, string> = {
  critique: 'bg-red-900/60 text-red-300 border-red-700',
  majeure:  'bg-orange-900/60 text-orange-300 border-orange-700',
  info:     'bg-blue-900/60 text-blue-300 border-blue-700',
}
const entityIcon: Record<string, React.ElementType> = {
  panne:        AlertTriangle,
  intervention: ClipboardList,
  machine:      Wrench,
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const {
    unreadCount, notifications, panelOpen, loading,
    openPanel, closePanel, markRead, markAllRead, canReceive,
  } = useNotifications()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelOpen) return
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel()
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [panelOpen, closePanel])

  if (!canReceive) return null

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.is_read) await markRead(notif.id)
    if (notif.entity_type === 'panne' && notif.entity_id) {
      navigate('/pannes')
    } else if (notif.entity_type === 'intervention' && notif.entity_id) {
      navigate('/interventions')
    }
    closePanel()
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bouton cloche */}
      <button
        onClick={panelOpen ? closePanel : openPanel}
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
          panelOpen
            ? 'bg-orange-500 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
        title="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau déroulant */}
      {panelOpen && (
        <div className="absolute left-0 bottom-12 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-orange-400" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-gray-400 hover:text-orange-400 transition-colors flex items-center gap-1"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck size={13} />
                  Tout lire
                </button>
              )}
              <button onClick={closePanel} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => {
                const EntityIcon = entityIcon[notif.entity_type || ''] || Bell
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex items-start gap-3 px-4 py-3 border-l-2 cursor-pointer hover:bg-gray-700/40 transition-colors ${
                      typeStyles[notif.type] || 'border-l-gray-600'
                    } ${notif.is_read ? 'opacity-50' : ''}`}
                  >
                    <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      notif.type === 'critique' ? 'bg-red-900/40 text-red-400' :
                      notif.type === 'majeure' ? 'bg-orange-900/40 text-orange-400' :
                      'bg-blue-900/40 text-blue-400'
                    }`}>
                      <EntityIcon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-snug ${notif.is_read ? 'text-gray-400' : 'text-white'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <button
                            onClick={async e => { e.stopPropagation(); await markRead(notif.id) }}
                            className="shrink-0 text-gray-500 hover:text-green-400 transition-colors mt-0.5"
                            title="Marquer comme lu"
                          >
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${typeBadge[notif.type] || 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                          {notif.type === 'critique' ? 'Critique' : notif.type === 'majeure' ? 'Majeure' : 'Info'}
                        </span>
                        <span className="text-[10px] text-gray-600">{timeAgo(notif.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-700 text-center">
              <p className="text-xs text-gray-600">{notifications.length} notification{notifications.length > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
