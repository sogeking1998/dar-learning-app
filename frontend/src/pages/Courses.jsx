import { useState } from 'react'
import {
  Users, Map, Scale, Building2, ExternalLink,
  BookOpen, X, Loader2,
} from 'lucide-react'
import { useCourses } from '../courseStore'
import { useUser } from '../UserContext'
import { sessionCompletion, useUserProgress } from '../completion'
import pbdImg from '../assets/courses/pbd.png'
import ltsImg from '../assets/courses/lts.jpeg'
import ajdImg from '../assets/courses/ajd.png'
import adminImg from '../assets/courses/admin.jpeg'
import './Courses.css'

// The four divisions, in display order, with the presentation details
// (full name, blurb, gradient class, icon, header photo) the boxes render.
const DIVISIONS = [
  { code: 'PBD',   name: 'Program Beneficiaries Development', blurb: 'Support services, research, and enterprise development for agrarian reform beneficiaries.', cls: 'pbd',   Icon: Users,     img: pbdImg },
  { code: 'LTS',   name: 'Land Tenure Services',             blurb: 'Land acquisition, distribution, and the processing of EP/CLOA documents.',              cls: 'lts',   Icon: Map,       img: ltsImg },
  { code: 'AJD',   name: 'Agrarian Justice Delivery',        blurb: 'Adjudication and mediation of agrarian disputes and cases.',                            cls: 'ajd',   Icon: Scale,     img: ajdImg },
  { code: 'Admin', name: 'Administrative Services',          blurb: 'Administrative procedures, documentation, and internal protocols.',                    cls: 'admin', Icon: Building2, img: adminImg },
]

const STATUS = {
  completed:   { label: 'Completed',   cls: 'st-done' },
  in_progress: { label: 'In Progress', cls: 'st-progress' },
  not_started: { label: 'Not Started', cls: 'st-pending' },
}

export default function Courses() {
  const { courses, loading } = useCourses()
  const { user } = useUser()
  const progress = useUserProgress(user?.id)
  const [openDiv, setOpenDiv] = useState(null) // division `code` whose modal is open

  // Sessions for one division, sorted, each with real completion.
  const sessionsFor = code =>
    courses
      .filter(c => c.division === code)
      .sort((a, b) => a.session - b.session)
      .map(c => ({ ...c, comp: sessionCompletion(c, progress) }))

  const statsFor = code => {
    const list = sessionsFor(code)
    const done = list.filter(s => s.comp.status === 'completed').length
    const pct = list.length ? Math.round((done / list.length) * 100) : 0
    return { total: list.length, done, pct }
  }

  const active = DIVISIONS.find(d => d.code === openDiv)
  const modalSessions = openDiv ? sessionsFor(openDiv) : []
  const modalStats = openDiv ? statsFor(openDiv) : { done: 0, total: 0, pct: 0 }

  return (
    <div className="courses-page">
      <section className="cv-hero">
        <span className="cv-hero-icon"><BookOpen size={25} /></span>
        <div className="cv-hero-copy">
          <span className="cv-eyebrow">Learning sessions</span>
          <h1>Develop practical skills for public service.</h1>
          <p>Choose a service area to access its guided sessions, requirements, and learning progress.</p>
        </div>
        <div className="cv-hero-stat">
          <strong>{courses.length}</strong>
          <span>Available sessions</span>
        </div>
      </section>

      <section className="cv-browser">
        <div className="cv-browser-head">
          <div>
            <span className="cv-section-label">Browse by division</span>
            <h2>Select a learning area</h2>
          </div>
          <span className="cv-browser-count">{DIVISIONS.length} divisions</span>
        </div>

        <div className="cv-grid">
        {DIVISIONS.map(({ code, name, blurb, cls, Icon, img }) => {
          const s = statsFor(code)
          return (
            <div
              key={code}
              className={`cv-card ${cls}`}
              onClick={() => setOpenDiv(code)}
              role="button"
              tabIndex={0}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpenDiv(code)}
            >
              {/* Header photo, clipped to the card's rounded corners */}
              <div className="cv-media">
                <img src={img} alt="" className="cv-media-img" loading="lazy" />
              </div>
              {/* Icon badge overlaps the photo/body boundary — kept outside
                  .cv-media so its overflow:hidden doesn't clip the badge */}
              <span className="cv-media-icon"><Icon size={26} /></span>

              {/* Body */}
              <div className="cv-body">
                <h3 className="cv-title">{name}</h3>
                <span className="cv-title-rule" aria-hidden="true" />
                <p className="cv-desc">{blurb}</p>
                <div className="cv-progress">
                  <div className="cv-track">
                    <div className="cv-fill" style={{ width: `${s.pct}%` }} />
                  </div>
                  <div className="cv-progress-row">
                    <span>{s.pct}% complete</span>
                    <span>{s.done}/{s.total} sessions</span>
                  </div>
                </div>
                <span className="cv-cta"><ExternalLink size={15} /> Open Course</span>
              </div>
            </div>
          )
        })}
        </div>
      </section>

      {/* Division → sessions modal */}
      {active && (
        <div className="cv-modal-scrim" onClick={() => setOpenDiv(null)}>
          <div className="cv-modal" onClick={e => e.stopPropagation()}>
            <div className={`cv-modal-head ${active.cls}`}>
              <span className="cv-glow" aria-hidden="true" />
              <span className="cv-modal-ficon"><active.Icon size={22} /></span>
              <div className="cv-modal-head-main">
                <h2 className="cv-modal-title">{active.name}</h2>
                <p className="cv-modal-meta">{modalStats.done} of {modalStats.total} sessions completed</p>
              </div>
              <button className="cv-modal-close" onClick={() => setOpenDiv(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="cv-modal-body">
              {loading || progress.loading ? (
                <div className="cv-modal-empty"><Loader2 size={28} className="cv-spin" /><p>Loading sessions…</p></div>
              ) : modalSessions.length === 0 ? (
                <div className="cv-modal-empty"><BookOpen size={32} /><p>No sessions for this division yet.</p></div>
              ) : (
                <ul className="cv-session-list">
                  {modalSessions.map(s => {
                    const st = STATUS[s.comp.status] || STATUS.not_started
                    return (
                      <li key={s.id}>
                        <a
                          className={`cv-session-row ${st.cls}`}
                          href={`/session/${s.id}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open this session in a new tab"
                        >
                          <span className="cv-session-idx">
                            <small>Session</small>
                            <b>{s.session}</b>
                          </span>
                          <div className="cv-session-info">
                            <p className="cv-session-title">{s.title}</p>
                            {s.description && <p className="cv-session-desc">{s.description}</p>}
                          </div>
                          <div className="cv-session-end">
                            <span className="cv-session-state">
                              <span className="cv-dot" />{st.label}
                            </span>
                            <ExternalLink size={16} className="cv-session-open" />
                          </div>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
