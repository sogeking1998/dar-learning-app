import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { UserProvider, useUser } from './UserContext'
import { MessagesProvider } from './MessagesContext'
import { CallProvider } from './CallContext'
import { useAuth } from './AuthContext'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Footer from './components/Footer'
import OnboardingModal from './components/OnboardingModal'
import MessageNotifier from './components/MessageNotifier'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import MyCourses from './pages/MyCourses'
import BrowseCourses from './pages/BrowseCourses'
import Resources from './pages/Resources'
import Certificates from './pages/Certificates'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminDashboard from './pages/AdminDashboard'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import PendingApproval from './pages/PendingApproval'
import AuthLoading from './components/AuthLoading'
import './App.css'

const Loading = () => <AuthLoading message="Loading" />

export default function App() {
  const { session, loading, isSuperAdmin, isAdmin, adminStatus } = useAuth()

  // Wait for Supabase to restore any existing session before deciding.
  if (loading) return <Loading />

  // Role-based consoles take priority over the employee app.
  if (session && isSuperAdmin) return <SuperAdminDashboard />
  if (session && isAdmin) return <AdminDashboard />
  if (session && adminStatus === 'pending') return <PendingApproval />

  // Not signed in → only the login / signup pages are reachable.
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Signed in → load the profile, then render the full app.
  return (
    <UserProvider>
      <MessagesProvider>
        <CallProvider>
          <AuthedApp />
        </CallProvider>
      </MessagesProvider>
    </UserProvider>
  )
}

function AuthedApp() {
  const { user, loading: profileLoading, needsOnboarding } = useUser()
  const [collapsed, setCollapsed] = useState(false)   // desktop icon rail
  const [mobileOpen, setMobileOpen] = useState(false) // mobile drawer
  const location = useLocation()

  // On route change: close the mobile drawer and scroll back to the top.
  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Wait for the profile row to load before rendering the layout.
  if (profileLoading || !user) return <Loading />

  return (
    <div className={`app-layout${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className="sidebar-scrim"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <div className="main-wrapper">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses/my" element={<MyCourses />} />
            <Route path="/courses/browse" element={<BrowseCourses />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>

      {/* First-time users complete their profile before using the app. */}
      {needsOnboarding && <OnboardingModal />}

      {/* App-wide toast for new messages received outside the Messages page. */}
      <MessageNotifier />
    </div>
  )
}
