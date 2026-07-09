import { useState } from 'react'
import { AtSign, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../AuthContext'
import Toast from '../components/Toast'
import AuthLayout from '../components/AuthLayout'
import AuthLoading from '../components/AuthLoading'
import DarLogo from '../components/DarLogo'
import './Auth.css'

// Staff (admins / co-pilots) use bare usernames that map to this email domain.
const STAFF_EMAIL_DOMAIN = 'dar.gov.ph'

export default function Login() {
  const { signIn } = useAuth()
  const [identifier, setIdentifier] = useState('') // email OR username
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState(null)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    // An input with "@" is a full email; a bare username maps to the staff domain.
    const id = identifier.trim()
    const loginEmail = id.includes('@') ? id : `${id}@${STAFF_EMAIL_DOMAIN}`

    const { error } = await signIn(loginEmail, password)

    if (error) {
      setLoading(false)
      const message = /invalid login credentials/i.test(error.message)
        ? 'Incorrect email/username or password. Please try again.'
        : error.message
      setToast({ type: 'error', message })
      return
    }

    // Success — the app routes to the right console based on the account's role.
    setSuccess(true)
  }

  if (success) return <AuthLoading message="Signing you in" />

  return (
    <AuthLayout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="auth-mobile-logo">
        <div className="auth-logo-icon"><DarLogo size={26} /></div>
        <span>TARUNGA</span>
      </div>

      <div className="auth-welcome">
        <h1>Welcome back</h1>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="identifier">Email or username</label>
          <div className="auth-input-wrap">
            <AtSign size={17} className="auth-input-icon" />
            <input
              id="identifier"
              type="text"
              className="auth-input has-icon"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="you@dar.gov.ph or your username"
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="password">Password</label>
            <span className="auth-link"
              onClick={() => setToast({ type: 'error', message: 'Password reset is coming soon.' })}>
              Forgot password?
            </span>
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

        <label className="auth-check">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          <span>Remember me</span>
        </label>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? <span className="auth-btn-spinner" /> : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  )
}
