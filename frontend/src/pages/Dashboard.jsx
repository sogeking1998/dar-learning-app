import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  CheckCircle2, Clock, BarChart2, Award, ChevronDown,
  Sprout, ScrollText, Scale, Building2, BookOpen
} from 'lucide-react'
import { MOCK_COURSES } from '../mockData'
import './Dashboard.css'

const DIV_META = {
  PBD:   { full: 'Program Beneficiaries Development', icon: Sprout },
  LTS:   { full: 'Land Tenure Services',              icon: ScrollText },
  AJD:   { full: 'Adjudication',                      icon: Scale },
  Admin: { full: 'Administrative Services',           icon: Building2 },
}

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

export default function Dashboard() {
  const [courses, setCourses] = useState(MOCK_COURSES)
  const [openDivs, setOpenDivs] = useState({})

  const toggleDiv = div => setOpenDivs(prev => ({ ...prev, [div]: !prev[div] }))

  useEffect(() => {
    axios.get('/api/dashboard')
      .then(r => setCourses(r.data.courses))
      .catch(() => {})
  }, [])

  const total      = courses.length
  const completed  = courses.filter(c => c.status === 'completed').length
  const inProgress = courses.filter(c => c.status === 'in_progress').length
  const overall    = Math.round(courses.reduce((s, c) => s + c.progress, 0) / (total || 1))

  const divisions = [...new Set(courses.map(c => c.division))]

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">My Dashboard</h1>
        <p className="page-sub">Track your learning progress and module completion</p>
      </div>

      {/* Summary stats */}
      <div className="db-stats">
        {[
          { icon: BarChart2,   value: `${overall}%`, label: 'Overall Completion', cls: 'ds-yellow' },
          { icon: CheckCircle2,value: completed,      label: 'Modules Completed',  cls: 'ds-green'  },
          { icon: Clock,       value: inProgress,     label: 'In Progress',         cls: 'ds-blue'   },
          { icon: Award,       value: total,          label: 'Total Modules',       cls: 'ds-gray'   },
        ].map(({ icon: Icon, value, label, cls }) => (
          <div key={label} className={`db-stat-card ${cls}`}>
            <div className="dsc-icon"><Icon size={26} /></div>
            <div>
              <p className="dsc-value">{value}</p>
              <p className="dsc-label">{label}</p>
            </div>
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
            <span>{total - completed - inProgress} not yet started</span>
          </div>
        </div>
        <div className="doc-ring"><DonutRing value={overall} /></div>
      </div>

      {/* Module list by division */}
      <div className="db-modules-header">
        <h2 className="section-title">Complete Modules &amp; Tasks</h2>
      </div>

      <div className="db-modules">
        {divisions.map(div => {
          const divCourses = courses.filter(c => c.division === div)
          const divTotal   = divCourses.length
          const divDone    = divCourses.filter(c => c.status === 'completed').length
          const divPct     = Math.round(divCourses.reduce((s, c) => s + c.progress, 0) / (divTotal || 1))
          const isOpen     = !!openDivs[div]
          const meta       = DIV_META[div] || { full: '', icon: BookOpen }
          const DivIcon    = meta.icon
          const status     = divDone === divTotal ? 'Completed' : divPct > 0 ? 'In Progress' : 'Not Started'
          const statusCls  = divDone === divTotal ? 'dhs-done' : divPct > 0 ? 'dhs-active' : 'dhs-none'

          return (
          <div key={div} className={`division-group${isOpen ? ' open' : ''}`}>
            <button
              className={`division-head dl-${div.toLowerCase()}${isOpen ? ' open' : ''}`}
              onClick={() => toggleDiv(div)}
              aria-expanded={isOpen}
            >
              <span className="dh-icon"><DivIcon size={18} /></span>
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
                <ChevronDown size={17} className={`dh-chevron${isOpen ? ' open' : ''}`} />
              </span>
            </button>
            {isOpen && (
            <div className="module-list">
              {divCourses.map(course => (
                <div key={course.id} className="module-row">
                  <div className="mr-left">
                    <StatusIcon status={course.status} />
                    <div className="mr-info">
                      <p className="mr-title">
                        {div}: Session {course.session} – {course.title}
                      </p>
                      <p className="mr-meta">{course.duration}</p>
                    </div>
                  </div>

                  <div className="mr-right">
                    <div className="mr-bar-wrap">
                      <div className="mr-bar">
                        <div
                          className="mr-fill"
                          style={{
                            width: `${course.progress}%`,
                            background:
                              course.progress === 100 ? 'var(--g500)'
                              : course.progress > 0   ? 'var(--b500)'
                              : 'transparent'
                          }}
                        />
                      </div>
                      <span className="mr-pct">{course.progress}%</span>
                    </div>
                    <span className={`status-chip ${
                      course.status === 'completed'  ? 'chip-done'
                      : course.status === 'in_progress' ? 'chip-progress'
                      : 'chip-pending'
                    }`}>
                      {course.status === 'completed'  ? 'Completed'
                       : course.status === 'in_progress' ? 'In Progress'
                       : 'Not Started'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
