import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [adminStatus, setAdminStatus] = useState(null) // 'none' | 'pending' | 'approved' | 'rejected'
  const [mustReset, setMustReset] = useState(false)     // force a password change on first login
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadMeta = async uid => {
      const { data } = await supabase
        .from('profiles')
        .select('role, admin_status, must_reset_password')
        .eq('id', uid)
        .single()
      if (!active) return
      setRole(data?.role || 'employee')
      setAdminStatus(data?.admin_status || 'none')
      setMustReset(!!data?.must_reset_password)
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

  // Set a new password and clear the first-login reset flag.
  const completePasswordReset = async newPassword => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error }
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      await supabase.from('profiles').update({ must_reset_password: false }).eq('id', data.session.user.id)
    }
    setMustReset(false)
    return {}
  }

  // Re-read role/status from the DB (e.g. after applying or being approved).
  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    const { data: p } = await supabase
      .from('profiles')
      .select('role, admin_status, must_reset_password')
      .eq('id', data.session.user.id)
      .single()
    setRole(p?.role || 'employee')
    setAdminStatus(p?.admin_status || 'none')
    setMustReset(!!p?.must_reset_password)
  }

  const isSuperAdmin = role === 'superadmin'
  const isAdmin = role === 'admin' // approved teacher
  const isCopilot = role === 'copilot' // customer-service staff

  return (
    <AuthContext.Provider value={{
      session, role, adminStatus, isSuperAdmin, isAdmin, isCopilot, loading,
      mustResetPassword: mustReset,
      signUp, signIn, signOut, refreshProfile, verifyEmailOtp, resendSignupOtp,
      completePasswordReset,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
