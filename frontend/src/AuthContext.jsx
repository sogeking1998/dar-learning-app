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
    let requestId = 0

    const loadMeta = async uid => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, admin_status, must_reset_password')
        .eq('id', uid)
        .single()

      if (error) console.error('Failed to load auth profile:', error.message)
      return data
    }

    const applySession = async nextSession => {
      const currentRequest = ++requestId
      if (!active) return

      setSession(nextSession)
      if (!nextSession) {
        setRole(null)
        setAdminStatus(null)
        setMustReset(false)
        setLoading(false)
        return
      }

      const data = await loadMeta(nextSession.user.id)
      if (!active || currentRequest !== requestId) return
      setRole(data?.role || 'employee')
      setAdminStatus(data?.admin_status || 'none')
      setMustReset(!!data?.must_reset_password)
      setLoading(false)
    }

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) console.error('Failed to restore auth session:', error.message)
        await applySession(data?.session ?? null)
      } catch (error) {
        console.error('Failed to initialize authentication:', error)
        if (active) setLoading(false)
      }
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Supabase invokes this callback while its auth lock is held. Starting and
      // awaiting another Supabase request here can deadlock cold-start session
      // restoration. Defer the work so the callback returns synchronously.
      setTimeout(() => {
        applySession(nextSession).catch(error => {
          console.error('Failed to apply auth session:', error)
          if (active) setLoading(false)
        })
      }, 0)
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
