import { useState, useEffect, useRef } from 'react'
import { X, CheckCircle2, XCircle, Award, RotateCcw, Clock, AlertTriangle, ArrowRight, Lock } from 'lucide-react'
import { getQuestions, saveResult } from '../examStore'
import { PASS_PCT } from '../completion'
import './QuizModal.css'

const QUESTION_SECONDS = 60

const fmtClock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Build an answer map that yields exactly `targetScore` correct answers,
// used to review an attempt whose per-question answers weren't recorded.
function reconstruct(questions, targetScore) {
  const total = questions.length
  const wrongCount = Math.max(0, total - Math.min(targetScore, total))
  const a = {}
  questions.forEach(q => { a[q.id] = q.answer })
  for (let i = total - 1; i >= 0 && (total - 1 - i) < wrongCount; i--) {
    const q = questions[i]
    a[q.id] = (q.answer + 1) % q.choices.length
  }
  return a
}

export default function QuizModal({ course, type, userId, priorResult, onClose, onSubmitted }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Timed-attempt state
  const [started, setStarted] = useState(false)       // intro accepted → test running
  const [current, setCurrent] = useState(0)           // index of the visible question
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS)
  const advanceRef = useRef(() => {})                 // always points at the latest advance()

  useEffect(() => {
    let active = true
    getQuestions(course.id, type).then(qs => {
      if (!active) return
      setQuestions(qs)
      if (priorResult) {
        setAnswers(priorResult.answers || reconstruct(qs, priorResult.score))
        setSubmitted(true)   // reviewing a past attempt → skip the timed flow
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [course.id, type]) // eslint-disable-line

  const label = type === 'pre' ? 'Pre-Test' : 'Post-Test'
  const graded = type !== 'pre'   // pre-tests are taken for readiness, not scored
  const total = questions.length
  const answered = questions.filter(q => answers[q.id] != null).length
  const score = questions.filter(q => answers[q.id] === q.answer).length
  const pct = total ? Math.round((score / total) * 100) : 0
  const passed = pct >= PASS_PCT

  const choose = (qid, i) => {
    if (submitted) return
    setAnswers(a => ({ ...a, [qid]: i }))
  }

  const submit = async () => {
    if (saving || submitted) return
    setSubmitted(true)
    if (!userId) { setSaveError('You are not signed in — cannot save.'); return }
    setSaving(true)
    const { error } = await saveResult(userId, course.id, type, { score, total, pct, answers })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setSaveError(null)
      if (onSubmitted) onSubmitted()
    }
  }

  // Move to the next question, or submit if this was the last one.
  // Kept in a ref so the per-question timer always calls the latest version.
  advanceRef.current = () => {
    if (current < total - 1) setCurrent(c => c + 1)
    else submit()
  }

  // Per-question countdown: resets to 60s for each question and auto-advances at zero.
  useEffect(() => {
    if (!started || submitted || loading || total === 0) return
    setTimeLeft(QUESTION_SECONDS)
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); advanceRef.current(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [current, started, submitted, loading, total])

  const start = () => { setCurrent(0); setStarted(true) }

  const retake = () => {
    setAnswers({})
    setSubmitted(false)
    setSaveError(null)
    setCurrent(0)
    setStarted(true)
  }

  const inProgress = started && !submitted          // timed flow is live
  const q = questions[current]
  const answeredCurrent = q && answers[q.id] != null
  const isLast = current === total - 1

  // A choice button for the active or review views.
  const renderChoice = (qq, c, i) => {
    const chosen = answers[qq.id] === i
    let cls = 'quiz-choice'
    let tag = null
    if (submitted && graded) {
      if (i === qq.answer) {
        // The right option: solid green only if the user actually picked it,
        // otherwise show it as the answer key without implying they got it.
        if (chosen) {
          cls += ' qc-correct'
          tag = <span className="quiz-tag qt-correct"><CheckCircle2 size={13} /> Correct</span>
        } else {
          cls += ' qc-correct-unchosen'
          tag = <span className="quiz-tag qt-answer"><CheckCircle2 size={13} /> Correct answer</span>
        }
      } else if (chosen) {
        cls += ' qc-wrong'
        tag = <span className="quiz-tag qt-wrong"><XCircle size={13} /> Your answer</span>
      }
    } else if (chosen) {
      // Ungraded review (pre-test) or the live view: just mark the chosen option.
      cls += ' qc-selected'
    }
    return (
      <button key={i} className={cls} onClick={() => choose(qq.id, i)} disabled={submitted}>
        <span className="quiz-choice-mark">{String.fromCharCode(65 + i)}</span>
        <span className="quiz-choice-text">{c}</span>
        {tag}
      </button>
    )
  }

  return (
    <div className="quiz-overlay">
      <div className="quiz-card">
        <header className="quiz-hd">
          <div>
            <p className="quiz-eyebrow">{course.code} · {label}</p>
            <h2 className="quiz-title">{course.title}</h2>
          </div>
          {/* No bailing out mid-test — the close button is hidden while it runs. */}
          {!inProgress && (
            <button className="quiz-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
          )}
        </header>

        {submitted && !loading && graded && (
          <div className={`quiz-result ${passed ? 'qr-pass' : 'qr-fail'}`}>
            <Award size={26} />
            <div>
              <p className="quiz-result-score">{score} / {total} correct · {pct}%</p>
              <p className="quiz-result-msg">{passed ? `Great job — you passed (${PASS_PCT}% required)!` : `You need at least ${PASS_PCT}% to complete this — retake to pass.`}</p>
            </div>
          </div>
        )}
        {submitted && !loading && !graded && (
          <div className="quiz-result qr-pass">
            <CheckCircle2 size={26} />
            <div>
              <p className="quiz-result-score">Pre-Test completed</p>
              <p className="quiz-result-msg">Thanks — this one isn’t scored. The Post-Test is now unlocked.</p>
            </div>
          </div>
        )}
        {submitted && saveError && (
          <div className="quiz-saveerr">⚠ Couldn’t save your result: {saveError}</div>
        )}

        {loading ? (
          <div className="quiz-empty">Loading questions…</div>
        ) : total === 0 ? (
          <div className="quiz-empty">No questions have been added for this test yet.</div>

        /* ---- Intro / warning screen (fresh attempt only) ---- */
        ) : !started && !submitted ? (
          <div className="quiz-intro">
            <div className="quiz-intro-icon"><AlertTriangle size={28} /></div>
            <h3 className="quiz-intro-title">Read this before you begin</h3>
            <p className="quiz-intro-lead">
              This is a timed assessment. Once you start, it <b>can’t be paused, exited, or restarted</b> —
              so make sure you’re ready and won’t be interrupted.
            </p>
            <ul className="quiz-intro-rules">
              <li><Clock size={16} /> You get <b>60 seconds</b> for each question.</li>
              <li><ArrowRight size={16} /> When time runs out, it moves to the next question automatically.</li>
              <li><Lock size={16} /> You can’t go back to a previous question once you move on.</li>
            </ul>
            <p className="quiz-intro-count">There {total === 1 ? 'is' : 'are'} <b>{total}</b> question{total === 1 ? '' : 's'} in this {label}.</p>
            <div className="quiz-intro-actions">
              <button className="quiz-cancel" onClick={onClose}>Not now</button>
              <button className="quiz-start" onClick={start}>I understand — Start {label}</button>
            </div>
          </div>

        /* ---- Active timed question (one at a time) ---- */
        ) : inProgress ? (
          <div className="quiz-body">
            <div className="quiz-q">
              <p className="quiz-q-text"><span className="quiz-q-num">{current + 1}</span>{q.text}</p>
              <div className="quiz-choices">
                {q.choices.map((c, i) => renderChoice(q, c, i))}
              </div>
            </div>
          </div>

        /* ---- Review (after submit / prior result): all questions ---- */
        ) : (
          <div className="quiz-body">
            {questions.map((qq, idx) => (
              <div key={qq.id} className="quiz-q">
                <p className="quiz-q-text">
                  <span className="quiz-q-num">{idx + 1}</span>
                  <span className="quiz-q-body">{qq.text}</span>
                  {answers[qq.id] == null && <span className="quiz-skip">Not answered</span>}
                </p>
                <div className="quiz-choices">
                  {qq.choices.map((c, i) => renderChoice(qq, c, i))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer — active flow */}
        {!loading && total > 0 && inProgress && (
          <footer className="quiz-foot">
            <span className="quiz-progress">Question {current + 1} of {total}</span>
            <div className="quiz-foot-right">
              <span className={`quiz-timer${timeLeft <= 10 ? ' qt-low' : ''}`}>
                <Clock size={15} /> {fmtClock(timeLeft)}
              </span>
              {answeredCurrent && (
                <button className="quiz-submit" onClick={() => advanceRef.current()} disabled={saving}>
                  {isLast ? (saving ? 'Submitting…' : 'Finish & Submit') : <>Next Question <ArrowRight size={15} /></>}
                </button>
              )}
            </div>
          </footer>
        )}

        {/* Footer — review */}
        {!loading && total > 0 && submitted && (
          <footer className="quiz-foot">
            <span className="quiz-final-score">
              {graded ? `Your score: ${score} of ${total} correct (${pct}%)` : `Pre-Test completed · ${answered} of ${total} answered`}
            </span>
            <div className="quiz-foot-btns">
              <button className="quiz-retake" onClick={retake}><RotateCcw size={14} /> Retake</button>
              <button className="quiz-done" onClick={onClose}>Done</button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
