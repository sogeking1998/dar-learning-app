import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [adminStatus, setAdminStatus] = useState(null) // 'none' | 'pending' | 'approved' | 'rejected'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadMeta = async uid => {
      const { data } = await supabase
        .from('profiles')
        .select('role, admin_status')
        .eq('id', uid)
        .single()
      if (!active) return
      setRole(data?.role || 'employee')
      setAdminStatus(data?.admin_status || 'none')
    }

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      if (data.session) await loadMeta(data.session.user.id)
      setLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) await loadMeta(session.user.id)
      else { setRole(null); setAdminStatus(null) }
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  // Confirm a new account with the 6-digit code emailed on signup.
  const verifyEmailOtp = (email, token) =>
    supabase.auth.verifyOtp({ email, token, type: 'signup' })

  // Re-send the signup confirmation code.
  const resendSignupOtp = email =>
    supabase.auth.resend({ type: 'signup', email })

  const signOut = () => supabase.auth.signOut()

  // Re-read role/status from the DB (e.g. after applying or being approved).
  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    const { data: p } = await supabase
      .from('profiles')
      .select('role, admin_status')
      .eq('id', data.session.user.id)
      .single()
    setRole(p?.role || 'employee')
    setAdminStatus(p?.admin_status || 'none')
  }

  const isSuperAdmin = role === 'superadmin'
  const isAdmin = role === 'admin' // approved teacher

  return (
    <AuthContext.Provider value={{
      session, role, adminStatus, isSuperAdmin, isAdmin, loading,
      signUp, signIn, signOut, refreshProfile, verifyEmailOtp, resendSignupOtp,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
