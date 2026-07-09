import { useState, useEffect } from 'react'
import { MessageSquare, CalendarDays, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { MessagesProvider } from '../MessagesContext'
import { CallProvider } from '../CallContext'
import { getAdminBookings } from '../calendarStore'
import DarLogo from '../components/DarLogo'
import ConfirmModal from '../components/ConfirmModal'
import AdminCalendar from './AdminCalendar'
import Messages from './Messages'
import './AdminDashboard.css'

const NAV = [
  { id: 'messages', label: 'Messages',    icon: MessageSquare },
  { id: 'calendar', label: 'My Calendar', icon: CalendarDays },
]

// Minutes-since-midnight for a slot label like "1:30 PM".
const slotMinutes = slot => {
  const m = (slot || '').match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = parseInt(m[1], 10) % 12
  if (/PM/i.test(m[3])) h += 12
  return h * 60 + parseInt(m[2], 10)
}
const isUpcoming = b => {
  const [y, mo, d] = b.meet_date.split('-').map(Number)
  const dt = new Date(y, mo - 1, d)
  const mins = slotMinutes(b.slot)
  dt.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
  return dt.getTime() >= Date.now()
}

export default function CopilotDashboard() {
  return (
    <MessagesProvider>
      <CallProvider>
        <CopilotConsole />
      </CallProvider>
    </MessagesProvider>
  )
}

function CopilotConsole() {
  const { signOut, session } = useAuth()
  const me = session?.user?.id
  const [view, setView] = useState('messages')
  const [confirmOut, setConfirmOut] = useState(false)
  const [upcoming, setUpcoming] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  const go = id => { setView(id); setMobileOpen(false) }
  const activeLabel = (NAV.find(n => n.id === view) || {}).label || 'Co-Pilot Console'

  useEffect(() => {
    if (!me) return
    let active = true
    getAdminBookings(me).then(books => {
      if (active) setUpcoming(books.filter(isUpcoming).length)
    })
    return () => { active = false }
  }, [me, view])

  return (
    <div className={`admin-app${mobileOpen ? ' is-mobile-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-side-brand">
          <div className="admin-logo"><DarLogo size={26} /></div>
          <div className="admin-side-text">
            <span className="admin-side-title">Co-Pilot Console</span>
            <span className="admin-side-sub">Customer Support</span>
          </div>
          <button className="admin-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`admin-nav-item${view === id ? ' active' : ''}`}
              onClick={() => go(id)}
            >
              <Icon size={18} /> <span>{label}</span>
              {id === 'calendar' && upcoming > 0 && <span className="admin-nav-badge">{upcoming}</span>}
            </button>
          ))}
        </nav>

        <button className="admin-nav-item admin-signout" onClick={() => setConfirmOut(true)}>
          <LogOut size={18} /> <span>Sign out</span>
        </button>
      </aside>

      <div className="admin-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-burger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="admin-topbar-brand">
            <span>{activeLabel}</span>
          </div>
        </header>

        <div className="admin-content">
          {view === 'messages' && <Messages />}
          {view === 'calendar' && <AdminCalendar />}
        </div>
      </div>

      {confirmOut && (
        <ConfirmModal
          icon={LogOut}
          title="Sign out?"
          message="You'll return to the login screen."
          confirmLabel="Sign Out"
          cancelLabel="Cancel"
          danger
          onConfirm={signOut}
          onCancel={() => setConfirmOut(false)}
        />
      )}
    </div>
  )
}
