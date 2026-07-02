import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Check, X, BookOpen, ArrowLeft,
  Settings, FileQuestion, ClipboardList, Film, FileDown,
} from 'lucide-react'
import { useCourses, addCourse, updateCourse, deleteCourse } from '../courseStore'
import ConfirmModal from '../components/ConfirmModal'
import AdminExams from './AdminExams'
import AdminTasks from './AdminTasks'
import AdminVideo from './AdminVideo'
import AdminMaterials from './AdminMaterials'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']
const SUBTABS = [
  { id: 'details',   label: 'Details',   icon: Settings },
  { id: 'exam',      label: 'Exam',      icon: FileQuestion },
  { id: 'tasks',     label: 'Tasks',     icon: ClipboardList },
  { id: 'video',     label: 'Video',     icon: Film },
  { id: 'materials', label: 'Materials', icon: FileDown },
]

const courseToForm = c => ({
  id: c.id, code: c.code || '', session: c.session, title: c.title,
  shortTitle: c.shortTitle || '', division: c.division,
  description: c.description || '', duration: c.duration || '',
})

// Add/edit form for a single session.
function CourseForm({ initial, submitLabel, onCancel, onSaved }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.title.trim()) return alert('Please enter a session title.')
    const payload = {
      code: f.code.trim(),
      session: Number(f.session) || 1,
      title: f.title.trim(),
      shortTitle: f.shortTitle.trim() || f.title.trim(),
      division: f.division,
      description: f.description.trim(),
      duration: f.duration.trim(),
    }
    setSaving(true)
    const { error } = f.id ? await updateCourse(f.id, payload) : await addCourse(payload)
    setSaving(false)
    if (error) return alert('Could not save: ' + error.message)
    onSaved(payload)
  }

  return (
    <div className="ax-editor">
      <label className="ax-label">Session Title</label>
      <input className="adm-ann-input" value={f.title}
        onChange={e => set('title', e.target.value)}
        placeholder="e.g. Overview of Support Services Delivery Programs/Projects" />

      <div className="crs-row">
        <div>
          <label className="ax-label" style={{ marginTop: 16 }}>Division</label>
          <select className="adm-ann-input" value={f.division} onChange={e => set('division', e.target.value)}>
            {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="ax-label" style={{ marginTop: 16 }}>Session #</label>
          <input className="adm-ann-input" type="number" min="1" value={f.session}
            onChange={e => set('session', e.target.value)} />
        </div>
        <div>
          <label className="ax-label" style={{ marginTop: 16 }}>Code</label>
          <input className="adm-ann-input" value={f.code}
            onChange={e => set('code', e.target.value)} placeholder="e.g. PBD-05" />
        </div>
        <div>
          <label className="ax-label" style={{ marginTop: 16 }}>Duration</label>
          <input className="adm-ann-input" value={f.duration}
            onChange={e => set('duration', e.target.value)} placeholder="e.g. 60 minutes" />
        </div>
      </div>

      <label className="ax-label" style={{ marginTop: 16 }}>Short Title <span className="crs-optional">(shown where space is tight)</span></label>
      <input className="adm-ann-input" value={f.shortTitle}
        onChange={e => set('shortTitle', e.target.value)} placeholder="Defaults to the full title" />

      <label className="ax-label" style={{ marginTop: 16 }}>Description</label>
      <textarea className="ax-textarea" rows={3} value={f.description}
        onChange={e => set('description', e.target.value)}
        placeholder="One or two sentences shown on the course card…" />

      <div className="ax-editor-actions">
        <button className="ax-btn ax-btn-cancel" onClick={onCancel} disabled={saving}><X size={15} /> Cancel</button>
        <button className="ax-btn ax-btn-save" onClick={save} disabled={saving}>
          <Check size={15} /> {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  )
}

export default function AdminCourses() {
  const { courses, loading, reload } = useCourses()
  const [division, setDivision] = useState('PBD')
  const [selectedId, setSelectedId] = useState(null)   // null = list view
  const [subtab, setSubtab] = useState('details')
  const [adding, setAdding] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const divCourses = courses.filter(c => c.division === division).sort((a, b) => a.session - b.session)
  const selected = courses.find(c => c.id === selectedId) || null

  const openSession = c => { setSelectedId(c.id); setSubtab('details'); setAdding(false) }
  const backToList = () => { setSelectedId(null) }

  const doDelete = async () => {
    const id = confirmDel
    setConfirmDel(null)
    const { error } = await deleteCourse(id)
    if (error) return alert('Could not delete: ' + error.message)
    if (id === selectedId) setSelectedId(null)
    reload()
  }

  // ── Detail view: manage one session's content ──
  if (selected) {
    return (
      <div className="ax-wrap">
        <div className="crs-detail-hd">
          <button className="crs-back" onClick={backToList}><ArrowLeft size={16} /> All sessions</button>
          <div className="crs-detail-titles">
            <span className="crs-detail-eyebrow">{selected.code || selected.division} · Session {selected.session}</span>
            <h1 className="admin-title">{selected.title}</h1>
          </div>
          <button className="crs-detail-del" onClick={() => setConfirmDel(selected.id)} title="Delete session">
            <Trash2 size={15} /> Delete
          </button>
        </div>

        <div className="crs-subtabs">
          {SUBTABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`crs-subtab${subtab === id ? ' active' : ''}`} onClick={() => setSubtab(id)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="crs-subpanel">
          {subtab === 'details' && (
            <CourseForm
              key={selected.id}
              initial={courseToForm(selected)}
              submitLabel="Save Changes"
              onCancel={backToList}
              onSaved={() => reload()}
            />
          )}
          {subtab === 'exam'      && <AdminExams courseId={selected.id} />}
          {subtab === 'tasks'     && <AdminTasks courseId={selected.id} />}
          {subtab === 'video'     && <AdminVideo courseId={selected.id} />}
          {subtab === 'materials' && <AdminMaterials courseId={selected.id} />}
        </div>

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

  // ── List view: sessions per division ──
  return (
    <div className="ax-wrap">
      <div className="admin-head">
        <h1 className="admin-title">Session Management</h1>
        <p className="admin-sub">Add or edit sessions, and manage each one's exam, tasks, video, and materials</p>
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
        {!adding && <button className="ax-add-btn" onClick={() => setAdding(true)}><Plus size={15} /> Add Session</button>}
      </div>

      {adding && (
        <CourseForm
          initial={{ code: '', session: divCourses.length + 1, title: '', shortTitle: '', division, description: '', duration: '60 minutes' }}
          submitLabel="Add Session"
          onCancel={() => setAdding(false)}
          onSaved={p => { setAdding(false); setDivision(p.division); reload() }}
        />
      )}

      {loading ? (
        <div className="ax-empty"><p>Loading sessions…</p></div>
      ) : divCourses.length === 0 && !adding ? (
        <div className="ax-empty"><BookOpen size={32} /><p>No sessions in this division yet. Click "Add Session".</p></div>
      ) : (
        <ol className="ax-questions">
          {divCourses.map(c => (
            <li key={c.id} className="ax-question crs-session-row">
              <button className="crs-session-open" onClick={() => openSession(c)}>
                <span className="ax-q-num">{c.session}</span>
                <span className="crs-session-info">
                  <span className="ax-q-text">{c.title}</span>
                  <span className="crs-meta">{c.code}{c.duration ? ` · ${c.duration}` : ''} · manage content →</span>
                </span>
              </button>
              <div className="ax-q-actions">
                <button onClick={() => openSession(c)} title="Edit / manage"><Pencil size={14} /></button>
                <button onClick={() => setConfirmDel(c.id)} title="Delete" className="ax-q-del"><Trash2 size={14} /></button>
              </div>
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
