import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react'
import { useCourses, addCourse, updateCourse, deleteCourse } from '../courseStore'
import ConfirmModal from '../components/ConfirmModal'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

const blank = division => ({
  code: '', session: 1, title: '', shortTitle: '', division,
  description: '', duration: '60 minutes',
})

export default function AdminCourses() {
  const { courses, loading, reload } = useCourses()
  const [division, setDivision] = useState('PBD')
  const [editor, setEditor] = useState(null)   // { id?, code, session, title, ... }
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const divCourses = courses
    .filter(c => c.division === division)
    .sort((a, b) => a.session - b.session)

  const startAdd = () => setEditor({ ...blank(division), session: divCourses.length + 1 })
  const startEdit = c => setEditor({
    id: c.id, code: c.code, session: c.session, title: c.title,
    shortTitle: c.shortTitle, division: c.division,
    description: c.description || '', duration: c.duration || '',
  })

  const set = (k, v) => setEditor(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!editor.title.trim()) return alert('Please enter a session title.')
    const payload = {
      code: editor.code.trim(),
      session: Number(editor.session) || 1,
      title: editor.title.trim(),
      shortTitle: editor.shortTitle.trim() || editor.title.trim(),
      division: editor.division,
      description: editor.description.trim(),
      duration: editor.duration.trim(),
    }
    setSaving(true)
    const { error } = editor.id
      ? await updateCourse(editor.id, payload)
      : await addCourse(payload)
    setSaving(false)
    if (error) return alert('Could not save: ' + error.message)
    setEditor(null)
    setDivision(payload.division)
    reload()
  }

  const doDelete = async () => {
    const id = confirmDel
    setConfirmDel(null)
    const { error } = await deleteCourse(id)
    if (error) return alert('Could not delete: ' + error.message)
    reload()
  }

  return (
    <div className="ax-wrap">
      <div className="admin-head">
        <h1 className="admin-title">Session Management</h1>
        <p className="admin-sub">Add, rename, or remove the training sessions in each division</p>
      </div>

      <div className="ax-tabs">
        {DIVISIONS.map(d => (
          <button key={d} className={`ax-tab${division === d ? ' active' : ''}`} onClick={() => setDivision(d)}>{d}</button>
        ))}
      </div>

      <div className="ax-list-hd">
        <h2 className="ax-list-title">
          {division} Sessions
          <span className="ax-count">{divCourses.length} session{divCourses.length === 1 ? '' : 's'}</span>
        </h2>
        {!editor && <button className="ax-add-btn" onClick={startAdd}><Plus size={15} /> Add Session</button>}
      </div>

      {editor && (
        <div className="ax-editor">
          <label className="ax-label">Session Title</label>
          <input className="adm-ann-input" value={editor.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Overview of Support Services Delivery Programs/Projects" />

          <div className="crs-row">
            <div>
              <label className="ax-label" style={{ marginTop: 16 }}>Division</label>
              <select className="adm-ann-input" value={editor.division} onChange={e => set('division', e.target.value)}>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="ax-label" style={{ marginTop: 16 }}>Session #</label>
              <input className="adm-ann-input" type="number" min="1" value={editor.session}
                onChange={e => set('session', e.target.value)} />
            </div>
            <div>
              <label className="ax-label" style={{ marginTop: 16 }}>Code</label>
              <input className="adm-ann-input" value={editor.code}
                onChange={e => set('code', e.target.value)} placeholder="e.g. PBD-05" />
            </div>
            <div>
              <label className="ax-label" style={{ marginTop: 16 }}>Duration</label>
              <input className="adm-ann-input" value={editor.duration}
                onChange={e => set('duration', e.target.value)} placeholder="e.g. 60 minutes" />
            </div>
          </div>

          <label className="ax-label" style={{ marginTop: 16 }}>Short Title <span className="crs-optional">(shown where space is tight)</span></label>
          <input className="adm-ann-input" value={editor.shortTitle}
            onChange={e => set('shortTitle', e.target.value)} placeholder="Defaults to the full title" />

          <label className="ax-label" style={{ marginTop: 16 }}>Description</label>
          <textarea className="ax-textarea" rows={3} value={editor.description}
            onChange={e => set('description', e.target.value)}
            placeholder="One or two sentences shown on the course card…" />

          <div className="ax-editor-actions">
            <button className="ax-btn ax-btn-cancel" onClick={() => setEditor(null)} disabled={saving}><X size={15} /> Cancel</button>
            <button className="ax-btn ax-btn-save" onClick={save} disabled={saving}>
              <Check size={15} /> {saving ? 'Saving…' : editor.id ? 'Save Changes' : 'Add Session'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ax-empty"><p>Loading sessions…</p></div>
      ) : divCourses.length === 0 && !editor ? (
        <div className="ax-empty"><BookOpen size={32} /><p>No sessions in this division yet. Click "Add Session".</p></div>
      ) : (
        <ol className="ax-questions">
          {divCourses.map(c => (
            <li key={c.id} className="ax-question">
              <div className="ax-q-top">
                <span className="ax-q-num">{c.session}</span>
                <p className="ax-q-text">
                  {c.title}
                  <span className="crs-meta">{c.code}{c.duration ? ` · ${c.duration}` : ''}</span>
                </p>
                <div className="ax-q-actions">
                  <button onClick={() => startEdit(c)} title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDel(c.id)} title="Delete" className="ax-q-del"><Trash2 size={14} /></button>
                </div>
              </div>
              {c.description && <p className="adm-task-desc">{c.description}</p>}
            </li>
          ))}
        </ol>
      )}

      {confirmDel && (
        <ConfirmModal
          icon={Trash2}
          title="Delete this session?"
          message="This removes the session AND everything attached to it — exam questions, learner results, videos, materials, and tasks. This cannot be undone."
          confirmLabel="Delete Session" cancelLabel="Cancel" danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
