import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Shield, ArrowLeft } from 'lucide-react'
import { useAuth } from '../AuthContext'
import Toast from '../components/Toast'
import AuthLayout from '../components/AuthLayout'
import AuthLoading from '../components/AuthLoading'
import DarLogo from '../components/DarLogo'
import './Auth.css'

// Bare admin usernames (e.g. "capdev8") map to this email domain.
const ADMIN_EMAIL_DOMAIN = 'dar.gov.ph'

export default function Login() {
  const { signIn } = useAuth()
  const [mode, setMode] = useState('employee') // 'employee' | 'admin'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState(null)

  const isAdmin = mode === 'admin'

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    // In admin mode a bare username is mapped to the account's email.
    const loginEmail = isAdmin
      ? (username.trim().includes('@') ? username.trim() : `${username.trim()}@${ADMIN_EMAIL_DOMAIN}`)
      : email

    const { error } = await signIn(loginEmail, password)

    if (error) {
      setLoading(false)
      const message = /invalid login credentials/i.test(error.message)
        ? (isAdmin ? 'Invalid admin username or password.' : 'Incorrect email or password. Please try again.')
        : error.message
      setToast({ type: 'error', message })
      return
    }

    // Success — routing (employee / teacher / super admin) is decided by role.
    setSuccess(true)
  }

  if (success) {
    return <AuthLoading message={isAdmin ? 'Opening console' : 'Signing you in'} />
  }

  return (
    <AuthLayout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="auth-mobile-logo">
        <div className="auth-logo-icon"><DarLogo size={26} /></div>
        <span>TARUNGA</span>
      </div>

      <div className="auth-welcome">
        <h1>{isAdmin ? 'Administrator login' : 'Sign in to your account'}</h1>
        <p>{isAdmin
          ? 'Enter your admin credentials to manage the program'
          : 'Enter your credentials to access your training portal'}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {isAdmin ? (
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <div className="auth-input-wrap">
              <User size={17} className="auth-input-icon" />
              <input
                id="username"
                type="text"
                className="auth-input has-icon"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. capdev8"
                autoComplete="username"
                required
              />
            </div>
          </div>
        ) : (
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <div className="auth-input-wrap">
              <Mail size={17} className="auth-input-icon" />
              <input
                id="email"
                type="email"
                className="auth-input has-icon"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@dar.gov.ph"
                required
              />
            </div>
          </div>
        )}

        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="password">Password</label>
            {!isAdmin && (
              <span className="auth-link"
                onClick={() => setToast({ type: 'error', message: 'Password reset is coming soon.' })}>
                Forgot password?
              </span>
            )}
          </div>
          <div className="auth-input-wrap">
            <Lock size={17} className="auth-input-icon" />
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              className="auth-input has-icon has-toggle"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(s => !s)}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {!isAdmin && (
          <label className="auth-check">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <span>Remember me</span>
          </label>
        )}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? <span className="auth-btn-spinner" /> : (isAdmin ? 'Sign in as Admin' : 'Sign In')}
        </button>
      </form>

      {isAdmin ? (
        <>
          <button type="button" className="auth-admin-toggle"
            onClick={() => { setMode('employee'); setPassword(''); setToast(null) }}>
            <ArrowLeft size={15} /> Back to employee login
          </button>
          <p className="auth-switch">
            New admin? <Link to="/signup" state={{ admin: true }}>Create an admin account</Link>
          </p>
        </>
      ) : (
        <>
          <div className="auth-divider"><span>or</span></div>
          <button type="button" className="auth-admin-toggle"
            onClick={() => { setMode('admin'); setPassword(''); setToast(null) }}>
            <Shield size={15} /> Login as admin
          </button>
          <p className="auth-switch">
            New on our platform? <Link to="/signup">Create an account</Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}
