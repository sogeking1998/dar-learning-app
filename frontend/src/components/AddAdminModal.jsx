import { useState } from 'react'
import { X, UserPlus, User, AtSign, Briefcase, Building2, Loader2 } from 'lucide-react'
import GenderSelect from './GenderSelect'
import { createAdminUser, ADMIN_EMAIL_DOMAIN } from '../adminUsersStore'
import './AddAdminModal.css'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

export default function AddAdminModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', username: '', division: 'PBD', position: '', gender: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (!form.name.trim())     return setError('Full name is required.')
    if (!form.username.trim()) return setError('Username is required.')
    if (!form.position.trim()) return setError('Position is required.')
    if (!form.gender)          return setError('Please select a gender.')

    setBusy(true)
    const { error, email } = await createAdminUser(form)
    setBusy(false)
    if (error) {
      const dup = /already registered|already exists|duplicate/i.test(error.message || '')
      setError(dup ? 'An account with that username already exists.' : (error.message || 'Could not create the account.'))
      return
    }
    onCreated(email)
  }

  return (
    <div className="aa-overlay" onClick={onClose}>
      <div className="aa-modal" onClick={e => e.stopPropagation()}>
        <header className="aa-head">
          <div className="aa-head-ic"><UserPlus size={20} /></div>
          <div className="aa-head-text">
            <h3 className="aa-title">Add Admin User</h3>
            <p className="aa-sub">Create an administrator account manually</p>
          </div>
          <button className="aa-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <form className="aa-form" onSubmit={submit}>
          <div className="aa-field">
            <label>Full name</label>
            <div className="aa-input-wrap">
              <User size={16} className="aa-input-ic" />
              <input className="aa-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Juan dela Cruz" />
            </div>
          </div>

          <div className="aa-field">
            <label>Username</label>
            <div className="aa-input-wrap">
              <AtSign size={16} className="aa-input-ic" />
              <input className="aa-input" value={form.username} onChange={e => set('username', e.target.value.trim())} placeholder="e.g. capdev8" autoCapitalize="none" />
            </div>
            <p className="aa-hint">Signs in with this username · email will be <strong>{(form.username.trim() || 'username')}@{ADMIN_EMAIL_DOMAIN}</strong></p>
          </div>

          <div className="aa-row">
            <div className="aa-field">
              <label>Division</label>
              <div className="aa-input-wrap">
                <Building2 size={16} className="aa-input-ic" />
                <select className="aa-input aa-select" value={form.division} onChange={e => set('division', e.target.value)}>
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="aa-field">
              <label>Position</label>
              <div className="aa-input-wrap">
                <Briefcase size={16} className="aa-input-ic" />
                <input className="aa-input" value={form.position} onChange={e => set('position', e.target.value)} placeholder="e.g. Program Coordinator" />
              </div>
            </div>
          </div>

          <div className="aa-field">
            <label>Gender</label>
            <GenderSelect value={form.gender} onChange={v => set('gender', v)} />
          </div>

          {error && <p className="aa-error">{error}</p>}

          <div className="aa-actions">
            <button type="button" className="aa-btn aa-btn-cancel" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="aa-btn aa-btn-create" disabled={busy}>
              {busy ? <><Loader2 size={15} className="aa-spin" /> Creating…</> : <><UserPlus size={15} /> Create Admin</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
