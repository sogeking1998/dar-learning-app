import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, ClipboardList } from 'lucide-react'
import { useCourses } from '../courseStore'
import { getTasksForCourse, addTask, updateTask, deleteTask } from '../taskStore'
import ConfirmModal from '../components/ConfirmModal'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']
const blank = () => ({ title: '', description: '', instructions: '' })

export default function AdminTasks() {
  const [division, setDivision] = useState('PBD')
  const [courseId, setCourseId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState(null) // { id?, title, description, instructions }
  const [confirmDel, setConfirmDel] = useState(null)

  const { courses: allCourses } = useCourses()
  const divCourses = allCourses
    .filter(c => c.division === division)
    .sort((a, b) => a.session - b.session)

  useEffect(() => {
    if (!divCourses.find(c => c.id === courseId)) {
      setCourseId(divCourses[0]?.id ?? null)
    }
  }, [division]) // eslint-disable-line

  const load = async () => {
    if (courseId == null) return
    setLoading(true)
    setTasks(await getTasksForCourse(courseId))
    setLoading(false)
  }
  useEffect(() => { load(); setEditor(null) }, [courseId]) // eslint-disable-line

  const course = divCourses.find(c => c.id === courseId)

  const startAdd = () => setEditor(blank())
  const startEdit = t => setEditor({ id: t.id, title: t.title, description: t.description || '', instructions: t.instructions || '' })

  const save = async () => {
    if (!editor.title.trim()) return alert('Please enter a task title.')
    const payload = {
      title: editor.title.trim(),
      description: editor.description.trim(),
      instructions: editor.instructions.trim(),
    }
    setSaving(true)
    const { error } = editor.id
      ? await updateTask(editor.id, payload)
      : await addTask(courseId, payload)
    setSaving(false)
    if (error) return alert('Could not save: ' + error.message)
    setEditor(null)
    load()
  }

  const doDelete = async () => {
    const id = confirmDel
    setConfirmDel(null)
    const { error } = await deleteTask(id)
    if (error) return alert('Could not delete: ' + error.message)
    load()
  }

  return (
    <div className="ax-wrap">
      <div className="admin-head">
        <h1 className="admin-title">Task Management</h1>
        <p className="admin-sub">Add and edit the activity each session requires</p>
      </div>

      <div className="ax-tabs">
        {DIVISIONS.map(d => (
          <button key={d} className={`ax-tab${division === d ? ' active' : ''}`} onClick={() => setDivision(d)}>{d}</button>
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
      </div>

      <div className="ax-list-hd">
        <h2 className="ax-list-title">
          {course ? `${course.code} · Tasks` : '—'}
          <span className="ax-count">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
        </h2>
        {!editor && <button className="ax-add-btn" onClick={startAdd}><Plus size={15} /> Add Task</button>}
      </div>

      {editor && (
        <div className="ax-editor">
          <label className="ax-label">Task Title</label>
          <input className="adm-ann-input" value={editor.title}
            onChange={e => setEditor({ ...editor, title: e.target.value })}
            placeholder="e.g. Session Output Submission" />

          <label className="ax-label" style={{ marginTop: 16 }}>Short Description</label>
          <input className="adm-ann-input" value={editor.description}
            onChange={e => setEditor({ ...editor, description: e.target.value })}
            placeholder="A one-line summary of the task" />

          <label className="ax-label" style={{ marginTop: 16 }}>Instructions</label>
          <textarea className="ax-textarea" rows={5} value={editor.instructions}
            onChange={e => setEditor({ ...editor, instructions: e.target.value })}
            placeholder="Step-by-step instructions the learner should follow…" />

          <div className="ax-editor-actions">
            <button className="ax-btn ax-btn-cancel" onClick={() => setEditor(null)} disabled={saving}><X size={15} /> Cancel</button>
            <button className="ax-btn ax-btn-save" onClick={save} disabled={saving}>
              <Check size={15} /> {saving ? 'Saving…' : 'Save Task'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ax-empty"><p>Loading tasks…</p></div>
      ) : tasks.length === 0 && !editor ? (
        <div className="ax-empty"><ClipboardList size={32} /><p>No tasks yet. Click "Add Task" to create one.</p></div>
      ) : (
        <ol className="ax-questions">
          {tasks.map((t, idx) => (
            <li key={t.id} className="ax-question">
              <div className="ax-q-top">
                <span className="ax-q-num">{idx + 1}</span>
                <p className="ax-q-text">{t.title}</p>
                <div className="ax-q-actions">
                  <button onClick={() => startEdit(t)} title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDel(t.id)} title="Delete" className="ax-q-del"><Trash2 size={14} /></button>
                </div>
              </div>
              {t.description && <p className="adm-task-desc">{t.description}</p>}
              {t.instructions && (
                <div className="adm-task-instr">
                  <span className="adm-task-instr-label">Instructions</span>
                  {t.instructions}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {confirmDel && (
        <ConfirmModal
          icon={Trash2}
          title="Delete task?"
          message="This task and its instructions will be permanently removed."
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
