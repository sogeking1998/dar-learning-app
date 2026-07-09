import { useState, useEffect } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Avatar from '../components/Avatar'
import Toast from '../components/Toast'
import AddStudentModal from '../components/AddStudentModal'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function AdminUsers() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)

  const load = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, division, position, gender, joined')
      .eq('role', 'employee')
      .order('created_at', { ascending: true })
    if (error) console.error('Load students failed:', error.message)
    setStudents(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const q = query.toLowerCase()
  const visible = students.filter(s =>
    (s.name || '').toLowerCase().includes(q) ||
    (s.email || '').toLowerCase().includes(q) ||
    (s.division || '').toLowerCase().includes(q) ||
    (s.position || '').toLowerCase().includes(q)
  )

  // Head-count per division for the breakdown card.
  const byDiv = Object.fromEntries(
    DIVISIONS.map(d => [d, students.filter(s => s.division === d).length])
  )

  return (
    <>
      <div className="admin-head au-head">
        <div>
          <h1 className="admin-title">User Management</h1>
          <p className="admin-sub">All student records and account creation</p>
        </div>
        <button className="au-add-btn" onClick={() => setShowAdd(true)}>
          <UserPlus size={16} /> Add Student
        </button>
      </div>

      <div className="dash-stats au-stats">
        <div className="dash-card dash-tile">
          <div className="dash-ic dt-blue"><Users size={20} /></div>
          <div>
            <p className="dash-tile-value">{loading ? '—' : students.length}</p>
            <p className="dash-tile-label">Total Users</p>
          </div>
        </div>

        <div className="dash-card au-div-card">
          <p className="au-div-title">Users per Division</p>
          <div className="au-div-list">
            {DIVISIONS.map(d => (
              <div key={d} className="au-div-item">
                <span className="au-div-count">{loading ? '—' : byDiv[d]}</span>
                <span className="au-div-name">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-hd">
          <h2 className="admin-card-title">Students <span className="ax-count">{visible.length}</span></h2>
          <div className="admin-search">
            <Search size={15} className="admin-search-icon" />
            <input
              className="admin-search-input"
              placeholder="Search students…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Student</th><th>Division</th><th>Position</th><th>Date Joined</th></tr>
            </thead>
            <tbody>
              {visible.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="admin-emp">
                      <Avatar name={s.name} gender={s.gender} className="admin-emp-avatar" />
                      <div className="admin-emp-info">
                        <span className="admin-emp-name">{s.name || '(no name)'}</span>
                        <span className="admin-emp-email">{s.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="admin-div">{s.division || '—'}</span></td>
                  <td>{s.position || '—'}</td>
                  <td>{fmtDate(s.joined)}</td>
                </tr>
              ))}
              {loading && <tr><td colSpan={4} className="admin-empty">Loading…</td></tr>}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={4} className="admin-empty">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onCreated={email => {
            setShowAdd(false)
            setToast({ type: 'success', message: `Student account created for ${email}.` })
            load()
          }}
        />
      )}
    </>
  )
}
