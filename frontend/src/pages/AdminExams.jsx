import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, HelpCircle } from 'lucide-react'
import { useCourses } from '../courseStore'
import { getQuestions, addQuestions, updateQuestion, deleteQuestion, makeQuestion } from '../examStore'
import ConfirmModal from '../components/ConfirmModal'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

// Validate one draft and turn it into a DB payload, or return a human error.
function buildPayload(editor) {
  const text = editor.text.trim()
  const cleaned = editor.choices.map(c => c.trim())
  const kept = cleaned.filter(Boolean)

  if (!text) return { error: 'Please enter the question text.' }
  if (kept.length < 2) return { error: 'Please provide at least two choices.' }

  if (editor.multi) {
    const count = Number(editor.requiredCount) || 0
    if (count < 2) return { error: 'Multiple-answer questions need at least 2 correct answers.' }
    if (count > kept.length) return { error: `The required number of answers (${count}) can't exceed the number of choices.` }
    const newAnswers = [...new Set(
      editor.answers.map(i => cleaned[i]).filter(Boolean).map(v => kept.indexOf(v))
    )]
    if (newAnswers.length !== count) return { error: `Please mark exactly ${count} non-empty choices as correct answers.` }
    return { payload: { text, choices: kept, answer: newAnswers[0], answers: newAnswers } }
  }

  if (!cleaned[editor.answer]) return { error: 'Please mark a non-empty choice as the correct answer.' }
  const newAnswer = kept.indexOf(cleaned[editor.answer])
  return { payload: { text, choices: kept, answer: newAnswer, answers: null } }
}

// The per-question form fields, reused by both single edit and bulk add.
// `q` is the draft, `onChange(nextDraft)` replaces it, `groupName` keeps radios
// isolated per question so selecting one answer doesn't affect other drafts.
function QuestionFields({ q, onChange, groupName }) {
  const set = updater => onChange(typeof updater === 'function' ? updater(q) : updater)

  const setChoice = (i, v) => set(e => ({ ...e, choices: e.choices.map((c, idx) => (idx === i ? v : c)) }))
  const addChoice = () => set(e => (e.choices.length >= 6 ? e : { ...e, choices: [...e.choices, ''] }))
  const removeChoice = i => set(e => {
    if (e.choices.length <= 2) return e
    const choices = e.choices.filter((_, idx) => idx !== i)
    let answer = e.answer
    if (i === e.answer) answer = 0
    else if (i < e.answer) answer = e.answer - 1
    const answers = e.answers.filter(a => a !== i).map(a => (a > i ? a - 1 : a))
    return { ...e, choices, answer, answers }
  })
  const toggleMulti = () => set(e => {
    const multi = !e.multi
    return multi
      ? { ...e, multi, answers: e.answers.length ? e.answers : [e.answer], requiredCount: Math.max(2, e.requiredCount || 2) }
      : { ...e, multi, answer: e.answers[0] ?? 0 }
  })
  const toggleAnswer = i => set(e => {
    const has = e.answers.includes(i)
    const answers = has ? e.answers.filter(a => a !== i) : [...e.answers, i]
    return { ...e, answers }
  })

  return (
    <>
      <label className="ax-label">Question</label>
      <textarea
        className="ax-textarea"
        rows={2}
        value={q.text}
        onChange={e => set({ ...q, text: e.target.value })}
        placeholder="Type the question here…"
      />

      <label className="ax-multi-toggle">
        <input type="checkbox" checked={q.multi} onChange={toggleMulti} />
        Allow multiple correct answers
      </label>

      {q.multi && (
        <label className="ax-label">
          How many answers should students select?
          <input
            type="number"
            className="ax-count-input"
            min={2}
            max={q.choices.length}
            value={q.requiredCount}
            onChange={e => set({ ...q, requiredCount: Number(e.target.value) })}
          />
        </label>
      )}

      <label className="ax-label">
        Choices <span className="ax-hint">{q.multi ? '(check every correct answer)' : '(select the radio for the correct answer)'}</span>
      </label>
      {q.choices.map((c, i) => (
        <div key={i} className="ax-choice-row">
          {q.multi ? (
            <input
              type="checkbox"
              checked={q.answers.includes(i)}
              onChange={() => toggleAnswer(i)}
              title="Mark as a correct answer"
            />
          ) : (
            <input
              type="radio"
              name={groupName}
              checked={q.answer === i}
              onChange={() => set({ ...q, answer: i })}
              title="Mark as correct answer"
            />
          )}
          <input
            className="ax-choice-input"
            value={c}
            onChange={e => setChoice(i, e.target.value)}
            placeholder={`Choice ${i + 1}`}
          />
          <button className="ax-choice-del" onClick={() => removeChoice(i)} disabled={q.choices.length <= 2} title="Remove choice">
            <X size={15} />
          </button>
        </div>
      ))}
      {q.choices.length < 6 && (
        <button className="ax-addchoice" onClick={addChoice}><Plus size={13} /> Add choice</button>
      )}
    </>
  )
}

export default function AdminExams({ courseId: propCourseId }) {
  const embedded = propCourseId != null
  const [division, setDivision] = useState('PBD')
  const [localCourseId, setCourseId] = useState(null)
  const courseId = embedded ? propCourseId : localCourseId
  const [type, setType] = useState('pre')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState(null)   // editing one existing question { id, ... }
  const [drafts, setDrafts] = useState(null)    // adding: array of new-question drafts
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
  useEffect(() => { load(); setEditor(null); setDrafts(null) }, [courseId, type]) // eslint-disable-line

  const course = allCourses.find(c => c.id === courseId)
  const busy = editor || drafts

  // ── Add (bulk) ──
  const startAdd = () => { setEditor(null); setDrafts([makeQuestion()]) }
  const updateDraft = (idx, next) => setDrafts(ds => ds.map((d, i) => (i === idx ? next : d)))
  const addDraft = () => setDrafts(ds => [...ds, makeQuestion()])
  const removeDraft = idx => setDrafts(ds => (ds.length <= 1 ? ds : ds.filter((_, i) => i !== idx)))

  const saveAll = async () => {
    const payloads = []
    for (let i = 0; i < drafts.length; i++) {
      const { payload, error } = buildPayload(drafts[i])
      if (error) return alert(`Question ${i + 1}: ${error}`)
      payloads.push(payload)
    }
    setSaving(true)
    const { error } = await addQuestions(courseId, type, payloads)
    setSaving(false)
    if (error) return alert('Could not save: ' + error.message)
    setDrafts(null)
    load()
  }

  // ── Edit (single) ──
  const startEdit = q => {
    const multi = Array.isArray(q.answers) && q.answers.length >= 2
    setDrafts(null)
    setEditor({
      id: q.id, text: q.text, choices: [...q.choices],
      answer: q.answer, multi,
      answers: multi ? [...q.answers] : [],
      requiredCount: multi ? q.answers.length : 2,
    })
  }

  const saveEditor = async () => {
    const { payload, error } = buildPayload(editor)
    if (error) return alert(error)
    setSaving(true)
    const { error: saveErr } = await updateQuestion(editor.id, payload)
    setSaving(false)
    if (saveErr) return alert('Could not save: ' + saveErr.message)
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

      {/* Question list header */}
      <div className="ax-list-hd">
        <h2 className="ax-list-title">
          {course ? `${course.code} · ${type === 'pre' ? 'Pre-Test' : 'Post-Test'}` : '—'}
          <span className="ax-count">{questions.length} question{questions.length === 1 ? '' : 's'}</span>
        </h2>
        {!busy && (
          <button className="ax-add-btn" onClick={startAdd}><Plus size={15} /> Add Question</button>
        )}
      </div>

      {/* Bulk add: one card per draft, saved together */}
      {drafts && (
        <div className="ax-batch">
          {drafts.map((d, idx) => (
            <div key={idx} className="ax-editor ax-batch-card">
              <div className="ax-batch-card-hd">
                <span className="ax-batch-num">Question {idx + 1}</span>
                {drafts.length > 1 && (
                  <button className="ax-batch-remove" onClick={() => removeDraft(idx)} title="Remove this question">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <QuestionFields q={d} onChange={next => updateDraft(idx, next)} groupName={`ax-add-${idx}`} />
            </div>
          ))}

          <button className="ax-addchoice ax-add-another" onClick={addDraft}>
            <Plus size={14} /> Add another question
          </button>

          <div className="ax-editor-actions">
            <button className="ax-btn ax-btn-cancel" onClick={() => setDrafts(null)} disabled={saving}><X size={15} /> Cancel</button>
            <button className="ax-btn ax-btn-save" onClick={saveAll} disabled={saving}>
              <Check size={15} /> {saving ? 'Saving…' : `Save ${drafts.length} question${drafts.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {/* Edit a single existing question */}
      {editor && (
        <div className="ax-editor">
          <QuestionFields q={editor} onChange={setEditor} groupName="ax-edit" />
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
      ) : questions.length === 0 && !busy ? (
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
