import { useState, useEffect } from 'react'
import {
  LayoutDashboard, LineChart, LogOut, Megaphone,
  Users, BookOpen, BarChart3, Award, ArrowRight, Sparkles, CheckCircle2, MessageSquare,
  Menu, X,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { MessagesProvider } from '../MessagesContext'
import { CallProvider } from '../CallContext'
import { MOCK_EMPLOYEES } from '../mockData'
import DarLogo from '../components/DarLogo'
import ConfirmModal from '../components/ConfirmModal'
import AdminCourses from './AdminCourses'
import AdminAnalytics from './AdminAnalytics'
import AdminAnnouncements from './AdminAnnouncements'
import AdminUsers from './AdminUsers'
import Messages from './Messages'
import './AdminDashboard.css'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

const NAV = [
  { id: 'dashboard',     label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'analytics',     label: 'Analytics',        icon: LineChart },
  { id: 'courses',       label: 'Session Management', icon: BookOpen },
  { id: 'users',         label: 'User Management',  icon: Users },
  { id: 'messages',      label: 'Messages',         icon: MessageSquare },
  { id: 'announcements', label: 'Announcements',    icon: Megaphone },
]

export default function AdminDashboard() {
  return (
    <MessagesProvider>
      <CallProvider>
        <AdminConsole />
      </CallProvider>
    </MessagesProvider>
  )
}

function AdminConsole() {
  const { signOut } = useAuth()
  const [view, setView] = useState('dashboard')
  const [confirmOut, setConfirmOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const go = id => { setView(id); setMobileOpen(false) }
  const activeLabel = (NAV.find(n => n.id === view) || {}).label || 'Admin Console'

  return (
    <div className={`admin-app${mobileOpen ? ' is-mobile-open' : ''}`}>
      {/* Sidebar (drawer on mobile) */}
      <aside className="admin-sidebar">
        <div className="admin-side-brand">
          <div className="admin-logo"><DarLogo size={26} /></div>
          <div className="admin-side-text">
            <span className="admin-side-title">Admin Console</span>
            <span className="admin-side-sub">CapDev Admin</span>
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
            </button>
          ))}
        </nav>

        <button className="admin-nav-item admin-signout" onClick={() => setConfirmOut(true)}>
          <LogOut size={18} /> <span>Sign out</span>
        </button>
      </aside>

      {/* Scrim behind the mobile drawer */}
      <div className="admin-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />

      {/* Main column */}
      <div className="admin-main">
        {/* Mobile top bar with hamburger */}
        <header className="admin-topbar">
          <button className="admin-burger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="admin-topbar-brand">
            <span>{activeLabel}</span>
          </div>
        </header>

        <div className="admin-content">
          {view === 'dashboard' && <Overview onNavigate={setView} />}
          {view === 'analytics' && <AdminAnalytics />}
          {view === 'courses' && <AdminCourses />}
          {view === 'users' && <AdminUsers />}
          {view === 'messages' && <Messages />}
          {view === 'announcements' && <AdminAnnouncements />}
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

/* ── Dashboard overview ── */
const dashInitials = name =>
  name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

const ACTIVITY = [
  { name: 'Maria Santos', text: 'completed', target: 'PBD Session 2 · Post-Test', badge: '90%', time: '2h ago' },
  { name: 'Carlos Villanueva', text: 'completed', target: 'LTS Session 2 · Post-Test', badge: '88%', time: '4h ago' },
  { name: 'Mark Bautista', text: 'started', target: 'AJD Session 1', time: '6h ago' },
  { name: 'Grace Lim', text: 'completed', target: 'PBD Session 3 · Pre-Test', badge: '75%', time: 'Yesterday' },
  { name: 'Ana Mendoza', text: 'started', target: 'AJD Session 2', time: 'Yesterday' },
]

function Overview({ onNavigate }) {
  const employees = MOCK_EMPLOYEES
  const totalEmployees = employees.length
  const certsIssued = employees.reduce((s, e) => s + e.completed, 0)
  const avgCompletion = Math.round(employees.reduce((s, e) => s + e.progress, 0) / totalEmployees)

  const stats = [
    { icon: Users, value: totalEmployees, label: 'Enrolled Employees', tone: 'dt-green' },
    { icon: BookOpen, value: 9, label: 'Active Modules', tone: 'dt-blue' },
    { icon: BarChart3, value: `${avgCompletion}%`, label: 'Avg. Completion', tone: 'dt-amber' },
    { icon: Award, value: certsIssued, label: 'Certificates Issued', tone: 'dt-purple' },
  ]

  const byDivision = DIVISIONS.map(d => {
    const list = employees.filter(e => e.division === d)
    const avg = list.length ? Math.round(list.reduce((s, e) => s + e.progress, 0) / list.length) : 0
    return { division: d, count: list.length, avg }
  })

  return (
    <div className="dash">
      {/* Banner */}
      <div className="dash-banner">
        <div className="dash-banner-glow" />
        <div className="dash-banner-text">
          <h2>Welcome back, Admin <Sparkles size={18} /></h2>
          <p>{totalEmployees} employees enrolled · {avgCompletion}% average completion across {byDivision.length} divisions.</p>
          <button className="dash-banner-btn" onClick={() => onNavigate('courses')}>
            Manage Sessions <ArrowRight size={15} />
          </button>
        </div>
        <svg className="dash-banner-art" viewBox="0 0 200 130" aria-hidden="true">
          <circle cx="150" cy="44" r="44" fill="rgba(255,255,255,0.10)" />
          <rect x="100" y="74" width="16" height="34" rx="4" fill="rgba(255,255,255,0.35)" />
          <rect x="124" y="58" width="16" height="50" rx="4" fill="rgba(255,255,255,0.55)" />
          <rect x="148" y="42" width="16" height="66" rx="4" fill="#bbf7d0" />
          <rect x="172" y="64" width="16" height="44" rx="4" fill="rgba(255,255,255,0.35)" />
        </svg>
      </div>

      {/* Stat tiles */}
      <div className="dash-stats">
        {stats.map(({ icon: Icon, value, label, tone }) => (
          <div key={label} className="dash-card dash-tile">
            <div className={`dash-ic ${tone}`}><Icon size={20} /></div>
            <div>
              <p className="dash-tile-value">{value}</p>
              <p className="dash-tile-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-row">
        {/* Completion by division */}
        <div className="dash-card">
          <div className="dash-card-hd">
            <div><h2 className="dash-card-title">Completion by Division</h2><p className="dash-card-sub">Average employee progress</p></div>
          </div>
          <div className="dash-card-body dash-divs">
            {byDivision.map(d => (
              <div key={d.division} className="dash-div-row">
                <span className="dash-div-name">{d.division}</span>
                <div className="dash-div-track"><div className="dash-div-fill" style={{ width: `${d.avg}%` }} /></div>
                <span className="dash-div-pct">{d.avg}%</span>
                <span className="dash-div-count">{d.count} ppl</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="dash-card">
          <div className="dash-card-hd">
            <div><h2 className="dash-card-title">Quick Actions</h2><p className="dash-card-sub">Jump to a task</p></div>
          </div>
          <div className="dash-card-body dash-actions">
            <button className="dash-action" onClick={() => onNavigate('courses')}>
              <span className="dash-ic dt-green"><BookOpen size={18} /></span>
              <span className="dash-action-text"><b>Manage Sessions</b><small>Content, exams & tasks</small></span>
              <ArrowRight size={16} />
            </button>
            <button className="dash-action" onClick={() => onNavigate('analytics')}>
              <span className="dash-ic dt-blue"><LineChart size={18} /></span>
              <span className="dash-action-text"><b>View Analytics</b><small>Performance insights</small></span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="dash-card">
        <div className="dash-card-hd">
          <div><h2 className="dash-card-title">Recent Activity</h2><p className="dash-card-sub">Latest learner actions</p></div>
        </div>
        <div className="dash-card-body dash-feed">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="dash-feed-row">
              <div className="dash-feed-avatar">{dashInitials(a.name)}</div>
              <p className="dash-feed-text">
                <b>{a.name}</b> {a.text} <span className="dash-feed-target">{a.target}</span>
              </p>
              {a.badge && <span className="dash-feed-badge"><CheckCircle2 size={12} /> {a.badge}</span>}
              <span className="dash-feed-time">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
