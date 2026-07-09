import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { User, X, ArrowRight } from 'lucide-react'
import { useUser } from '../UserContext'
import './GenderNudge.css'

const KEY = 'tarunga-gender-nudge-dismissed'

// One-time banner nudging accounts created before the gender/avatar feature to
// set their gender so their initials become a proper avatar. Disappears on its
// own the moment a gender is saved, or when dismissed (persisted per user).
export default function GenderNudge() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(`${KEY}-${user?.id}`) === '1' } catch { return false }
  })

  // Nothing to nudge if the gender is set, already dismissed, or we're already
  // on the profile page (where they'd set it).
  if (!user || user.gender || dismissed || pathname === '/profile') return null

  const close = () => {
    try { localStorage.setItem(`${KEY}-${user.id}`, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="gn-banner" role="status">
      <span className="gn-ic"><User size={18} strokeWidth={2.5} /></span>
      <p className="gn-text">
        <strong>Personalize your avatar.</strong> Set your gender to replace your initials with a profile avatar.
      </p>
      <button className="gn-cta" onClick={() => navigate('/profile')}>Set now <ArrowRight size={14} /></button>
      <button className="gn-x" onClick={close} aria-label="Dismiss"><X size={16} /></button>
    </div>
  )
}
