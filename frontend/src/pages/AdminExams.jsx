import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, HelpCircle } from 'lucide-react'
import { MOCK_COURSES } from '../mockData'
import { getQuestions, addQuestion, updateQuestion, deleteQuestion, makeQuestion } from '../examStore'
import ConfirmModal from '../components/ConfirmModal'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

export default function AdminExams() {
  const [division, setDivision] = useState('PBD')
  const [courseId, setCourseId] = useState(null)
  const [type, setType] = useState('pre')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState(null) // { id?, text, choices[], answer }
  const [confirmDel, setConfirmDel] = useState(null)

  const divCourses = MOCK_COURSES
    .filter(c => c.division === division)
    .sort((a, b) => a.session - b.session)

  // Keep a valid course selected when the division changes.
  useEffect(() => {
    if (!divCourses.find(c => c.id === courseId)) {
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

  const course = divCourses.find(c => c.id === courseId)

  const startAdd = () => setEditor(makeQuestion())
  const startEdit = q => setEditor({ id: q.id, text: q.text, choices: [...q.choices], answer: q.answer })

  const saveEditor = async () => {
    const text = editor.text.trim()
    const cleaned = editor.choices.map(c => c.trim())
    const kept = cleaned.filter(Boolean)

    if (!text) return alert('Please enter the question text.')
    if (kept.length < 2) return alert('Please provide at least two choices.')
    if (!cleaned[editor.answer]) return alert('Please mark a non-empty choice as the correct answer.')

    const newAnswer = kept.indexOf(cleaned[editor.answer])
    const payload = { text, choices: kept, answer: newAnswer }

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
      return { ...e, choices, answer }
    })

  return (
    <div className="ax-wrap">
      <div className="admin-head">
        <h1 className="admin-title">Exam Management</h1>
        <p className="admin-sub">Add and edit pre-test &amp; post-test questions for each session</p>
      </div>

      {/* Division tabs */}
      <div className="ax-tabs">
        {DIVISIONS.map(d => (
          <button key={d} className={`ax-tab${division === d ? ' active' : ''}`} onClick={() => setDivision(d)}>
            {d}
          </button>
        ))}
      </div>

      <div className="ax-controls">
        <label className="ax-control">
          <span>Session</span>
          <select value={courseId ?? ''} onChange={e => setCourseId(Number(e.target.value))}>
            {divCourses.map(c => (
              <option key={c.id} value={c.id}>Session {c.session} — {c.title}</option>
            ))}
          </select>
        </label>

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

          <label className="ax-label">Choices <span className="ax-hint">(select the radio for the correct answer)</span></label>
          {editor.choices.map((c, i) => (
            <div key={i} className="ax-choice-row">
              <input
                type="radio"
                name="ax-correct"
                checked={editor.answer === i}
                onChange={() => setEditor({ ...editor, answer: i })}
                title="Mark as correct answer"
              />
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
          {questions.map((q, idx) => (
            <li key={q.id} className="ax-question">
              <div className="ax-q-top">
                <span className="ax-q-num">{idx + 1}</span>
                <p className="ax-q-text">{q.text}</p>
                <div className="ax-q-actions">
                  <button onClick={() => startEdit(q)} title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDel(q.id)} title="Delete" className="ax-q-del"><Trash2 size={14} /></button>
                </div>
              </div>
              <ul className="ax-q-choices">
                {q.choices.map((c, i) => (
                  <li key={i} className={i === q.answer ? 'ax-correct' : ''}>
                    <span className="ax-choice-letter">{String.fromCharCode(65 + i)}</span>
                    {c}
                    {i === q.answer && <Check size={14} />}
                  </li>
                ))}
              </ul>
            </li>
          ))}
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
