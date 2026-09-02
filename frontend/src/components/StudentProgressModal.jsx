import { useMemo, useState } from 'react'
import { X, PlayCircle, ClipboardList, FileText, GraduationCap, Check, ChevronRight, Building2, Briefcase, Mail } from 'lucide-react'
import Avatar from './Avatar'
import SessionOutputModal from './SessionOutputModal'
import { useCourses } from '../courseStore'
import { useUserProgress } from '../completion'
import './StudentProgressModal.css'

const DIV_ORDER = { PBD: 0, LTS: 1, AJD: 2, Admin: 3 }

// Per-session progress for one student — video, assignments, pre/post tests.
export default function StudentProgressModal({ student, onClose }) {
  const { courses } = useCourses()
  const prog = useUserProgress(student.id)
  // Which cell's detail panel is open: { course, kind: 'task'|'pre'|'post' }.
  const [detail, setDetail] = useState(null)
  // Live overrides from admin reviews done in this session, so the table + ring
  // update immediately without refetching. Keyed by task_id.
  const [reviewed, setReviewed] = useState({})
  const submissions = useMemo(() => ({ ...prog.submissions, ...reviewed }), [prog.submissions, reviewed])
  const courseById = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses])

  const rows = useMemo(() => {
    const sorted = [...courses].sort(
      (a, b) => (DIV_ORDER[a.division] - DIV_ORDER[b.division]) || (a.session - b.session)
    )
    return sorted.map(c => {
      const vids = prog.sessionVideos[c.id] || []
      const watched = vids.filter(v => prog.videoProg[v.id]?.completed).length
      const tasks = prog.tasks[c.id] || []
      const tPassed = tasks.filter(t => submissions[t.id]?.status === 'passed').length
      const tSubmitted = tasks.filter(t => submissions[t.id]).length
      const pre = prog.results[`${c.id}-pre`]
      const post = prog.results[`${c.id}-post`]
      return {
        id: c.id, division: c.division, session: c.session, title: c.title,
        videoPct: vids.length ? Math.round((watched / vids.length) * 100) : null,
        taskPassed: tPassed, taskSubmitted: tSubmitted, taskTotal: tasks.length,
        preTaken: !!pre,
        postPct: post ? post.pct : null,
      }
    })
  }, [courses, prog, submissions])

  const isDone = r =>
    (r.videoPct === null || r.videoPct === 100) &&
    (r.taskTotal === 0 || r.taskPassed === r.taskTotal) &&
    r.preTaken && r.postPct !== null
  const hasStarted = r =>
    (r.videoPct !== null && r.videoPct > 0) ||
    r.taskSubmitted > 0 || r.preTaken || r.postPct !== null
  const done = rows.filter(isDone).length
  const overall = rows.length ? Math.round((done / rows.length) * 100) : 0

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={e => e.stopPropagation()}>
        <header className="sp-record-head">
          <div className="sp-profile">
            <div className="sp-avatar-wrap">
              <Avatar name={student.name} gender={student.gender} className="sp-avatar" />
            </div>
            <div className="sp-id">
              <span className="sp-eyebrow"><GraduationCap size={12} /> Learner performance record</span>
              <h3 className="sp-name">{student.name || '(no name)'}</h3>
              <div className="sp-identity-details">
                <span className="sp-identity-detail">
                  <Building2 size={14} />
                  <span><small>Division</small><strong>{student.division || '—'}</strong></span>
                </span>
                <span className="sp-identity-detail">
                  <Briefcase size={14} />
                  <span><small>Position</small><strong>{student.position || '—'}</strong></span>
                </span>
                {student.email && (
                  <span className="sp-identity-detail email">
                    <Mail size={14} />
                    <span><small>Email address</small><strong title={student.email}>{student.email}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="sp-record-metrics">
            <div><strong>{overall}%</strong><span>Overall progress</span></div>
            <div><strong>{done}</strong><span>Completed</span></div>
            <div><strong>{Math.max(rows.length - done, 0)}</strong><span>Remaining</span></div>
          </div>
          <button className="sp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="sp-progress-strip">
          <div className="sp-progress-label">
            <span><GraduationCap size={17} /></span>
            <div><strong>Learning path completion</strong><small>{done} of {rows.length} sessions complete</small></div>
          </div>
          <div className="sp-progress-track"><span style={{ width: `${overall}%` }} /></div>
          <strong className="sp-progress-value">{overall}%</strong>
        </div>

        <div className="sp-body">
          <div className="sp-list-intro">
            <div><h4>Session requirements</h4><p>Review each learning component and open submitted work or assessment results.</p></div>
            <span>{rows.length} sessions</span>
          </div>
          {prog.loading ? <p className="sp-loading">Loading progress…</p> : (
            <div className="sp-session-list">
              {rows.map(r => {
                const completed = isDone(r)
                const started = hasStarted(r)
                return (
                  <article key={r.id} className={`sp-session-card sp-row-${r.division.toLowerCase()}${completed ? ' complete' : ''}`}>
                    <div className="sp-course-block">
                      <div className="sp-course-topline">
                        <span className={`sp-div sp-div-${r.division.toLowerCase()}`}>{r.division}</span>
                        <span className={`sp-course-status ${completed ? 'complete' : started ? 'active' : ''}`}>
                          {completed ? 'Completed' : started ? 'In progress' : 'Not started'}
                        </span>
                      </div>
                      <div className="sp-course-title">
                        <span className="sp-session-num">S{r.session}</span>
                        <h5 title={r.title}>{r.title}</h5>
                      </div>
                    </div>

                    <div className="sp-requirements">
                      <div className={`sp-req${r.videoPct === 100 ? ' complete' : ''}`}>
                        <span className="sp-req-icon video"><PlayCircle size={17} /></span>
                        <div className="sp-req-copy"><small>Video</small><strong>{r.videoPct === null ? 'No video' : `${r.videoPct}% watched`}</strong></div>
                        {r.videoPct !== null && <span className="sp-req-meter"><i style={{ width: `${r.videoPct}%` }} /></span>}
                      </div>

                      {r.taskTotal === 0 ? (
                        <div className="sp-req">
                          <span className="sp-req-icon task"><ClipboardList size={17} /></span>
                          <div className="sp-req-copy"><small>Tasks</small><strong>No task</strong></div>
                        </div>
                      ) : (
                        <button className={`sp-req clickable${r.taskPassed === r.taskTotal ? ' complete' : ''}`} onClick={() => setDetail({ course: courseById[r.id], kind: 'task' })}>
                          <span className="sp-req-icon task"><ClipboardList size={17} /></span>
                          <div className="sp-req-copy"><small>Tasks</small><strong>{r.taskPassed === r.taskTotal ? 'Passed' : r.taskSubmitted > 0 ? 'Review needed' : 'Not submitted'}</strong></div>
                          <ChevronRight size={16} />
                        </button>
                      )}

                      {r.preTaken ? (
                        <button className="sp-req clickable complete" onClick={() => setDetail({ course: courseById[r.id], kind: 'pre' })}>
                          <span className="sp-req-icon pre"><FileText size={17} /></span>
                          <div className="sp-req-copy"><small>Pre-Test</small><strong><Check size={13} /> Completed</strong></div>
                          <ChevronRight size={16} />
                        </button>
                      ) : (
                        <div className="sp-req"><span className="sp-req-icon pre"><FileText size={17} /></span><div className="sp-req-copy"><small>Pre-Test</small><strong>Not taken</strong></div></div>
                      )}

                      {r.postPct === null ? (
                        <div className="sp-req"><span className="sp-req-icon post"><FileText size={17} /></span><div className="sp-req-copy"><small>Post-Test</small><strong>Not taken</strong></div></div>
                      ) : (
                        <button className={`sp-req clickable${r.postPct >= 80 ? ' complete' : ' attention'}`} onClick={() => setDetail({ course: courseById[r.id], kind: 'post' })}>
                          <span className="sp-req-icon post"><FileText size={17} /></span>
                          <div className="sp-req-copy"><small>Post-Test</small><strong>{r.postPct}% · {r.postPct >= 80 ? 'Passed' : 'Below target'}</strong></div>
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {detail && detail.course && (
        <SessionOutputModal
          student={student}
          course={detail.course}
          kind={detail.kind}
          prog={{ ...prog, submissions }}
          onReviewed={(taskId, sub) => setReviewed(prev => ({ ...prev, [taskId]: sub }))}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
