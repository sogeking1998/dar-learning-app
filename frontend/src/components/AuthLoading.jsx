import DarLogo from './DarLogo'
import './AuthLoading.css'

export default function AuthLoading({ message = 'Loading' }) {
  return (
    <div className="aload">
      <div className="aload-ring">
        <div className="aload-logo"><DarLogo size={40} /></div>
      </div>
      <p className="aload-text">{message}<span className="aload-dots" /></p>
      <div className="aload-bar"><span /></div>
    </div>
  )
}
