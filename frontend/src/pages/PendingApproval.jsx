import { useState } from 'react'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../AuthContext'
import DarLogo from '../components/DarLogo'
import './PendingApproval.css'

export default function PendingApproval() {
  const { signOut, refreshProfile, adminStatus } = useAuth()
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    await refreshProfile()
    setChecking(false)
  }

  const rejected = adminStatus === 'rejected'

  return (
    <div className="pending-page">
      <div className="pending-card">
        <div className="pending-logo"><DarLogo size={40} /></div>

        <div className={`pending-icon${rejected ? ' rejected' : ''}`}><Clock size={28} /></div>

        <h1 className="pending-title">
          {rejected ? 'Application not approved' : 'Awaiting approval'}
        </h1>
        <p className="pending-text">
          {rejected
            ? 'Your admin account request was not approved. Please contact the Super Admin if you believe this is a mistake.'
            : 'Your admin account is pending verification by the Super Admin. Once approved, you’ll be able to manage sessions and exams.'}
        </p>

        <div className="pending-actions">
          <button className="pending-refresh" onClick={check} disabled={checking}>
            <RefreshCw size={15} /> {checking ? 'Checking…' : 'Check status'}
          </button>
          <button className="pending-signout" onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
