import { User } from 'lucide-react'
import { initials } from '../UserContext'
import './Avatar.css'

const TINTS = {
  male:   { bg: 'linear-gradient(140deg, #2563eb, #60a5fa)', shadow: 'rgba(37,99,235,0.45)' },
  female: { bg: 'linear-gradient(140deg, #db2777, #f472b6)', shadow: 'rgba(219,39,119,0.45)' },
}

// Drop-in replacement for a bare `{initials(name)}` avatar: shows a modern
// male/female glyph when gender is known, falling back to initials otherwise
// (legacy accounts, or contexts where gender hasn't loaded yet).
export default function Avatar({ name, gender, className = '', children }) {
  const tint = TINTS[gender]
  return (
    <span
      className={`av${className ? ` ${className}` : ''}`}
      style={tint ? { background: tint.bg, boxShadow: `0 3px 10px ${tint.shadow}, inset 0 0 0 1px rgba(255,255,255,0.18)` } : undefined}
    >
      {tint ? <User className="av-icon" strokeWidth={2.5} /> : initials(name)}
      {children}
    </span>
  )
}
