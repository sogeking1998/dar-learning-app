import { useMemo, useState } from 'react'
import { X, PlayCircle, ClipboardList, FileText, GraduationCap, Check, ChevronRight } from 'lucide-react'
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
  const done = rows.filter(isDone).length
  const overall = rows.length ? Math.round((done / rows.length) * 100) : 0

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={e => e.stopPropagation()}>
        <header className="sp-head">
          <div
            className="sp-avatar-wrap"
            style={{ background: `conic-gradient(#22c55e ${overall}%, #e4ebe6 0)` }}
          >
            <Avatar name={student.name} gender={student.gender} className="sp-avatar" />
            <span className="sp-avatar-badge">{overall}%</span>
          </div>
          <div className="sp-id">
            <h3 className="sp-name">{student.name || '(no name)'}</h3>
            <span className="sp-meta">{student.division || '—'} · {student.position || '—'}</span>
          </div>
          <button className="sp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="sp-summary">
          <div className="sp-summary-icon"><GraduationCap size={18} /></div>
          <div className="sp-summary-text">
            <p className="sp-summary-lead"><strong>{done}</strong> of <strong>{rows.length}</strong> sessions completed</p>
            <div className="sp-summary-bar"><span style={{ width: `${overall}%` }} /></div>
          </div>
          <span className="sp-summary-pct">{overall}%</span>
        </div>

        <div className="sp-body">
          {prog.loading ? (
            <p className="sp-loading">Loading progress…</p>
          ) : (
            <table className="sp-table">
              <thead>
                <tr>
                  <th className="sp-col-session">Session</th>
                  <th><span className="sp-th"><PlayCircle size={13} /> Video</span></th>
                  <th><span className="sp-th"><ClipboardList size={13} /> Tasks</span></th>
                  <th><span className="sp-th"><FileText size={13} /> Pre-Test</span></th>
                  <th><span className="sp-th"><FileText size={13} /> Post-Test</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className={`sp-row sp-row-${r.division.toLowerCase()}${isDone(r) ? ' sp-row-done' : ''}`}>
                    <td className="sp-session">
                      <span className={`sp-div sp-div-${r.division.toLowerCase()}`}>{r.division}</span>
                      <span className="sp-title" title={r.title}>Session {r.session} — {r.title}</span>
                    </td>
                    <td>
                      {r.videoPct === null ? <span className="sp-dash">—</span> : (
                        <div className="sp-metric">
                          <span className="sp-val">{r.videoPct}%</span>
                          <span className="sp-bar"><span className="sp-fill sp-fill-v" style={{ width: `${r.videoPct}%` }} /></span>
                        </div>
                      )}
                    </td>
                    <td>
                      {r.taskTotal === 0 ? <span className="sp-dash">—</span> : (
                        <button className="sp-cell-btn" onClick={() => setDetail({ course: courseById[r.id], kind: 'task' })} title="Review submissions">
                          {r.taskPassed === r.taskTotal
                            ? <span className="sp-chip sp-chip-done"><Check size={14} /> Passed</span>
                            : r.taskSubmitted > 0
                              ? <span className="sp-chip sp-chip-review">To review</span>
                              : <span className="sp-chip sp-chip-pending">Pending</span>}
                          <ChevronRight size={15} className="sp-caret" />
                        </button>
                      )}
                    </td>
                    <td>
                      {r.preTaken
                        ? <button className="sp-cell-btn" onClick={() => setDetail({ course: courseById[r.id], kind: 'pre' })} title="View answers">
                            <span className="sp-chip sp-chip-done"><Check size={14} /> Done</span>
                            <ChevronRight size={15} className="sp-caret" />
                          </button>
                        : <span className="sp-dash">—</span>}
                    </td>
                    <td>
                      {r.postPct === null
                        ? <span className="sp-dash">—</span>
                        : <button className="sp-cell-btn" onClick={() => setDetail({ course: courseById[r.id], kind: 'post' })} title="View answers">
                            <span className={`sp-chip ${r.postPct >= 80 ? 'sp-chip-pass' : 'sp-chip-fail'}`}>{r.postPct}%</span>
                            <ChevronRight size={15} className="sp-caret" />
                          </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
