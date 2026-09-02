import { useEffect, useState } from 'react'
import {
  AlignLeft, CalendarDays, Clock, Megaphone, Pencil, Plus, Search,
  Send, Trash2, Type, UserRound, Users, X,
} from 'lucide-react'
import {
  getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement,
} from '../announcementStore'
import ConfirmModal from '../components/ConfirmModal'
import './AdminAnnouncements.css'

const fmt = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export default function AdminAnnouncements() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [query, setQuery] = useState('')
  const editorOpen = Boolean(editor)

  const load = async () => {
    setLoading(true)
    setList(await getAnnouncements())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!editorOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = event => {
      if (event.key === 'Escape' && !saving) setEditor(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [editorOpen, saving])

  const startAdd = () => setEditor({ title: '', content: '', author: 'Training Office' })
  const startEdit = announcement => setEditor({
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    author: announcement.author || '',
  })

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

  const normalizedQuery = query.trim().toLowerCase()
  const visible = list.filter(announcement =>
    !normalizedQuery ||
    (announcement.title || '').toLowerCase().includes(normalizedQuery) ||
    (announcement.content || '').toLowerCase().includes(normalizedQuery) ||
    (announcement.author || '').toLowerCase().includes(normalizedQuery)
  )
  const contributorCount = new Set(list.map(announcement => announcement.author || 'Training Office')).size
  const latestDate = list[0]?.created_at ? fmt(list[0].created_at) : '—'

  return (
    <>
      <div className="aa-wrap">
        <div className="admin-head aa-head">
          <div>
            <span className="aa-kicker">Employee communications</span>
            <h1 className="admin-title">Announcements</h1>
            <p className="admin-sub">Publish program updates and important information for all employees.</p>
          </div>
          <button className="aa-add-btn" onClick={startAdd}><Plus size={16} /> Add Announcement</button>
        </div>

        <div className="aa-metrics">
          <div className="aa-metric aa-metric-green"><span><Megaphone size={19} /></span><div><strong>{loading ? '—' : list.length}</strong><b>Published updates</b><small>Visible to employee accounts</small></div></div>
          <div className="aa-metric aa-metric-blue"><span><Users size={19} /></span><div><strong>{loading ? '—' : contributorCount}</strong><b>Contributors</b><small>Publishing offices or authors</small></div></div>
          <div className="aa-metric aa-metric-amber"><span><CalendarDays size={19} /></span><div><strong>{loading ? '—' : latestDate}</strong><b>Latest publication</b><small>Most recent employee update</small></div></div>
          <div className="aa-audience">
            <span className="aa-audience-icon"><Send size={20} /></span>
            <div><small>Current audience</small><strong>All employees</strong><p>Every published announcement appears on the employee Home page.</p></div>
          </div>
        </div>

        <div className="aa-collection-head">
          <div><h2>Published Announcements <span>{visible.length}</span></h2><p>Newest announcements appear first.</p></div>
          <div className="aa-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search announcements…" /></div>
        </div>

        {loading ? (
          <div className="ax-empty"><p>Loading announcements…</p></div>
        ) : list.length === 0 ? (
          <div className="ax-empty"><Megaphone size={32} /><p>No announcements yet. Click "Add Announcement" to create one.</p></div>
        ) : visible.length === 0 ? (
          <div className="ax-empty aa-empty"><Search size={30} /><p>No announcements match your search.</p></div>
        ) : (
          <div className="adm-ann-list">
            {visible.map(announcement => (
              <article key={announcement.id} className="adm-ann">
                <div className="aa-card-head">
                  <span className="aa-card-icon"><Megaphone size={18} /></span>
                  <span className="aa-published">Published</span>
                  <div className="adm-ann-actions">
                    <button onClick={() => startEdit(announcement)} title="Edit announcement" aria-label={`Edit ${announcement.title}`}><Pencil size={15} /></button>
                    <button className="adm-ann-del" onClick={() => setConfirmDel(announcement.id)} title="Delete announcement" aria-label={`Delete ${announcement.title}`}><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="adm-ann-main">
                  <h3 className="adm-ann-title">{announcement.title}</h3>
                  <p className="adm-ann-content">{announcement.content}</p>
                  <footer className="aa-card-footer">
                    <span className="adm-ann-meta"><Clock size={12} /> {fmt(announcement.created_at)}</span>
                    <span className="aa-author">By {announcement.author || 'Training Office'}</span>
                    <span className="aa-card-audience"><Users size={12} /> All employees</span>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {editor && (
        <div className="aa-modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) setEditor(null)
        }}>
          <section className="aa-modal" role="dialog" aria-modal="true" aria-labelledby="aa-modal-title">
            <header className="aa-modal-header">
              <div className="aa-modal-heading">
                <span className="aa-modal-icon"><Megaphone size={21} /></span>
                <div>
                  <small>{editor.id ? 'Update published message' : 'New employee communication'}</small>
                  <h2 id="aa-modal-title">{editor.id ? 'Edit announcement' : 'Create announcement'}</h2>
                  <p>{editor.id ? 'Make changes to the announcement employees currently see.' : 'Compose an update for everyone in the learning system.'}</p>
                </div>
              </div>
              <button className="aa-modal-close" type="button" onClick={() => setEditor(null)} disabled={saving} aria-label="Close announcement editor"><X size={19} /></button>
            </header>

            <form className="aa-modal-form" onSubmit={event => { event.preventDefault(); save() }}>
              <div className="aa-modal-body">
                <div className="aa-modal-field">
                  <div className="aa-field-label">
                    <label htmlFor="announcement-title"><Type size={14} /> Announcement title <em>Required</em></label>
                    <span>{editor.title.length}/120</span>
                  </div>
                  <input id="announcement-title" autoFocus maxLength={120} value={editor.title} onChange={event => setEditor({ ...editor, title: event.target.value })} placeholder="Enter a clear, descriptive title" />
                </div>

                <div className="aa-modal-field">
                  <div className="aa-field-label">
                    <label htmlFor="announcement-content"><AlignLeft size={14} /> Message <em>Required</em></label>
                    <span>{editor.content.length}/2000</span>
                  </div>
                  <textarea id="announcement-content" rows={7} maxLength={2000} value={editor.content} onChange={event => setEditor({ ...editor, content: event.target.value })} placeholder="Write the information employees need to know..." />
                  <small className="aa-field-help">Keep the message concise and include any important dates or required actions.</small>
                </div>

                <div className="aa-modal-lower">
                  <div className="aa-modal-field">
                    <div className="aa-field-label"><label htmlFor="announcement-author"><UserRound size={14} /> Published by</label></div>
                    <input id="announcement-author" maxLength={80} value={editor.author} onChange={event => setEditor({ ...editor, author: event.target.value })} placeholder="Training Office" />
                  </div>

                  <div className="aa-modal-audience">
                    <span><Users size={18} /></span>
                    <div><small>Audience</small><strong>All employees</strong><p>Visible on the employee Home page</p></div>
                  </div>
                </div>
              </div>

              <footer className="aa-modal-footer">
                <p><Clock size={13} /> {editor.id ? 'Changes appear immediately after saving.' : 'This will be published immediately.'}</p>
                <div>
                  <button className="aa-modal-cancel" type="button" onClick={() => setEditor(null)} disabled={saving}>Cancel</button>
                  <button className="aa-modal-submit" type="submit" disabled={saving || !editor.title.trim() || !editor.content.trim()}>
                    <Send size={15} /> {saving ? 'Saving...' : editor.id ? 'Save changes' : 'Publish announcement'}
                  </button>
                </div>
              </footer>
            </form>
          </section>
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
