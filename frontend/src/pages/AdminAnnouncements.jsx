import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Megaphone, Clock } from 'lucide-react'
import {
  getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement,
} from '../announcementStore'
import ConfirmModal from '../components/ConfirmModal'

const fmt = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export default function AdminAnnouncements() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null) // { id?, title, content, author }
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const load = async () => {
    setLoading(true)
    setList(await getAnnouncements())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const startAdd = () => setEditor({ title: '', content: '', author: 'Training Office' })
  const startEdit = a => setEditor({ id: a.id, title: a.title, content: a.content, author: a.author || '' })

  const save = async () => {
    if (!editor.title.trim() || !editor.content.trim()) {
      return alert('Please enter a title and content.')
    }
    const payload = {
      title: editor.title.trim(),
      content: editor.content.trim(),
      author: editor.author.trim() || 'Training Office',
    }
    setSaving(true)
    const { error } = editor.id
      ? await updateAnnouncement(editor.id, payload)
      : await addAnnouncement(payload)
    setSaving(false)
    if (error) return alert('Could not save: ' + error.message)
    setEditor(null)
    load()
  }

  const doDelete = async () => {
    const id = confirmDel
    setConfirmDel(null)
    const { error } = await deleteAnnouncement(id)
    if (error) return alert('Could not delete: ' + error.message)
    load()
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Announcements</h1>
        <p className="admin-sub">Create and manage announcements shown to all employees</p>
      </div>

      <div className="ax-list-hd">
        <h2 className="ax-list-title">All Announcements <span className="ax-count">{list.length}</span></h2>
        {!editor && <button className="ax-add-btn" onClick={startAdd}><Plus size={15} /> Add Announcement</button>}
      </div>

      {editor && (
        <div className="ax-editor">
          <label className="ax-label">Title</label>
          <input className="adm-ann-input" value={editor.title}
            onChange={e => setEditor({ ...editor, title: e.target.value })}
            placeholder="Announcement title" />

          <label className="ax-label" style={{ marginTop: 16 }}>Content</label>
          <textarea className="ax-textarea" rows={3} value={editor.content}
            onChange={e => setEditor({ ...editor, content: e.target.value })}
            placeholder="Write the announcement…" />

          <label className="ax-label" style={{ marginTop: 16 }}>Author</label>
          <input className="adm-ann-input" value={editor.author}
            onChange={e => setEditor({ ...editor, author: e.target.value })}
            placeholder="e.g. Training Office" />

          <div className="ax-editor-actions">
            <button className="ax-btn ax-btn-cancel" onClick={() => setEditor(null)} disabled={saving}><X size={15} /> Cancel</button>
            <button className="ax-btn ax-btn-save" onClick={save} disabled={saving}>
              <Check size={15} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ax-empty"><p>Loading announcements…</p></div>
      ) : list.length === 0 && !editor ? (
        <div className="ax-empty"><Megaphone size={32} /><p>No announcements yet. Click "Add Announcement" to create one.</p></div>
      ) : (
        <div className="adm-ann-list">
          {list.map(a => (
            <div key={a.id} className="adm-ann">
              <div className="adm-ann-main">
                <h3 className="adm-ann-title">{a.title}</h3>
                <p className="adm-ann-content">{a.content}</p>
                <p className="adm-ann-meta"><Clock size={12} /> {a.author} · {fmt(a.created_at)}</p>
              </div>
              <div className="adm-ann-actions">
                <button onClick={() => startEdit(a)} title="Edit"><Pencil size={15} /></button>
                <button className="adm-ann-del" onClick={() => setConfirmDel(a.id)} title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDel && (
        <ConfirmModal
          icon={Trash2}
          title="Delete announcement?"
          message="This announcement will be permanently removed for all employees."
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </>
  )
}
