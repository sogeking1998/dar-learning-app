import { useState } from 'react'
import { Lock, Eye, EyeOff, ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '../AuthContext'
import './ForcePasswordReset.css'

// Blocking first-login screen: accounts created with the default password must
// choose a new one before they can use the app.
export default function ForcePasswordReset() {
  const { completePasswordReset, signOut } = useAuth()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (pw.length < 6) return setError('Password must be at least 6 characters.')
    if (pw !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    const { error } = await completePasswordReset(pw)
    setBusy(false)
    if (error) { setError(error.message || 'Could not update your password.'); return }
    // On success mustResetPassword flips false and the app renders past this gate.
  }

  return (
    <div className="fpr-page">
      <form className="fpr-card" onSubmit={submit}>
        <div className="fpr-badge"><ShieldCheck size={26} /></div>
        <h1 className="fpr-title">Set a new password</h1>
        <p className="fpr-sub">
          For your security, please replace the default password before continuing.
        </p>

        <div className="fpr-field">
          <label htmlFor="fpr-new">New password</label>
          <div className="fpr-input-wrap">
            <Lock size={16} className="fpr-input-icon" />
            <input
              id="fpr-new"
              type={show ? 'text' : 'password'}
              className="fpr-input"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              autoFocus
            />
            <button type="button" className="fpr-toggle" onClick={() => setShow(s => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="fpr-field">
          <label htmlFor="fpr-confirm">Confirm new password</label>
          <div className="fpr-input-wrap">
            <Lock size={16} className="fpr-input-icon" />
            <input
              id="fpr-confirm"
              type={show ? 'text' : 'password'}
              className="fpr-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && <p className="fpr-error">{error}</p>}

        <button type="submit" className="fpr-btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save & Continue'}
        </button>

        <button type="button" className="fpr-signout" onClick={() => signOut()}>
          <LogOut size={14} /> Sign out
        </button>
      </form>
    </div>
  )
}
