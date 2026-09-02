import { useState, useEffect } from 'react'
import { Search, UserPlus, Users, Building2, CalendarDays, ChevronRight } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Avatar from '../components/Avatar'
import Toast from '../components/Toast'
import AddStudentModal from '../components/AddStudentModal'
import StudentProgressModal from '../components/StudentProgressModal'
import './AdminUsers.css'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function AdminUsers() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [division, setDivision] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
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
  const visible = students.filter(s => {
    const matchesDivision = division === 'All' || s.division === division
    const matchesQuery =
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.division || '').toLowerCase().includes(q) ||
      (s.position || '').toLowerCase().includes(q)
    return matchesDivision && matchesQuery
  })

  // Head-count per division for the breakdown card.
  const byDiv = Object.fromEntries(
    DIVISIONS.map(d => [d, students.filter(s => s.division === d).length])
  )
  const representedDivisions = DIVISIONS.filter(d => byDiv[d] > 0).length
  const now = Date.now()
  const recentlyJoined = students.filter(s => {
    if (!s.joined) return false
    const age = now - new Date(s.joined).getTime()
    return age >= 0 && age <= 30 * 24 * 60 * 60 * 1000
  }).length

  return (
    <>
      <div className="au-wrap">
      <div className="admin-head au-head">
        <div>
          <span className="au-kicker">People administration</span>
          <h1 className="admin-title">User Management</h1>
          <p className="admin-sub">Create learner accounts and monitor participation across every division.</p>
        </div>
        <button className="au-add-btn" onClick={() => setShowAdd(true)}>
          <UserPlus size={16} /> Add Student
        </button>
      </div>

      <div className="au-metrics">
        <div className="au-metric au-metric-green">
          <span className="au-metric-icon"><Users size={20} /></span>
          <div><strong>{loading ? '—' : students.length}</strong><span>Total students</span><small>Registered learner accounts</small></div>
        </div>
        <div className="au-metric au-metric-blue">
          <span className="au-metric-icon"><Building2 size={20} /></span>
          <div><strong>{loading ? '—' : representedDivisions}</strong><span>Active divisions</span><small>Divisions with enrolled learners</small></div>
        </div>
        <div className="au-metric au-metric-amber">
          <span className="au-metric-icon"><CalendarDays size={20} /></span>
          <div><strong>{loading ? '—' : recentlyJoined}</strong><span>Recently joined</span><small>Added within the last 30 days</small></div>
        </div>
        <div className="au-distribution">
          <div className="au-distribution-head"><span>Division distribution</span><small>{students.length} total</small></div>
          <div className="au-div-list">
            {DIVISIONS.map(d => (
              <div key={d} className="au-div-item">
                <span className="au-div-name">{d}</span>
                <span className="au-div-count">{loading ? '—' : byDiv[d]}</span>
                <span className="au-div-track"><i style={{ width: `${students.length ? (byDiv[d] / students.length) * 100 : 0}%` }} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-card au-directory">
        <div className="au-directory-head">
          <div>
            <h2>Student Directory <span>{visible.length}</span></h2>
            <p>Select a student to review learning progress and submitted work.</p>
          </div>
          <span className="au-result-summary">Showing {visible.length} of {students.length}</span>
        </div>
        <div className="au-directory-tools">
          <div className="au-filter-tabs" aria-label="Filter students by division">
            {['All', ...DIVISIONS].map(d => (
              <button key={d} className={division === d ? 'active' : ''} onClick={() => setDivision(d)}>
                {d}<small>{d === 'All' ? students.length : byDiv[d]}</small>
              </button>
            ))}
          </div>
          <div className="admin-search">
            <Search size={15} className="admin-search-icon" />
            <input
              className="admin-search-input"
              placeholder="Search by name, email, position…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Student</th><th>Division</th><th>Position</th><th>Date Joined</th><th aria-label="Open progress" /></tr>
            </thead>
            <tbody>
              {visible.map(s => (
                <tr
                  key={s.id}
                  className="au-row"
                  tabIndex={0}
                  onClick={() => setSelected(s)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(s) } }}
                >
                  <td>
                    <div className="admin-emp">
                      <Avatar name={s.name} gender={s.gender} className="admin-emp-avatar" />
                      <div className="admin-emp-info">
                        <span className="admin-emp-name">{s.name || '(no name)'}</span>
                        <span className="admin-emp-email">{s.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={`au-division au-division-${(s.division || 'none').toLowerCase()}`}>{s.division || '—'}</span></td>
                  <td className="au-position">{s.position || '—'}</td>
                  <td>{fmtDate(s.joined)}</td>
                  <td className="au-row-open"><ChevronRight size={17} /></td>
                </tr>
              ))}
              {loading && <tr><td colSpan={5} className="admin-empty">Loading…</td></tr>}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={5} className="admin-empty">No students match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {selected && (
        <StudentProgressModal student={selected} onClose={() => setSelected(null)} />
      )}

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
