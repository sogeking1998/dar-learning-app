import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, HelpCircle } from 'lucide-react'
import { useCourses } from '../courseStore'
import { getQuestions, addQuestion, updateQuestion, deleteQuestion, makeQuestion } from '../examStore'
import ConfirmModal from '../components/ConfirmModal'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

export default function AdminExams({ courseId: propCourseId }) {
  const embedded = propCourseId != null
  const [division, setDivision] = useState('PBD')
  const [localCourseId, setCourseId] = useState(null)
  const courseId = embedded ? propCourseId : localCourseId
  const [type, setType] = useState('pre')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState(null) // { id?, text, choices[], answer }
  const [confirmDel, setConfirmDel] = useState(null)

  const { courses: allCourses } = useCourses()
  const divCourses = allCourses
    .filter(c => c.division === division)
    .sort((a, b) => a.session - b.session)

  // Keep a valid course selected when the division changes (standalone mode only).
  useEffect(() => {
    if (embedded) return
    if (!divCourses.find(c => c.id === localCourseId)) {
      setCourseId(divCourses[0]?.id ?? null)
    }
  }, [division]) // eslint-disable-line

  const load = async () => {
    if (courseId == null) return
    setLoading(true)
    setQuestions(await getQuestions(courseId, type))
    setLoading(false)
  }
  useEffect(() => { load(); setEditor(null) }, [courseId, type]) // eslint-disable-line

  const course = allCourses.find(c => c.id === courseId)

  const startAdd = () => setEditor(makeQuestion())
  const startEdit = q => {
    const multi = Array.isArray(q.answers) && q.answers.length >= 2
    setEditor({
      id: q.id, text: q.text, choices: [...q.choices],
      answer: q.answer, multi,
      answers: multi ? [...q.answers] : [],
      requiredCount: multi ? q.answers.length : 2,
    })
  }

  const toggleMulti = () => setEditor(e => {
    const multi = !e.multi
    return multi
      ? { ...e, multi, answers: e.answers.length ? e.answers : [e.answer], requiredCount: Math.max(2, e.requiredCount || 2) }
      : { ...e, multi, answer: e.answers[0] ?? 0 }
  })

  const toggleAnswer = i => setEditor(e => {
    const has = e.answers.includes(i)
    const answers = has ? e.answers.filter(a => a !== i) : [...e.answers, i]
    return { ...e, answers }
  })

  const saveEditor = async () => {
    const text = editor.text.trim()
    const cleaned = editor.choices.map(c => c.trim())
    const kept = cleaned.filter(Boolean)

    if (!text) return alert('Please enter the question text.')
    if (kept.length < 2) return alert('Please provide at least two choices.')

    let payload
    if (editor.multi) {
      const count = Number(editor.requiredCount) || 0
      if (count < 2) return alert('Multiple-answer questions need at least 2 correct answers.')
      if (count > kept.length) return alert(`The required number of answers (${count}) can't exceed the number of choices.`)
      const newAnswers = [...new Set(
        editor.answers.map(i => cleaned[i]).filter(Boolean).map(v => kept.indexOf(v))
      )]
      if (newAnswers.length !== count) return alert(`Please mark exactly ${count} non-empty choices as correct answers.`)
      payload = { text, choices: kept, answer: newAnswers[0], answers: newAnswers }
    } else {
      if (!cleaned[editor.answer]) return alert('Please mark a non-empty choice as the correct answer.')
      const newAnswer = kept.indexOf(cleaned[editor.answer])
      payload = { text, choices: kept, answer: newAnswer, answers: null }
    }

    setSaving(true)
    const { error } = editor.id
      ? await updateQuestion(editor.id, payload)
      : await addQuestion(courseId, type, payload)
    setSaving(false)
    if (error) return alert('Could not save: ' + error.message)
    setEditor(null)
    load()
  }

  const doDelete = async () => {
    const id = confirmDel
    setConfirmDel(null)
    const { error } = await deleteQuestion(id)
    if (error) return alert('Could not delete: ' + error.message)
    load()
  }

  const setChoice = (i, v) =>
    setEditor(e => ({ ...e, choices: e.choices.map((c, idx) => (idx === i ? v : c)) }))
  const addChoice = () =>
    setEditor(e => (e.choices.length >= 6 ? e : { ...e, choices: [...e.choices, ''] }))
  const removeChoice = i =>
    setEditor(e => {
      if (e.choices.length <= 2) return e
      const choices = e.choices.filter((_, idx) => idx !== i)
      let answer = e.answer
      if (i === e.answer) answer = 0
      else if (i < e.answer) answer = e.answer - 1
      const answers = e.answers
        .filter(a => a !== i)
        .map(a => (a > i ? a - 1 : a))
      return { ...e, choices, answer, answers }
    })

  return (
    <div className={embedded ? '' : 'ax-wrap'}>
      {!embedded && (
        <div className="admin-head">
          <h1 className="admin-title">Exam Management</h1>
          <p className="admin-sub">Add and edit pre-test &amp; post-test questions for each session</p>
        </div>
      )}

      {!embedded && (
        <div className="ax-tabs">
          {DIVISIONS.map(d => (
            <button key={d} className={`ax-tab${division === d ? ' active' : ''}`} onClick={() => setDivision(d)}>
              {d}
            </button>
          ))}
        </div>
      )}

      <div className="ax-controls">
        {!embedded && (
          <label className="ax-control">
            <span>Session</span>
            <select value={courseId ?? ''} onChange={e => setCourseId(Number(e.target.value))}>
              {divCourses.map(c => (
                <option key={c.id} value={c.id}>Session {c.session} — {c.title}</option>
              ))}
            </select>
          </label>
        )}

        <div className="ax-type">
          <button className={`ax-type-btn${type === 'pre' ? ' active' : ''}`} onClick={() => setType('pre')}>Pre-Test</button>
          <button className={`ax-type-btn${type === 'post' ? ' active' : ''}`} onClick={() => setType('post')}>Post-Test</button>
        </div>
      </div>

      {/* Question list */}
      <div className="ax-list-hd">
        <h2 className="ax-list-title">
          {course ? `${course.code} · ${type === 'pre' ? 'Pre-Test' : 'Post-Test'}` : '—'}
          <span className="ax-count">{questions.length} question{questions.length === 1 ? '' : 's'}</span>
        </h2>
        {!editor && (
          <button className="ax-add-btn" onClick={startAdd}><Plus size={15} /> Add Question</button>
        )}
      </div>

      {/* Editor */}
      {editor && (
        <div className="ax-editor">
          <label className="ax-label">Question</label>
          <textarea
            className="ax-textarea"
            rows={2}
            value={editor.text}
            onChange={e => setEditor({ ...editor, text: e.target.value })}
            placeholder="Type the question here…"
          />

          <label className="ax-multi-toggle">
            <input type="checkbox" checked={editor.multi} onChange={toggleMulti} />
            Allow multiple correct answers
          </label>

          {editor.multi && (
            <label className="ax-label">
              How many answers should students select?
              <input
                type="number"
                className="ax-count-input"
                min={2}
                max={editor.choices.length}
                value={editor.requiredCount}
                onChange={e => setEditor({ ...editor, requiredCount: Number(e.target.value) })}
              />
            </label>
          )}

          <label className="ax-label">
            Choices <span className="ax-hint">{editor.multi ? '(check every correct answer)' : '(select the radio for the correct answer)'}</span>
          </label>
          {editor.choices.map((c, i) => (
            <div key={i} className="ax-choice-row">
              {editor.multi ? (
                <input
                  type="checkbox"
                  checked={editor.answers.includes(i)}
                  onChange={() => toggleAnswer(i)}
                  title="Mark as a correct answer"
                />
              ) : (
                <input
                  type="radio"
                  name="ax-correct"
                  checked={editor.answer === i}
                  onChange={() => setEditor({ ...editor, answer: i })}
                  title="Mark as correct answer"
                />
              )}
              <input
                className="ax-choice-input"
                value={c}
                onChange={e => setChoice(i, e.target.value)}
                placeholder={`Choice ${i + 1}`}
              />
              <button className="ax-choice-del" onClick={() => removeChoice(i)} disabled={editor.choices.length <= 2} title="Remove choice">
                <X size={15} />
              </button>
            </div>
          ))}
          {editor.choices.length < 6 && (
            <button className="ax-addchoice" onClick={addChoice}><Plus size={13} /> Add choice</button>
          )}

          <div className="ax-editor-actions">
            <button className="ax-btn ax-btn-cancel" onClick={() => setEditor(null)} disabled={saving}><X size={15} /> Cancel</button>
            <button className="ax-btn ax-btn-save" onClick={saveEditor} disabled={saving}>
              <Check size={15} /> {saving ? 'Saving…' : 'Save Question'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="ax-empty"><p>Loading questions…</p></div>
      ) : questions.length === 0 && !editor ? (
        <div className="ax-empty"><HelpCircle size={32} /><p>No questions yet. Click "Add Question" to create one.</p></div>
      ) : (
        <ol className="ax-questions">
          {questions.map((q, idx) => {
            const isMulti = Array.isArray(q.answers) && q.answers.length >= 2
            return (
              <li key={q.id} className="ax-question">
                <div className="ax-q-top">
                  <span className="ax-q-num">{idx + 1}</span>
                  <p className="ax-q-text">
                    {q.text}
                    {isMulti && <span className="ax-multi-badge">Choose {q.answers.length}</span>}
                  </p>
                  <div className="ax-q-actions">
                    <button onClick={() => startEdit(q)} title="Edit"><Pencil size={14} /></button>
                    <button onClick={() => setConfirmDel(q.id)} title="Delete" className="ax-q-del"><Trash2 size={14} /></button>
                  </div>
                </div>
                <ul className="ax-q-choices">
                  {q.choices.map((c, i) => {
                    const correct = isMulti ? q.answers.includes(i) : i === q.answer
                    return (
                      <li key={i} className={correct ? 'ax-correct' : ''}>
                        <span className="ax-choice-letter">{String.fromCharCode(65 + i)}</span>
                        {c}
                        {correct && <Check size={14} />}
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ol>
      )}

      {confirmDel && (
        <ConfirmModal
          icon={Trash2}
          title="Delete question?"
          message="This question will be permanently removed from the test."
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
