import { useMemo } from 'react'
import { X, PlayCircle, ClipboardList, FileText, GraduationCap } from 'lucide-react'
import Avatar from './Avatar'
import { useCourses } from '../courseStore'
import { useUserProgress } from '../completion'
import './StudentProgressModal.css'

const DIV_ORDER = { PBD: 0, LTS: 1, AJD: 2, Admin: 3 }

// Per-session progress for one student — video, assignments, pre/post tests.
export default function StudentProgressModal({ student, onClose }) {
  const { courses } = useCourses()
  const prog = useUserProgress(student.id)

  const rows = useMemo(() => {
    const sorted = [...courses].sort(
      (a, b) => (DIV_ORDER[a.division] - DIV_ORDER[b.division]) || (a.session - b.session)
    )
    return sorted.map(c => {
      const vids = prog.sessionVideos[c.id] || []
      const watched = vids.filter(v => prog.videoProg[v.id]?.completed).length
      const tasks = prog.tasks[c.id] || []
      const tDone = tasks.filter(t => prog.submissions[t.id]).length
      const pre = prog.results[`${c.id}-pre`]
      const post = prog.results[`${c.id}-post`]
      return {
        id: c.id, division: c.division, session: c.session, title: c.title,
        videoPct: vids.length ? Math.round((watched / vids.length) * 100) : null,
        taskDone: tDone, taskTotal: tasks.length,
        taskPct: tasks.length ? Math.round((tDone / tasks.length) * 100) : null,
        preTaken: !!pre,
        postPct: post ? post.pct : null,
      }
    })
  }, [courses, prog])

  const isDone = r =>
    (r.videoPct === null || r.videoPct === 100) &&
    (r.taskTotal === 0 || r.taskDone === r.taskTotal) &&
    r.preTaken && r.postPct !== null
  const done = rows.filter(isDone).length
  const overall = rows.length ? Math.round((done / rows.length) * 100) : 0

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={e => e.stopPropagation()}>
        <header className="sp-head">
          <Avatar name={student.name} gender={student.gender} className="sp-avatar" />
          <div className="sp-id">
            <h3 className="sp-name">{student.name || '(no name)'}</h3>
            <p className="sp-sub">{student.email}</p>
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
                  <tr key={r.id} className={isDone(r) ? 'sp-row-done' : ''}>
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
                        <div className="sp-metric">
                          <span className="sp-val">{r.taskDone}/{r.taskTotal}</span>
                          <span className="sp-bar"><span className="sp-fill sp-fill-t" style={{ width: `${r.taskPct}%` }} /></span>
                        </div>
                      )}
                    </td>
                    <td>
                      {r.preTaken
                        ? <span className="sp-chip sp-chip-done">Done</span>
                        : <span className="sp-dash">—</span>}
                    </td>
                    <td>
                      {r.postPct === null
                        ? <span className="sp-dash">—</span>
                        : <span className={`sp-chip ${r.postPct >= 80 ? 'sp-chip-pass' : 'sp-chip-fail'}`}>{r.postPct}%</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
