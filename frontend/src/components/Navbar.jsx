import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, LayoutDashboard, BookOpen,
  LogOut, FolderDown, Award, MessagesSquare, Menu, X, Settings, UserRound,
} from 'lucide-react'
import DarLogo from './DarLogo'
import { useUser, initials } from '../UserContext'
import { useMessages } from '../MessagesContext'
import { useAuth } from '../AuthContext'
import ConfirmModal from './ConfirmModal'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { unreadTotal } = useMessages()
  const { signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)         // mobile menu
  const [settingsOpen, setSettingsOpen] = useState(false) // desktop gear dropdown
  const [confirmOut, setConfirmOut] = useState(false)
  const settingsRef = useRef(null)

  // Close menus on navigation.
  useEffect(() => { setMenuOpen(false); setSettingsOpen(false) }, [location.pathname])

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Close the settings dropdown on outside click.
  useEffect(() => {
    if (!settingsOpen) return
    const onDoc = e => { if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [settingsOpen])

  const linkClass = ({ isActive }) => `nb-link${isActive ? ' active' : ''}`
  const mLinkClass = ({ isActive }) => `nbm-link${isActive ? ' active' : ''}`

  const UserChip = ({ big }) => (
    <>
      <span className={`nb-avatar${big ? ' lg' : ''}`}>{initials(user.name)}</span>
      <span className="nb-user-info">
        <span className="nb-user-name">{user.name}</span>
        <span className="nb-user-role">{user.division} Division</span>
      </span>
    </>
  )

  return (
    <>
      <header className="navbar">
        <div className="nb-inner">
          {/* Brand */}
          <button className="nb-brand" onClick={() => navigate('/')}>
            <span className="nb-logo"><DarLogo size={28} /></span>
            <span className="nb-brand-text">
              <span className="nb-brand-title">TARUNGA</span>
              <span className="nb-brand-sub">DAR Online CapDev · Newly Hired Employees</span>
            </span>
          </button>

          {/* Desktop links */}
          <nav className="nb-links">
            <NavLink to="/" end className={linkClass}><Home size={17} /><span>Home</span></NavLink>
            <NavLink to="/dashboard" className={linkClass}><LayoutDashboard size={17} /><span>Dashboard</span></NavLink>

            <NavLink to="/courses" className={linkClass}><BookOpen size={17} /><span>Courses</span></NavLink>
            <NavLink to="/resources" className={linkClass}><FolderDown size={17} /><span>Resources</span></NavLink>
            <NavLink to="/certificates" className={linkClass}><Award size={17} /><span>Certificates</span></NavLink>
            <NavLink to="/messages" className={linkClass}>
              <MessagesSquare size={17} /><span>Co-pilot</span>
              {unreadTotal > 0 && <span className="nb-badge">{unreadTotal}</span>}
            </NavLink>
          </nav>

          {/* Right cluster (desktop) — gear dropdown: Profile + Sign Out */}
          <div className="nb-right">
            <div className="nb-settings-wrap" ref={settingsRef}>
              <button
                className={`nb-gear${settingsOpen ? ' open' : ''}`}
                onClick={() => setSettingsOpen(o => !o)}
                aria-label="Settings"
                aria-expanded={settingsOpen}
                title="Settings"
              >
                <Settings size={19} />
              </button>
              {settingsOpen && (
                <div className="nb-settings-menu">
                  <div className="nb-settings-head">
                    <span className="nb-avatar">{initials(user.name)}</span>
                    <div className="nb-settings-id">
                      <span className="nb-settings-name">{user.name}</span>
                      <span className="nb-settings-role">{user.division} Division</span>
                    </div>
                  </div>
                  <button className="nb-settings-item" onClick={() => { setSettingsOpen(false); navigate('/profile') }}>
                    <UserRound size={16} /> Profile
                  </button>
                  <button className="nb-settings-item danger" onClick={() => { setSettingsOpen(false); setConfirmOut(true) }}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button className="nb-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && <div className="nb-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <div className={`nb-mobile${menuOpen ? ' open' : ''}`}>
        <button className="nbm-user" onClick={() => navigate('/profile')}>
          <UserChip big />
          <Settings size={16} className="nbm-gear" />
        </button>

        <nav className="nb-mobile-links">
          <NavLink to="/" end className={mLinkClass}><Home size={18} /> Home</NavLink>
          <NavLink to="/dashboard" className={mLinkClass}><LayoutDashboard size={18} /> Dashboard</NavLink>
          <NavLink to="/courses" className={mLinkClass}><BookOpen size={18} /> Courses</NavLink>
          <NavLink to="/resources" className={mLinkClass}><FolderDown size={18} /> Resource Materials</NavLink>
          <NavLink to="/certificates" className={mLinkClass}><Award size={18} /> Certificates</NavLink>
          <NavLink to="/messages" className={mLinkClass}>
            <MessagesSquare size={18} /> Co-pilot
            {unreadTotal > 0 && <span className="nb-badge">{unreadTotal}</span>}
          </NavLink>
        </nav>

        <button className="nbm-signout" onClick={() => setConfirmOut(true)}><LogOut size={18} /> Sign Out</button>
      </div>

      {confirmOut && (
        <ConfirmModal
          icon={LogOut}
          title="Sign out?"
          message="You'll need to sign in again to access your account."
          confirmLabel="Sign Out"
          cancelLabel="Cancel"
          danger
          onConfirm={() => signOut()}
          onCancel={() => setConfirmOut(false)}
        />
      )}
    </>
  )
}
