import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, Clock, Layers, ChevronDown, Calendar,
  Sprout, ScrollText, Scale, Building2, BookOpen, FolderDown, Award,
  MessageCircle, Link2, ClipboardList,
  PlayCircle, Sparkles, ArrowUpRight,
} from 'lucide-react'
import { useCourses } from '../courseStore'
import { useUser } from '../UserContext'
import { nextLearningStep, sessionCompletion, useUserProgress } from '../completion'
import { getSessionDurations, formatVideoDuration } from '../videoStore'
import './Dashboard.css'

const DIV_META = {
  PBD:   { full: 'Program Beneficiaries Development', icon: Sprout },
  LTS:   { full: 'Land Tenure Services',              icon: ScrollText },
  AJD:   { full: 'Adjudication',                      icon: Scale },
  Admin: { full: 'Administrative Services',           icon: Building2 },
}

const QUICK_LINKS = [
  { to: '/courses',      label: 'Browse Courses',     icon: BookOpen,      cls: 'ql-green'  },
  { to: '/resources',    label: 'Learning Resources', icon: FolderDown,    cls: 'ql-blue'   },
  { to: '/certificates', label: 'My Certificates',    icon: Award,         cls: 'ql-amber'  },
  { to: '/messages',     label: 'Messages',           icon: MessageCircle, cls: 'ql-purple' },
]

function StatusIcon({ status }) {
  if (status === 'completed')
    return <CheckCircle2 size={20} className="status-icon icon-done" />
  return <Clock size={20} className="status-icon icon-pending" />
}

function DonutRing({ value }) {
  const r = 30
  const c = 2 * Math.PI * r
  const off = c - (value / 100) * c
  return (
    <svg viewBox="0 0 76 76" className="doc-ring-svg" aria-hidden="true">
      <defs>
        <linearGradient id="doc-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#15803d" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--bdr2)" strokeWidth="8" />
      <circle cx="38" cy="38" r={r} fill="none" stroke="url(#doc-grad)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" className="doc-ring-text">{value}%</text>
    </svg>
  )
}

// Small decorative squiggle for the stat-card corners — purely visual, not data-driven.
function Sparkline({ seed }) {
  const paths = [
    'M2 20 C 14 22, 20 8, 32 12 S 50 24, 62 10',
    'M2 14 C 12 6, 22 22, 34 14 S 52 4, 62 16',
    'M2 22 C 16 10, 24 18, 36 6 S 50 14, 62 4',
    'M2 10 C 14 20, 26 4, 38 18 S 52 22, 62 12',
  ]
  return (
    <svg viewBox="0 0 64 26" className="dsc-spark" aria-hidden="true">
      <path d={paths[seed % paths.length]} fill="none" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Dashboard() {
  const { courses } = useCourses()
  const [openDivs, setOpenDivs] = useState({})
  const [durations, setDurations] = useState({})  // { course_id: totalVideoSeconds }
  const { user } = useUser()
  const progress = useUserProgress(user?.id)

  const toggleDiv = div => setOpenDivs(prev => ({ ...prev, [div]: !prev[div] }))

  useEffect(() => { getSessionDurations().then(setDurations) }, [])

  // Real completion from Supabase (video + tasks + pre + post).
  const withComp = courses.map(c => ({ ...c, comp: sessionCompletion(c, progress) }))

  const total      = withComp.length
  const completed  = withComp.filter(c => c.comp.status === 'completed').length
  const inProgress = withComp.filter(c => c.comp.status === 'in_progress').length
  const notStarted = total - completed - inProgress
  const overall    = Math.round(withComp.reduce((s, c) => s + c.comp.pct, 0) / (total || 1))

  const divisions = [...new Set(withComp.map(c => c.division))]

  // Generic placeholder names (e.g. an account created before the person filled
  // in their real name) shouldn't be greeted as if they were an actual name —
  // fall back to the email handle instead, which is always a real identifier.
  const ROLE_PLACEHOLDERS = new Set(['employee', 'admin', 'administrator', 'co-pilot', 'copilot', 'user'])
  const rawName = (user?.name || '').trim()
  const emailHandle = (user?.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim()
  const titleCase = s => s.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
  const fullName =
    rawName && !ROLE_PLACEHOLDERS.has(rawName.toLowerCase())
      ? rawName
      : emailHandle
        ? titleCase(emailHandle)
        : 'there'

  const today = new Date()
  const todayDate = today.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  const todayDay  = today.toLocaleDateString('en-PH', { weekday: 'long' })
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Featured "continue learning" pick: the furthest-along in-progress session,
  // falling back to the first not-yet-started one so there's always a next step.
  const featured =
    [...withComp].filter(c => c.comp.status === 'in_progress').sort((a, b) => b.comp.pct - a.comp.pct)[0]
    || withComp.find(c => c.comp.status === 'not_started')
  const nextStep = featured ? nextLearningStep(featured, progress) : null
  const continueHref = featured
    ? `/session/${featured.id}${nextStep?.query ? `?${nextStep.query}` : ''}`
    : null
  const allDone = total > 0 && completed === total

  return (
    <div className="dashboard-page">
      {/* Hero header */}
      <div className="db-hero">
        <div>
          <h1 className="page-title">{greeting}, {fullName}! <span className="db-wave">👋</span></h1>
          <p className="page-sub">Let's continue building knowledge and serving the nation.</p>
        </div>
        <div className="db-hero-right">
          <div className="db-date-pill">
            <Calendar size={16} />
            <div>
              <p className="ddp-date">{todayDate}</p>
              <p className="ddp-day">{todayDay}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue-learning spotlight */}
      {featured && !progress.loading && (
        <a
          className="db-continue"
          href={continueHref}
          target="_blank"
          rel="noreferrer"
        >
          <div className="dc-icon">
            {featured.comp.status === 'in_progress'
              ? <PlayCircle size={26} />
              : <BookOpen size={26} />}
          </div>
          <div className="dc-body">
            <p className="dc-label">
              {featured.comp.status === 'in_progress' ? 'Continue where you left off' : 'Ready when you are'}
            </p>
            <p className="dc-title">{featured.division}: Session {featured.session} – {featured.title}</p>
            {nextStep && <p className="dc-next">Next: {nextStep.label}</p>}
            <div className="dc-bar-wrap">
              <div className="dc-bar"><div className="dc-fill" style={{ width: `${featured.comp.pct}%` }} /></div>
              <span className="dc-pct">{featured.comp.pct}%</span>
            </div>
          </div>
          <span className="dc-cta">
            {featured.comp.status === 'in_progress' ? 'Resume' : 'Start'}
            <ArrowUpRight size={16} />
          </span>
        </a>
      )}
      {!featured && allDone && (
        <div className="db-continue db-continue-done">
          <div className="dc-icon"><Sparkles size={26} /></div>
          <div className="dc-body">
            <p className="dc-label">Every module complete</p>
            <p className="dc-title">Great work, {fullName} — you've finished the full program.</p>
          </div>
          <Link to="/certificates" className="dc-cta">
            View Certificates
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}

      {/* Summary stats */}
      <div className="db-stats">
        {[
          { icon: CheckCircle2,value: completed,      label: 'Modules Completed', note: `Out of ${total} modules`, cls: 'ds-blue'   },
          { icon: Clock,       value: inProgress,     label: 'In Progress',       note: inProgress ? 'Keep learning' : 'Nothing active right now', cls: 'ds-amber' },
          { icon: Layers,      value: total,          label: 'Total Modules',     note: 'Assigned to you',         cls: 'ds-purple' },
        ].map(({ icon: Icon, value, label, note, cls }, i) => (
          <div key={label} className={`db-stat-card ${cls}`}>
            <Sparkline seed={i} />
            <div className="dsc-top">
              <div className="dsc-icon"><Icon size={19} /></div>
              <p className="dsc-label">{label}</p>
            </div>
            <p className="dsc-value">{value}</p>
            <p className="dsc-note">{note}</p>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div className="db-overall-card">
        <div className="doc-main">
          <div className="doc-top">
            <span className="doc-title">Overall Program Progress</span>
            <span className="doc-pct">{overall}% Complete</span>
          </div>
          <div className="doc-bar">
            <div className="doc-fill" style={{ width: `${overall}%` }} />
          </div>
          <div className="doc-bottom">
            <span><b>{completed}</b> of {total} modules completed</span>
            <span>{notStarted} not yet started</span>
          </div>
        </div>

        <div className="doc-divider" />

        <div className="doc-ring-block">
          <DonutRing value={overall} />
          <p className="doc-ring-label">Program Complete</p>
        </div>
      </div>

      {/* Two-column layout: modules + side rail */}
      <div className="db-columns">
        <div className="modules-card">
          <div className="mc-header">
            <div className="mc-header-text">
              <h2 className="section-title">Your Modules &amp; Tasks</h2>
              <div className="mc-metric">
                <span className="mc-metric-badge">{completed}/{total} completed</span>
                <span className="mc-metric-sub">{divisions.length} divisions</span>
              </div>
            </div>
          </div>

          {divisions.map(div => {
            const divCourses = withComp.filter(c => c.division === div)
            const divTotal   = divCourses.length
            const divDone    = divCourses.filter(c => c.comp.status === 'completed').length
            const divPct     = Math.round(divCourses.reduce((s, c) => s + c.comp.pct, 0) / (divTotal || 1))
            const isOpen     = !!openDivs[div]
            const meta       = DIV_META[div] || { full: '', icon: BookOpen }
            const DivIcon    = meta.icon
            const status     = divDone === divTotal ? 'Completed' : divPct > 0 ? 'In Progress' : 'Not Started'
            const statusCls  = divDone === divTotal ? 'dhs-done' : divPct > 0 ? 'dhs-active' : 'dhs-none'

            return (
            <div key={div} className={`division-group${isOpen ? ' open' : ''}`}>
              <button
                className={`division-head${isOpen ? ' open' : ''}`}
                onClick={() => toggleDiv(div)}
                aria-expanded={isOpen}
              >
                <span className="dh-icon">
                  <DivIcon size={17} />
                  {divTotal > 0 && divDone === divTotal && (
                    <span className="dh-icon-check"><CheckCircle2 size={12} /></span>
                  )}
                </span>
                <span className="dh-titles">
                  <span className="dh-name">{div}</span>
                  <span className="dh-full">{meta.full}</span>
                </span>
                <span className="dh-summary">
                  <span className={`dh-status ${statusCls}`}>{status}</span>
                  <span className="dh-progress-wrap">
                    <span className="dh-bar"><span className="dh-fill" style={{ width: `${divPct}%` }} /></span>
                    <span className="dh-pct">{divPct}%</span>
                  </span>
                  <span className="dh-count">{divDone}/{divTotal} modules</span>
                </span>
                <span className="dh-chevron-wrap">
                  <ChevronDown size={16} className={`dh-chevron${isOpen ? ' open' : ''}`} />
                </span>
              </button>
              {isOpen && (
              <div className="module-list">
                {divCourses.map(course => (
                  <a
                    key={course.id}
                    className="module-row"
                    href={`/session/${course.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="mr-left">
                      <StatusIcon status={course.comp.status} />
                      <span className="mr-session-num">S{course.session}</span>
                      <div className="mr-info">
                        <p className="mr-title">{course.title}</p>
                        {formatVideoDuration(durations[course.id]) && (
                          <p className="mr-meta">{formatVideoDuration(durations[course.id])}</p>
                        )}
                      </div>
                    </div>

                    <div className="mr-right">
                      <div className="mr-bar-wrap">
                        <div className="mr-bar">
                          <div
                            className="mr-fill"
                            style={{
                              width: `${course.comp.pct}%`,
                              background:
                                course.comp.pct === 100 ? 'var(--g500)'
                                : course.comp.pct > 0   ? 'var(--b500)'
                                : 'transparent'
                            }}
                          />
                        </div>
                        <span className="mr-pct">{course.comp.pct}%</span>
                      </div>
                      <span className={`status-chip ${
                        course.comp.status === 'completed'  ? 'chip-done'
                        : course.comp.status === 'in_progress' ? 'chip-progress'
                        : 'chip-pending'
                      }`}>
                        {course.comp.status === 'completed'  ? 'Completed'
                         : course.comp.status === 'in_progress' ? 'In Progress'
                         : 'Not Started'}
                      </span>
                      <ArrowUpRight size={15} className="mr-arrow" />
                    </div>
                  </a>
                ))}
              </div>
              )}
            </div>
            )
          })}
        </div>

        <div className="db-side">
          <div className="side-card">
            <div className="side-card-header">
              <h3><Calendar size={16} /> Upcoming</h3>
            </div>
            <div className="upcoming-empty">
              <span className="upcoming-empty-badge"><ClipboardList size={24} /></span>
              <p className="upcoming-empty-title">No upcoming deadlines</p>
              <p className="upcoming-empty-sub">You're all caught up!</p>
            </div>
          </div>

          <div className="side-card">
            <div className="side-card-header">
              <h3><Link2 size={16} /> Quick Links</h3>
            </div>
            <div className="quick-links-grid">
              {QUICK_LINKS.map(({ to, label, icon: Icon, cls }) => (
                <Link key={to} to={to} className={`quick-link-btn ${cls}`}>
                  <Icon size={19} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
