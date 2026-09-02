import { useEffect, useMemo, useState } from 'react'
import {
  Activity, BookOpen, CalendarDays, Clock3, Database, FileQuestion,
  Megaphone, RefreshCw, Search, ShieldCheck, UserRound, Users,
} from 'lucide-react'
import { getAuditLogs } from '../auditStore'
import './AdminAuditHistory.css'

const TYPES = [
  { value: 'all', label: 'All activity', icon: Activity },
  { value: 'course', label: 'Courses', icon: BookOpen },
  { value: 'user', label: 'Users', icon: Users },
  { value: 'exam', label: 'Exams', icon: FileQuestion },
  { value: 'announcement', label: 'Announcements', icon: Megaphone },
]

const ENTITY_CONFIG = {
  course: { label: 'Course', icon: BookOpen, tone: 'green' },
  user: { label: 'User', icon: Users, tone: 'blue' },
  exam: { label: 'Exam', icon: FileQuestion, tone: 'violet' },
  announcement: { label: 'Announcement', icon: Megaphone, tone: 'amber' },
}

const ACTION_LABELS = { created: 'Created', updated: 'Updated', deleted: 'Deleted' }

const formatDate = value => new Date(value).toLocaleString('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
})

const dateKey = value => new Date(value).toLocaleDateString('en-CA')

const formatDay = value => {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const changeSummary = log => {
  if (log.action === 'created') return 'A new administrative record was added.'
  if (log.action === 'deleted') return 'The administrative record was permanently removed.'

  const before = log.details?.before || {}
  const after = log.details?.after || {}
  const ignored = new Set(['updated_at', 'created_at'])
  const changed = Object.keys(after).filter(key => !ignored.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))

  if (!changed.length) return 'The record information was updated.'
  const readable = changed.slice(0, 3).map(key => key.replaceAll('_', ' ')).join(', ')
  return `Changed ${readable}${changed.length > 3 ? ` and ${changed.length - 3} more` : ''}.`
}

export default function AdminAuditHistory() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await getAuditLogs()
    setLogs(data)
    if (loadError) setError(loadError.message)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const typeCounts = useMemo(() => logs.reduce((counts, log) => {
    counts[log.entity_type] = (counts[log.entity_type] || 0) + 1
    return counts
  }, {}), [logs])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return logs.filter(log => {
      const matchesType = type === 'all' || log.entity_type === type
      const matchesQuery = !needle || [log.actor_name, log.actor_email, log.entity_label, log.action, log.entity_type]
        .some(value => String(value || '').toLowerCase().includes(needle))
      return matchesType && matchesQuery
    })
  }, [logs, query, type])

  const groupedLogs = useMemo(() => visible.reduce((groups, log) => {
    const key = dateKey(log.created_at)
    if (!groups[key]) groups[key] = { label: formatDay(log.created_at), logs: [] }
    groups[key].logs.push(log)
    return groups
  }, {}), [visible])

  const todayCount = logs.filter(log => dateKey(log.created_at) === dateKey(new Date())).length
  const administratorCount = new Set(logs.map(log => log.actor_id || log.actor_email).filter(Boolean)).size
  const deletionCount = logs.filter(log => log.action === 'deleted').length

  return (
    <div className="audit-page">
      <div className="admin-head audit-head">
        <div>
          <span className="audit-kicker">Administration oversight</span>
          <h1 className="admin-title">Audit History</h1>
          <p className="admin-sub">Review who changed system records, what they changed, and when it happened.</p>
        </div>
        <button className="audit-refresh" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? 'is-spinning' : ''} size={15} /> {loading ? 'Refreshing' : 'Refresh log'}
        </button>
      </div>

      <section className="audit-overview">
        <div className="audit-metric audit-metric-total">
          <span><Activity size={19} /></span>
          <div><strong>{loading || error ? '—' : logs.length}</strong><b>Total activities</b><small>Recorded administrative actions</small></div>
        </div>
        <div className="audit-metric audit-metric-today">
          <span><CalendarDays size={19} /></span>
          <div><strong>{loading || error ? '—' : todayCount}</strong><b>Actions today</b><small>Changes made since midnight</small></div>
        </div>
        <div className="audit-metric audit-metric-admin">
          <span><UserRound size={19} /></span>
          <div><strong>{loading || error ? '—' : administratorCount}</strong><b>Administrators</b><small>People represented in the log</small></div>
        </div>
        <div className="audit-integrity">
          <span><ShieldCheck size={22} /></span>
          <div>
            <small>Audit integrity</small>
            <strong>{error ? 'Setup required' : 'Protected activity trail'}</strong>
            <p>{error ? 'Connect the audit table to begin recording changes.' : `${deletionCount} deletion${deletionCount === 1 ? '' : 's'} documented in the current history.`}</p>
          </div>
        </div>
      </section>

      <section className="audit-workspace">
        <header className="audit-workspace-head">
          <div>
            <h2>Administrative activity <span>{error ? '—' : visible.length}</span></h2>
            <p>Newest recorded actions appear first.</p>
          </div>
          <label className="audit-search">
            <Search size={15} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search administrator or record..." />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">Clear</button>}
          </label>
        </header>

        <nav className="audit-filters" aria-label="Filter audit history">
          {TYPES.map(item => {
            const Icon = item.icon
            const count = item.value === 'all' ? logs.length : typeCounts[item.value] || 0
            return (
              <button key={item.value} className={type === item.value ? 'is-active' : ''} onClick={() => setType(item.value)}>
                <Icon size={14} /><span>{item.label}</span><b>{error ? '—' : count}</b>
              </button>
            )
          })}
        </nav>

        <div className="audit-content">
          {loading ? (
            <div className="audit-loading">
              <span><RefreshCw size={22} /></span><strong>Loading audit activity</strong><p>Retrieving the latest administrative records...</p>
            </div>
          ) : error ? (
            <div className="audit-setup">
              <div className="audit-setup-icon"><Database size={29} /></div>
              <div className="audit-setup-copy">
                <small>Database connection</small>
                <h3>Audit history needs to be activated</h3>
                <p>The interface is ready, but the audit table has not been added to this Supabase project yet.</p>
              </div>
              <div className="audit-setup-steps">
                <div><span>1</span><p><strong>Open the Supabase SQL Editor</strong><small>Use the project connected to this application.</small></p></div>
                <div><span>2</span><p><strong>Run the included migration</strong><code>supabase/migrations/add-audit-history.sql</code></p></div>
                <div><span>3</span><p><strong>Return here and refresh</strong><small>New administrative actions will begin appearing.</small></p></div>
              </div>
              <div className="audit-setup-footer">
                <details><summary>Technical details</summary><code>{error}</code></details>
                <button onClick={load}><RefreshCw size={14} /> Try again</button>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div className="audit-empty">
              <Search size={27} /><strong>No matching activity</strong><p>Try another search term or select a different record type.</p>
              <button onClick={() => { setQuery(''); setType('all') }}>Clear filters</button>
            </div>
          ) : (
            <div className="audit-timeline">
              {Object.entries(groupedLogs).map(([key, group]) => (
                <section key={key} className="audit-day">
                  <div className="audit-day-label"><span>{group.label}</span><b>{group.logs.length} {group.logs.length === 1 ? 'action' : 'actions'}</b></div>
                  <div className="audit-day-list">
                    {group.logs.map(log => {
                      const config = ENTITY_CONFIG[log.entity_type] || { label: log.entity_type || 'Record', icon: Activity, tone: 'slate' }
                      const EntityIcon = config.icon
                      return (
                        <article key={log.id} className="audit-row">
                          <span className={`audit-entity-icon tone-${config.tone}`}><EntityIcon size={17} /></span>
                          <div className="audit-main">
                            <div className="audit-row-title">
                              <strong>{log.entity_label || log.entity_id || `${config.label} record`}</strong>
                              <span className={`audit-action action-${log.action}`}>{ACTION_LABELS[log.action] || log.action}</span>
                            </div>
                            <p>{changeSummary(log)}</p>
                            <div className="audit-actor"><UserRound size={12} /><b>{log.actor_name || 'Unknown administrator'}</b><span>{log.actor_email || 'No email snapshot'}</span></div>
                          </div>
                          <div className="audit-row-meta">
                            <span>{config.label}</span>
                            <time dateTime={log.created_at}><Clock3 size={12} /> {formatDate(log.created_at)}</time>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
