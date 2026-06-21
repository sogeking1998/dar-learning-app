import { useState, useEffect } from 'react'
import {
  Users, LogOut, ShieldCheck, GraduationCap,
  Clock, Check, X, Search, UserCog,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import DarLogo from '../components/DarLogo'
import ConfirmModal from '../components/ConfirmModal'
import './AdminDashboard.css'

const initials = name =>
  (name || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

const roleLabel = p =>
  p.role === 'superadmin' ? 'Super Admin'
  : p.role === 'admin' ? 'Admin'
  : p.admin_status === 'pending' ? 'Admin (pending)'
  : 'Employee'

export default function SuperAdminDashboard() {
  const { signOut } = useAuth()
  const [confirmOut, setConfirmOut] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, division, position, role, admin_status, joined')
      .order('created_at', { ascending: true })
    setProfiles(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const approve = async id => {
    await supabase.from('profiles').update({ role: 'admin', admin_status: 'approved' }).eq('id', id)
    load()
  }
  const reject = async id => {
    await supabase.from('profiles').update({ admin_status: 'rejected' }).eq('id', id)
    load()
  }

  return (
    <div className="sa-app">
      <header className="sa-topbar">
        <div className="sa-brand">
          <div className="admin-logo"><DarLogo size={26} /></div>
          <div className="sa-brand-text">
            <span className="sa-brand-title">DAR Super Admin</span>
            <span className="sa-brand-sub">User Control Console</span>
          </div>
        </div>
        <button className="sa-signout" onClick={() => setConfirmOut(true)}>
          <LogOut size={16} /> <span>Sign out</span>
        </button>
      </header>

      <main className="sa-main">
        <UserManagement profiles={profiles} loading={loading} onApprove={approve} onReject={reject} />
      </main>

      {confirmOut && (
        <ConfirmModal
          icon={LogOut}
          title="Sign out?"
          message="You'll return to the login screen."
          confirmLabel="Sign Out" cancelLabel="Cancel" danger
          onConfirm={signOut} onCancel={() => setConfirmOut(false)}
        />
      )}
    </div>
  )
}

function UserManagement({ profiles, loading, onApprove, onReject }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const pending = profiles.filter(p => p.admin_status === 'pending')
  const admins = profiles.filter(p => p.role === 'admin').length
  const students = profiles.filter(p => p.role === 'employee' && p.admin_status !== 'pending').length
  const total = profiles.length

  const stats = [
    { icon: Users, value: total, label: 'Total Users', tone: 'dt-blue' },
    { icon: GraduationCap, value: students, label: 'Employees', tone: 'dt-green' },
    { icon: ShieldCheck, value: admins, label: 'Verified Admins', tone: 'dt-purple' },
    { icon: Clock, value: pending.length, label: 'Pending Approvals', tone: 'dt-amber' },
  ]

  const all = profiles
    .filter(p =>
      (p.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.division || '').toLowerCase().includes(query.toLowerCase())
    )
    // Super Admin always on top.
    .sort((a, b) => (b.role === 'superadmin') - (a.role === 'superadmin'))

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">User Management</h1>
        <p className="admin-sub">Verify admin applications and manage all accounts</p>
      </div>

      {/* Stat tiles */}
      <div className="dash-stats">
        {stats.map(({ icon: Icon, value, label, tone }) => (
          <div key={label} className="dash-card dash-tile">
            <div className={`dash-ic ${tone}`}><Icon size={20} /></div>
            <div>
              <p className="dash-tile-value">{loading ? '—' : value}</p>
              <p className="dash-tile-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending approvals */}
      <div className="admin-card" style={{ marginBottom: 22 }}>
        <div className="admin-card-hd">
          <h2 className="admin-card-title">
            Pending Admin Approvals <span className="ax-count">{pending.length}</span>
          </h2>
        </div>
        {loading ? (
          <p className="admin-empty">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="admin-empty">No pending applications.</p>
        ) : (
          <div className="sa-approvals">
            {pending.map(p => (
              <div key={p.id} className="sa-approval sa-clickable" onClick={() => setSelected(p)}>
                <div className="admin-emp-avatar">{initials(p.name)}</div>
                <div className="sa-approval-info">
                  <span className="admin-emp-name">{p.name || '(no name)'}</span>
                  <span className="admin-emp-email">{p.email}</span>
                  <span className="sa-approval-meta">{p.division || '—'} · {p.position || '—'}</span>
                </div>
                <div className="sa-approval-actions" onClick={e => e.stopPropagation()}>
                  <button className="sa-approve" onClick={() => onApprove(p.id)}><Check size={15} /> Approve</button>
                  <button className="sa-reject" onClick={() => onReject(p.id)}><X size={15} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All users */}
      <div className="admin-card">
        <div className="admin-card-hd">
          <h2 className="admin-card-title">All Users <span className="ax-count">{all.length}</span></h2>
          <div className="admin-search">
            <Search size={15} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="Search users…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Division</th><th>Position</th><th>Role</th></tr>
            </thead>
            <tbody>
              {all.map(p => (
                <tr key={p.id} className="sa-row" onClick={() => setSelected(p)}>
                  <td>
                    <div className="admin-emp">
                      <div className="admin-emp-avatar">{initials(p.name)}</div>
                      <div className="admin-emp-info">
                        <span className="admin-emp-name">{p.name || '(no name)'}</span>
                        <span className="admin-emp-email">{p.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="admin-div">{p.division || '—'}</span></td>
                  <td>{p.position || '—'}</td>
                  <td>
                    <span className={`sa-role sa-role-${p.role}${p.admin_status === 'pending' ? ' sa-role-pending' : ''}`}>
                      {p.role === 'superadmin' && <ShieldCheck size={12} />}
                      {p.role === 'admin' && <UserCog size={12} />}
                      {roleLabel(p)}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && all.length === 0 && (
                <tr><td colSpan={4} className="admin-empty">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <UserDetailModal
          user={selected}
          onApprove={id => { onApprove(id); setSelected(null) }}
          onReject={id => { onReject(id); setSelected(null) }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function UserDetailModal({ user, onApprove, onReject, onClose }) {
  const pending = user.admin_status === 'pending'
  const joined = user.joined
    ? new Date(user.joined).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const rows = [
    ['Division', user.division || '—'],
    ['Position', user.position || '—'],
    ['Account status', user.admin_status === 'none' ? 'Active' : user.admin_status],
    ['Date joined', joined],
    ['Account ID', user.id],
  ]

  return (
    <div className="sa-modal-overlay" onClick={onClose}>
      <div className="sa-modal" onClick={e => e.stopPropagation()}>
        <button className="sa-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        <div className="sa-modal-head">
          <div className="admin-emp-avatar sa-modal-avatar">{initials(user.name)}</div>
          <div className="sa-modal-id">
            <h3 className="sa-modal-name">{user.name || '(no name)'}</h3>
            <p className="sa-modal-email">{user.email}</p>
            <span className={`sa-role sa-role-${user.role}${pending ? ' sa-role-pending' : ''}`}>
              {user.role === 'superadmin' && <ShieldCheck size={12} />}
              {user.role === 'admin' && <UserCog size={12} />}
              {roleLabel(user)}
            </span>
          </div>
        </div>

        <dl className="sa-modal-grid">
          {rows.map(([label, value]) => (
            <div key={label} className="sa-modal-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {pending && (
          <div className="sa-modal-actions">
            <button className="sa-reject" onClick={() => onReject(user.id)}><X size={15} /> Reject</button>
            <button className="sa-approve" onClick={() => onApprove(user.id)}><Check size={15} /> Approve</button>
          </div>
        )}
      </div>
    </div>
  )
}
