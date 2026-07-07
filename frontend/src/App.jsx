import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { UserProvider, useUser } from './UserContext'
import { MessagesProvider } from './MessagesContext'
import { CallProvider } from './CallContext'
import { useAuth } from './AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import OnboardingModal from './components/OnboardingModal'
import MessageNotifier from './components/MessageNotifier'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Courses from './pages/Courses'
import SessionDetail from './pages/SessionDetail'
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
  const { user, loading: profileLoading } = useUser()

  // Wait for the profile row to load before rendering anything.
  if (profileLoading || !user) return <Loading />

  // Standalone, chrome-free pages (open-in-new-tab session view) render
  // outside the sidebar/topbar shell but still inside the auth providers.
  return (
    <Routes>
      <Route path="/session/:courseId" element={<SessionDetail />} />
      <Route path="*" element={<AppShell />} />
    </Routes>
  )
}

function AppShell() {
  const { needsOnboarding } = useUser()
  const location = useLocation()

  // Scroll back to the top on every route change.
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          {/* Old split routes now fold into the single Courses page. */}
          <Route path="/courses/my" element={<Navigate to="/courses" replace />} />
          <Route path="/courses/browse" element={<Navigate to="/courses" replace />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />

      {/* First-time users complete their profile before using the app. */}
      {needsOnboarding && <OnboardingModal />}

      {/* App-wide toast for new messages received outside the Messages page. */}
      <MessageNotifier />
    </div>
  )
}
