import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import './Toast.css'

export default function Toast({ type = 'error', message, onClose, duration = 4000 }) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div className={`toast toast-${type}`} role="alert">
      <Icon size={18} className="toast-icon" />
      <span className="toast-msg">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  )
}
