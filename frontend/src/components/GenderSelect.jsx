import './GenderSelect.css'

// lucide-react has no Mars/Venus glyphs — draw the standard gender symbols directly.
const MarsIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="6" />
    <line x1="14.5" y1="9.5" x2="21" y2="3" />
    <polyline points="15 3 21 3 21 9" />
  </svg>
)
const VenusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="6" />
    <line x1="12" y1="15" x2="12" y2="21" />
    <line x1="9" y1="18" x2="15" y2="18" />
  </svg>
)

const OPTIONS = [
  { value: 'male',   label: 'Male',   icon: MarsIcon },
  { value: 'female', label: 'Female', icon: VenusIcon },
]

export default function GenderSelect({ value, onChange }) {
  return (
    <div className="gs-row" role="radiogroup" aria-label="Gender">
      {OPTIONS.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          className={`gs-opt gs-${v}${value === v ? ' active' : ''}`}
          onClick={() => onChange(v)}
        >
          <span className="gs-opt-ic"><Icon size={20} /></span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
