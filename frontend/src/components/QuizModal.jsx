import { useState, useEffect } from 'react'
import { X, CheckCircle2, XCircle, Award, RotateCcw } from 'lucide-react'
import { getQuestions, saveResult } from '../examStore'
import './QuizModal.css'

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

  useEffect(() => {
    let active = true
    getQuestions(course.id, type).then(qs => {
      if (!active) return
      setQuestions(qs)
      if (priorResult) {
        setAnswers(priorResult.answers || reconstruct(qs, priorResult.score))
        setSubmitted(true)
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [course.id, type]) // eslint-disable-line

  const label = type === 'pre' ? 'Pre-Test' : 'Post-Test'
  const total = questions.length
  const answered = questions.filter(q => answers[q.id] != null).length
  const score = questions.filter(q => answers[q.id] === q.answer).length
  const pct = total ? Math.round((score / total) * 100) : 0
  const passed = pct >= 75

  const choose = (qid, i) => {
    if (submitted) return
    setAnswers(a => ({ ...a, [qid]: i }))
  }

  const submit = async () => {
    if (answered < total || saving) return
    if (!userId) { setSaveError('You are not signed in — cannot save.'); setSubmitted(true); return }
    setSaving(true)
    const { error } = await saveResult(userId, course.id, type, { score, total, pct, answers })
    setSaving(false)
    setSubmitted(true)
    if (error) {
      setSaveError(error.message)
    } else {
      setSaveError(null)
      if (onSubmitted) onSubmitted()
    }
  }

  const retake = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <div className="quiz-overlay">
      <div className="quiz-card">
        <header className="quiz-hd">
          <div>
            <p className="quiz-eyebrow">{course.code} · {label}</p>
            <h2 className="quiz-title">{course.title}</h2>
          </div>
          <button className="quiz-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        {submitted && !loading && (
          <div className={`quiz-result ${passed ? 'qr-pass' : 'qr-fail'}`}>
            <Award size={26} />
            <div>
              <p className="quiz-result-score">{score} / {total} correct · {pct}%</p>
              <p className="quiz-result-msg">{passed ? 'Great job — you passed!' : 'Keep practicing — you can retake this test.'}</p>
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
        ) : (
          <div className="quiz-body">
            {questions.map((q, idx) => (
              <div key={q.id} className="quiz-q">
                <p className="quiz-q-text"><span className="quiz-q-num">{idx + 1}</span>{q.text}</p>
                <div className="quiz-choices">
                  {q.choices.map((c, i) => {
                    const chosen = answers[q.id] === i
                    let cls = 'quiz-choice'
                    let tag = null
                    if (submitted) {
                      if (i === q.answer) {
                        cls += ' qc-correct'
                        tag = <span className="quiz-tag qt-correct"><CheckCircle2 size={13} /> Correct</span>
                      } else if (chosen) {
                        cls += ' qc-wrong'
                        tag = <span className="quiz-tag qt-wrong"><XCircle size={13} /> Incorrect</span>
                      }
                    } else if (chosen) {
                      cls += ' qc-selected'
                    }
                    return (
                      <button key={i} className={cls} onClick={() => choose(q.id, i)} disabled={submitted}>
                        <span className="quiz-choice-mark">{String.fromCharCode(65 + i)}</span>
                        <span className="quiz-choice-text">{c}</span>
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && total > 0 && (
          <footer className="quiz-foot">
            {!submitted ? (
              <>
                <span className="quiz-progress">{answered} of {total} answered</span>
                <button className="quiz-submit" onClick={submit} disabled={answered < total || saving}>
                  {saving ? 'Submitting…' : 'Submit Test'}
                </button>
              </>
            ) : (
              <>
                <span className="quiz-final-score">Your score: {score} of {total} correct ({pct}%)</span>
                <div className="quiz-foot-btns">
                  <button className="quiz-retake" onClick={retake}><RotateCcw size={14} /> Retake</button>
                  <button className="quiz-done" onClick={onClose}>Done</button>
                </div>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  )
}
