import { useEffect, useMemo, useState } from 'react'
import { Activity, Filter, RefreshCw, Search } from 'lucide-react'
import { getAuditLogs } from '../auditStore'
import './AdminAuditHistory.css'

const TYPES = ['all', 'course', 'user', 'exam', 'announcement']
const TYPE_LABEL = { all: 'All records', course: 'Courses', user: 'Users', exam: 'Exams', announcement: 'Announcements' }

const formatDate = value => new Date(value).toLocaleString('en-PH', {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})

export default function AdminAuditHistory() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await getAuditLogs({ entityType: type })
    setLogs(data)
    if (loadError) setError(loadError.message)
    setLoading(false)
  }

  useEffect(() => { load() }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return logs
    return logs.filter(log => [log.actor_name, log.actor_email, log.entity_label, log.action, log.entity_type]
      .some(value => String(value || '').toLowerCase().includes(needle)))
  }, [logs, query])

  return (
    <div className="audit-page">
      <div className="admin-head audit-head">
        <div>
          <h1 className="admin-title">Audit History</h1>
          <p className="admin-sub">Immutable record of important administrative changes</p>
        </div>
        <button className="audit-refresh" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="audit-toolbar">
        <label className="audit-search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search actor or record…" /></label>
        <label className="audit-filter"><Filter size={14} /><select value={type} onChange={e => setType(e.target.value)}>{TYPES.map(item => <option key={item} value={item}>{TYPE_LABEL[item]}</option>)}</select></label>
      </div>

      <div className="admin-card audit-card">
        {loading ? <p className="admin-empty">Loading audit history…</p>
          : error ? <div className="audit-error"><strong>Audit history is not available.</strong><span>{error}</span><small>Apply the add-audit-history.sql Supabase migration, then refresh.</small></div>
          : visible.length === 0 ? <div className="audit-empty"><Activity size={30} /><p>No matching administrative activity yet.</p></div>
          : <div className="audit-list">{visible.map(log => (
            <article key={log.id} className="audit-row">
              <span className={`audit-action action-${log.action}`}>{log.action}</span>
              <div className="audit-main">
                <p><strong>{log.actor_name || log.actor_email || 'Unknown administrator'}</strong> {log.action} <b>{log.entity_type}</b> <span>{log.entity_label || log.entity_id || 'record'}</span></p>
                <small>{log.actor_email || 'No email snapshot'} · ID {log.entity_id || '—'}</small>
              </div>
              <time dateTime={log.created_at}>{formatDate(log.created_at)}</time>
            </article>
          ))}</div>}
      </div>
    </div>
  )
}
