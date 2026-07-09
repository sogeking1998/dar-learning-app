import { useState } from 'react'
import { User, Mail, Briefcase, Building2, Calendar, Users, Check, X, Pencil } from 'lucide-react'
import { useUser } from '../UserContext'
import Avatar from '../components/Avatar'
import GenderSelect from '../components/GenderSelect'
import './Profile.css'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

const DIV_NAMES = {
  PBD:   'Program Beneficiaries Development',
  LTS:   'Land Tenure Services',
  AJD:   'Adjudication',
  Admin: 'Administrative',
}

export default function Profile() {
  const { user, updateUser } = useUser()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(user)
  const [saved, setSaved] = useState(false)

  const startEdit = () => { setForm(user); setEditing(true); setSaved(false) }
  const cancel    = () => { setForm(user); setEditing(false) }

  const save = e => {
    e.preventDefault()
    updateUser({
      name: form.name.trim(),
      email: form.email.trim(),
      position: form.position.trim(),
      division: form.division,
      gender: form.gender,
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const joined = user.joined
    ? new Date(user.joined).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-sub">View and update your account information</p>
      </div>

      {saved && (
        <div className="pf-toast"><Check size={15} /> Profile updated successfully</div>
      )}

      {/* Identity banner */}
      <div className="pf-banner">
        <div className="pf-banner-mesh" />
        <Avatar name={user.name} gender={user.gender} className="pf-avatar" />
        <div className="pf-banner-info">
          <h2 className="pf-name">{user.name}</h2>
          <p className="pf-position">{user.position}</p>
          <span className="pf-div-tag">{user.division} · {DIV_NAMES[user.division] || 'Division'}</span>
        </div>
        {!editing && (
          <button className="pf-edit-btn" onClick={startEdit}>
            <Pencil size={14} /> Edit Profile
          </button>
        )}
      </div>

      {/* Details / edit form */}
      <form className="pf-card" onSubmit={save}>
        <div className="pf-card-hd">
          <h3 className="pf-card-title">Account Information</h3>
        </div>

        <div className="pf-fields">
          <Field icon={User} label="Full Name" editing={editing}
            value={user.name}
            input={<input className="pf-input" value={form.name} onChange={e => set('name', e.target.value)} required />} />

          <Field icon={Mail} label="Email Address" editing={editing}
            value={user.email}
            input={<input type="email" className="pf-input" value={form.email} onChange={e => set('email', e.target.value)} required />} />

          <Field icon={Briefcase} label="Position" editing={editing}
            value={user.position}
            input={<input className="pf-input" value={form.position} onChange={e => set('position', e.target.value)} required />} />

          <Field icon={Building2} label="Division" editing={editing}
            value={`${user.division} — ${DIV_NAMES[user.division] || ''}`}
            input={
              <select className="pf-input" value={form.division} onChange={e => set('division', e.target.value)}>
                {DIVISIONS.map(d => <option key={d} value={d}>{d} — {DIV_NAMES[d]}</option>)}
              </select>
            } />

          <Field icon={Users} label="Gender" editing={editing}
            value={user.gender ? (user.gender === 'male' ? 'Male' : 'Female') : 'Not set'}
            input={<GenderSelect value={form.gender} onChange={v => set('gender', v)} />} />

          <Field icon={Calendar} label="Date Joined" editing={false} value={joined} input={null} />
        </div>

        {editing && (
          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn-cancel" onClick={cancel}>
              <X size={15} /> Cancel
            </button>
            <button type="submit" className="pf-btn pf-btn-save">
              <Check size={15} /> Save Changes
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function Field({ icon: Icon, label, value, input, editing }) {
  return (
    <div className="pf-field">
      <div className="pf-field-icon"><Icon size={17} /></div>
      <div className="pf-field-body">
        <p className="pf-field-label">{label}</p>
        {editing && input ? input : <p className="pf-field-value">{value}</p>}
      </div>
    </div>
  )
}
