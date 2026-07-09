import { useState } from 'react'
import { User, Briefcase, Building2, PartyPopper } from 'lucide-react'
import { useUser } from '../UserContext'
import GenderSelect from './GenderSelect'
import './OnboardingModal.css'

const DIVISIONS = [
  { code: 'PBD',   name: 'Program Beneficiaries Development' },
  { code: 'LTS',   name: 'Land Tenure Services' },
  { code: 'AJD',   name: 'Adjudication' },
  { code: 'Admin', name: 'Administrative' },
]

export default function OnboardingModal() {
  const { user, updateUser } = useUser()
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [division, setDivision] = useState('')
  const [gender, setGender] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !position.trim() || !division || !gender) {
      setError('Please fill in all fields.')
      return
    }

    setSaving(true)
    await updateUser({
      name: name.trim(),
      position: position.trim(),
      division,
      gender,
    })
    setSaving(false)
    // Once `name` is set, needsOnboarding becomes false and this modal unmounts.
  }

  return (
    <div className="ob-overlay">
      <div className="ob-card">
        <div className="ob-header">
          <div className="ob-icon"><PartyPopper size={26} /></div>
          <h2 className="ob-title">Welcome to DAR Online CapDev!</h2>
          <p className="ob-sub">
            We&apos;re glad to have you{user?.email ? `, ${user.email}` : ''}. Let&apos;s set up
            your profile so we can personalize your learning experience.
          </p>
        </div>

        <form className="ob-form" onSubmit={handleSubmit}>
          {error && <div className="ob-error">{error}</div>}

          <div className="ob-field">
            <label htmlFor="ob-name"><User size={15} /> Full Name</label>
            <input
              id="ob-name"
              className="ob-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Juan dela Cruz"
              autoFocus
            />
          </div>

          <div className="ob-field">
            <label htmlFor="ob-position"><Briefcase size={15} /> Position</label>
            <input
              id="ob-position"
              className="ob-input"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="e.g. Agrarian Reform Program Officer II"
            />
          </div>

          <div className="ob-field">
            <label htmlFor="ob-division"><Building2 size={15} /> Division</label>
            <select
              id="ob-division"
              className="ob-input"
              value={division}
              onChange={e => setDivision(e.target.value)}
            >
              <option value="" disabled>Select your division…</option>
              {DIVISIONS.map(d => (
                <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
              ))}
            </select>
          </div>

          <div className="ob-field">
            <label>Gender</label>
            <GenderSelect value={gender} onChange={setGender} />
          </div>

          <button type="submit" className="ob-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}
