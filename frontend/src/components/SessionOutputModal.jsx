import { useState, useEffect } from 'react'
import { X, FileText, ClipboardList, CheckCircle2, XCircle, Clock, Download, Lock } from 'lucide-react'
import { getQuestions } from '../examStore'
import { getSubmissionUrl, reviewSubmission } from '../taskStore'
import { useAuth } from '../AuthContext'
import './StudentProgressModal.css'

const KIND_LABEL = { task: 'Tasks', pre: 'Pre-Test', post: 'Post-Test' }

// Detail panel opened from a cell in the StudentProgressModal table. Shows the
// selected student's actual output for one session: task submissions (which the
// admin reviews as passed/failed), or the per-question breakdown of a test.
export default function SessionOutputModal({ student, course, kind, prog, onReviewed, onClose }) {
  const { session } = useAuth()
  const reviewerId = session?.user?.id
  const [busy, setBusy] = useState(null)   // task_id currently being reviewed
  const isTest = kind === 'pre' || kind === 'post'
  const result = prog.results[`${course.id}-${kind}`]
  const tasks = prog.tasks[course.id] || []

  const [questions, setQuestions] = useState(null)
  useEffect(() => {
    if (!isTest) return
    let active = true
    getQuestions(course.id, kind).then(qs => { if (active) setQuestions(qs) })
    return () => { active = false }
  }, [isTest, course.id, kind])

  const answers = result?.answers || {}

  const openFile = async filePath => {
    const { url, error } = await getSubmissionUrl(filePath)
    if (url) window.open(url, '_blank', 'noopener')
    else alert(error?.message || 'Could not open the file.')
  }

  const review = async (taskId, status) => {
    setBusy(taskId)
    const { data, error } = await reviewSubmission(student.id, taskId, status, reviewerId)
    setBusy(null)
    if (error) { alert('Could not save the review: ' + error.message); return }
    if (onReviewed) onReviewed(taskId, data || { ...prog.submissions[taskId], status })
  }

  return (
    <div className="so-overlay" onClick={onClose}>
      <div className="so-modal" onClick={e => e.stopPropagation()}>
        <header className="so-head">
          <span className="so-head-icon">
            {isTest ? <FileText size={17} /> : <ClipboardList size={17} />}
          </span>
          <div className="so-head-id">
            <h3 className="so-title">{KIND_LABEL[kind]}</h3>
            <p className="so-sub">
              {student.name || 'Student'} · <span className={`so-div so-div-${course.division.toLowerCase()}`}>{course.division}</span> Session {course.session}
            </p>
          </div>
          {isTest && result && (
            <div className={`so-score ${result.pct >= 80 ? 'pass' : 'fail'}`}>
              <strong>{result.score}/{result.total}</strong>
              <span>{result.pct}%</span>
            </div>
          )}
          <button className="so-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="so-body">
          {/* ── Task submissions ── */}
          {!isTest && (
            tasks.length === 0 ? (
              <p className="so-empty">This session has no tasks.</p>
            ) : (
              <ul className="so-task-list">
                {tasks.map(t => {
                  const sub = prog.submissions[t.id]
                  const st = sub?.status
                  return (
                    <li key={t.id} className={`so-task${st === 'passed' ? ' done' : st === 'failed' ? ' failed' : ''}`}>
                      <div className="so-task-head">
                        <div className="so-task-info">
                          <p className="so-task-title">{t.title}</p>
                          {sub
                            ? <p className="so-task-meta">
                                Submitted {new Date(sub.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} · {sub.file_name}
                              </p>
                            : <p className="so-task-meta pending">Not submitted yet</p>}
                        </div>
                        {sub && (
                          <span className={`so-status so-status-${st || 'pending'}`}>
                            {st === 'passed' ? <><CheckCircle2 size={13} /> Passed</>
                              : st === 'failed' ? <><XCircle size={13} /> Failed</>
                              : <><Clock size={13} /> In review</>}
                          </span>
                        )}
                      </div>

                      {sub ? (
                        <div className="so-task-actions">
                          <button className="so-file-btn" onClick={() => openFile(sub.file_path)}>
                            <Download size={14} /> Open file
                          </button>
                          <div className="so-review-btns">
                            <button
                              className={`so-review pass${st === 'passed' ? ' active' : ''}`}
                              disabled={busy === t.id}
                              onClick={() => review(t.id, 'passed')}
                            >
                              <CheckCircle2 size={14} /> Pass
                            </button>
                            <button
                              className={`so-review fail${st === 'failed' ? ' active' : ''}`}
                              disabled={busy === t.id}
                              onClick={() => review(t.id, 'failed')}
                            >
                              <XCircle size={14} /> Fail
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="so-locked"><Lock size={13} /> Pass/Fail grading unlocks once the student uploads a file.</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )
          )}

          {/* ── Test attempt ── */}
          {isTest && (
            !result ? (
              <p className="so-empty">This student hasn’t taken the {KIND_LABEL[kind].toLowerCase()} yet.</p>
            ) : questions === null ? (
              <p className="so-empty">Loading answers…</p>
            ) : questions.length === 0 ? (
              <p className="so-empty">No questions are set up for this {KIND_LABEL[kind].toLowerCase()}.</p>
            ) : (
              <ol className="so-q-list">
                {questions.map((q, qi) => {
                  const chosen = answers[q.id]
                  const correct = chosen === q.answer
                  const answered = chosen != null
                  return (
                    <li key={q.id} className={`so-q${!answered ? ' skipped' : correct ? ' correct' : ' wrong'}`}>
                      <p className="so-q-text"><span className="so-q-num">{qi + 1}</span>{q.text}</p>
                      <div className="so-choices">
                        {q.choices.map((c, ci) => {
                          const isChosen = chosen === ci
                          const isKey = q.answer === ci
                          return (
                            <div key={ci} className={`so-choice${isKey ? ' key' : ''}${isChosen && !isKey ? ' picked-wrong' : ''}`}>
                              <span className="so-choice-text">{c}</span>
                              {isChosen && <span className="so-choice-tag you">Your answer</span>}
                              {isKey && <span className="so-choice-tag ans"><CheckCircle2 size={12} /> Correct</span>}
                            </div>
                          )
                        })}
                        {!answered && <p className="so-q-skip">Not answered</p>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )
          )}
        </div>
      </div>
    </div>
  )
}
