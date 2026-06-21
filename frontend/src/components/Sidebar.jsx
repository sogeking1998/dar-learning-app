import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, LayoutDashboard, BookOpen, ChevronDown, ChevronRight,
  ChevronLeft, GraduationCap, BookMarked, LogOut,
  FolderDown, Award, Settings, X, MessageSquare
} from 'lucide-react'
import DarLogo from './DarLogo'
import { useUser, initials } from '../UserContext'
import { useMessages } from '../MessagesContext'
import { useAuth } from '../AuthContext'
import ConfirmModal from './ConfirmModal'
import './Sidebar.css'

export default function Sidebar({ collapsed = false, onToggleCollapse, onCloseMobile }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { unreadTotal } = useMessages()
  const { signOut } = useAuth()
  const [coursesOpen, setCoursesOpen] = useState(
    location.pathname.startsWith('/courses')
  )
  const [confirmOut, setConfirmOut] = useState(false)

  useEffect(() => {
    if (location.pathname.startsWith('/courses')) {
      setCoursesOpen(true)
    }
  }, [location.pathname])

  const handleCoursesClick = () => {
    // In the collapsed rail there's no room for a submenu — jump straight in.
    if (collapsed) {
      navigate('/courses/my')
      return
    }
    const next = !coursesOpen
    setCoursesOpen(next)
    if (next && !location.pathname.startsWith('/courses')) {
      navigate('/courses/my')
    }
  }

  const isCoursesActive = location.pathname.startsWith('/courses')

  return (
    <>
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <DarLogo size={30} />
        </div>
        <div className="logo-text">
          <span className="logo-main">DAR Online CapDev</span>
          <span className="logo-sub">Newly Hired Employees</span>
        </div>
        <button className="sidebar-close-btn" onClick={onCloseMobile} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      {/* Desktop collapse toggle (edge button) */}
      <button
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* User — clickable, opens profile */}
      <button
        className={`sidebar-user${location.pathname === '/profile' ? ' active' : ''}`}
        onClick={() => navigate('/profile')}
        title="View and edit your profile"
      >
        <div className="user-avatar">{initials(user.name)}</div>
        <div className="user-info">
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.division} Division</span>
        </div>
        <Settings size={14} className="user-gear" />
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="nav-label">Menu</p>
        <NavLink
          to="/" end onClick={onCloseMobile} title="Home"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Home size={18} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/dashboard" onClick={onCloseMobile} title="Dashboard"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <button
          className={`nav-item nav-parent${isCoursesActive ? ' active' : ''}`}
          onClick={handleCoursesClick}
          title="Courses"
        >
          <BookOpen size={18} />
          <span>Courses</span>
          <span className="chevron">
            {coursesOpen
              ? <ChevronDown size={15} />
              : <ChevronRight size={15} />}
          </span>
        </button>

        {coursesOpen && !collapsed && (
          <div className="nav-submenu">
            <NavLink
              to="/courses/my" onClick={onCloseMobile}
              className={({ isActive }) => `nav-subitem${isActive ? ' active' : ''}`}
            >
              <GraduationCap size={15} />
              <span>My Courses</span>
            </NavLink>
            <NavLink
              to="/courses/browse" onClick={onCloseMobile}
              className={({ isActive }) => `nav-subitem${isActive ? ' active' : ''}`}
            >
              <BookMarked size={15} />
              <span>Browse Courses</span>
            </NavLink>
          </div>
        )}

        <NavLink
          to="/resources" onClick={onCloseMobile} title="Resource Materials"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <FolderDown size={18} />
          <span>Resource Materials</span>
        </NavLink>

        <NavLink
          to="/certificates" onClick={onCloseMobile} title="Certificates"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Award size={18} />
          <span>Certificates</span>
        </NavLink>

        <NavLink
          to="/messages" onClick={onCloseMobile} title="Messages"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <MessageSquare size={18} />
          <span>Messages</span>
          {unreadTotal > 0 && <span className="nav-badge">{unreadTotal}</span>}
        </NavLink>
      </nav>

      {/* Bottom actions */}
      <div className="sidebar-bottom">
        <button className="nav-item logout-btn" title="Sign Out" onClick={() => setConfirmOut(true)}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>

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
