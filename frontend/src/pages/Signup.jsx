import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Briefcase, Building2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import Toast from '../components/Toast'
import AuthLayout from '../components/AuthLayout'
import AuthLoading from '../components/AuthLoading'
import DarLogo from '../components/DarLogo'
import './Auth.css'

const DIVISIONS = [
  { code: 'PBD',   name: 'Program Beneficiaries Development' },
  { code: 'LTS',   name: 'Land Tenure Services' },
  { code: 'AJD',   name: 'Adjudication' },
  { code: 'Admin', name: 'Administrative' },
]

// Length of the email verification code Supabase sends ({{ .Token }}).
const OTP_LEN = 6

export default function Signup() {
  const { signUp, refreshProfile, verifyEmailOtp, resendSignupOtp } = useAuth()
  const location = useLocation()
  const adminIntent = !!location.state?.admin

  const [step, setStep] = useState('form')   // 'form' | 'otp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isAdminApplicant, setIsAdminApplicant] = useState(adminIntent)
  const [name, setName] = useState('')
  const [division, setDivision] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState(null)

  // OTP step
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  // Save admin-applicant details (only after a session exists, i.e. post-verify).
  const finishProfile = async user => {
    if (isAdminApplicant && user) {
      await supabase.from('profiles').update({
        name: name.trim(),
        division,
        position: position.trim(),
        admin_status: 'pending',
      }).eq('id', user.id)
      await refreshProfile()
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (password.length < 6) {
      setToast({ type: 'error', message: 'Password must be at least 6 characters.' })
      return
    }
    if (password !== confirm) {
      setToast({ type: 'error', message: 'Passwords do not match.' })
      return
    }
    if (isAdminApplicant && (!name.trim() || !division || !position.trim())) {
      setToast({ type: 'error', message: 'Please complete your name, division, and position.' })
      return
    }

    setLoading(true)
    const { data, error } = await signUp(email, password)

    if (error) {
      setLoading(false)
      console.error('Signup error:', error)
      const raw = (error.message || '').trim()
      const msg = (!raw || raw === '{}' || raw.startsWith('{'))
        ? 'We couldn’t send your verification email. Please double-check the address, or try again shortly.'
        : raw
      setToast({ type: 'error', message: msg })
      return
    }

    // Email confirmation OFF → a session comes back immediately (no OTP step).
    if (data.session) {
      await finishProfile(data.user)
      setSuccess(true)
      return
    }

    // Email confirmation ON → a 6-digit code was emailed. Move to the OTP step.
    setLoading(false)
    setCode('')
    setResendIn(45)
    setStep('otp')
  }

  const handleVerify = async e => {
    e.preventDefault()
    if (code.length !== OTP_LEN) return
    setVerifying(true)
    const { data, error } = await verifyEmailOtp(email, code)
    if (error) {
      setVerifying(false)
      setToast({ type: 'error', message: 'That code is invalid or expired. Please try again.' })
      return
    }
    await finishProfile(data.user)
    setSuccess(true)
  }

  const handleResend = async () => {
    if (resendIn > 0) return
    const { error } = await resendSignupOtp(email)
    if (error) { setToast({ type: 'error', message: error.message }); return }
    setResendIn(45)
    setToast({ type: 'success', message: 'A new code is on its way.' })
  }

  if (success) {
    return <AuthLoading message="Setting up your account" />
  }

  // ── OTP verification step ──
  if (step === 'otp') {
    return (
      <AuthLayout>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        <div className="auth-mobile-logo">
          <div className="auth-logo-icon"><DarLogo size={26} /></div>
          <span>TARUNGA</span>
        </div>

        <div className="auth-otp-badge"><ShieldCheck size={26} /></div>
        <div className="auth-welcome">
          <h1>Verify your email</h1>
          <p>Enter the {OTP_LEN}-digit code we sent to <strong>{email}</strong></p>
        </div>

        <form className="auth-form" onSubmit={handleVerify}>
          <input
            className="auth-otp-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LEN}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LEN))}
            placeholder={'•'.repeat(OTP_LEN)}
            autoFocus
          />

          <button type="submit" className="auth-btn" disabled={code.length !== OTP_LEN || verifying}>
            {verifying ? <span className="auth-btn-spinner" /> : 'Verify & Continue'}
          </button>
        </form>

        <p className="auth-otp-resend">
          Didn’t get the code?{' '}
          {resendIn > 0
            ? <span className="auth-otp-wait">Resend in {resendIn}s</span>
            : <button type="button" className="auth-link-btn" onClick={handleResend}>Resend code</button>}
        </p>

        <button type="button" className="auth-otp-back" onClick={() => { setStep('form'); setLoading(false) }}>
          <ArrowLeft size={15} /> Use a different email
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="auth-mobile-logo">
        <div className="auth-logo-icon"><DarLogo size={26} /></div>
        <span>DAR Online CapDev</span>
      </div>

      <div className="auth-welcome">
        <h1>{isAdminApplicant ? 'Create an admin account' : 'Create your account'}</h1>
        <p>{isAdminApplicant
          ? 'Admin accounts manage sessions & exams (requires approval)'
          : 'Get started to begin your learning journey'}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <div className="auth-input-wrap">
            <Mail size={17} className="auth-input-icon" />
            <input id="email" type="email" className="auth-input has-icon" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@dar.gov.ph" required />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <div className="auth-input-wrap">
            <Lock size={17} className="auth-input-icon" />
            <input id="password" type={showPw ? 'text' : 'password'} className="auth-input has-icon has-toggle"
              value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
            <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(s => !s)}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="confirm">Confirm Password</label>
          <div className="auth-input-wrap">
            <Lock size={17} className="auth-input-icon" />
            <input id="confirm" type={showPw ? 'text' : 'password'} className="auth-input has-icon"
              value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your password" required />
          </div>
        </div>

        {/* Admin application toggle */}
        <label className="auth-check">
          <input type="checkbox" checked={isAdminApplicant} onChange={e => setIsAdminApplicant(e.target.checked)} />
          <span>Register as an admin (requires Super Admin approval)</span>
        </label>

        {isAdminApplicant && (
          <>
            <div className="auth-field">
              <label htmlFor="name">Full Name</label>
              <div className="auth-input-wrap">
                <User size={17} className="auth-input-icon" />
                <input id="name" type="text" className="auth-input has-icon" value={name}
                  onChange={e => setName(e.target.value)} placeholder="e.g. Maria Santos" />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="position">Position</label>
              <div className="auth-input-wrap">
                <Briefcase size={17} className="auth-input-icon" />
                <input id="position" type="text" className="auth-input has-icon" value={position}
                  onChange={e => setPosition(e.target.value)} placeholder="e.g. Training Officer" />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="division">Division</label>
              <div className="auth-input-wrap">
                <Building2 size={17} className="auth-input-icon" />
                <select id="division" className="auth-input has-icon" value={division}
                  onChange={e => setDivision(e.target.value)}>
                  <option value="" disabled>Select your division…</option>
                  {DIVISIONS.map(d => <option key={d.code} value={d.code}>{d.code} — {d.name}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? <span className="auth-btn-spinner" /> : (isAdminApplicant ? 'Apply as Admin' : 'Sign Up')}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in instead</Link>
      </p>
    </AuthLayout>
  )
}
