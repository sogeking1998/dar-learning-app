import { useState, useEffect } from 'react'
import { UploadCloud, FileText, Trash2, ExternalLink } from 'lucide-react'
import { useCourses } from '../courseStore'
import { getMaterialsForCourse, addMaterial, deleteMaterialById } from '../materialsStore'
import ConfirmModal from '../components/ConfirmModal'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

// Accept a broad set of common learning-material formats.
const ALLOWED = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'rtf', 'zip', 'png', 'jpg', 'jpeg', 'gif', 'mp3', 'mp4']
const ACCEPT = ALLOWED.map(e => `.${e}`).join(',')

const badgeClass = ext => {
  if (ext === 'pdf') return 'mf-pdf'
  if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) return 'mf-doc'
  if (['ppt', 'pptx'].includes(ext)) return 'mf-ppt'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'mf-xls'
  if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return 'mf-img'
  return 'mf-other'
}

export default function AdminMaterials({ courseId: propCourseId }) {
  const embedded = propCourseId != null
  const [division, setDivision] = useState('PBD')
  const [localCourseId, setCourseId] = useState(null)
  const courseId = embedded ? propCourseId : localCourseId
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [upIndex, setUpIndex] = useState(0)
  const [error, setError] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const { courses: allCourses } = useCourses()
  const divCourses = allCourses.filter(c => c.division === division).sort((a, b) => a.session - b.session)

  useEffect(() => {
    if (embedded) return
    if (!divCourses.find(c => c.id === localCourseId)) setCourseId(divCourses[0]?.id ?? null)
  }, [division]) // eslint-disable-line

  const load = async () => {
    if (courseId == null) return
    setLoading(true)
    setMaterials(await getMaterialsForCourse(courseId))
    setLoading(false)
    setFiles([]); setError(null)
  }
  useEffect(() => { load() }, [courseId]) // eslint-disable-line

  const course = allCourses.find(c => c.id === courseId)

  const pick = e => {
    const list = Array.from(e.target.files || [])
    setError(null)
    if (!list.length) return
    const ok = [], bad = []
    for (const f of list) {
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      if (ALLOWED.includes(ext)) ok.push(f); else bad.push(f.name)
    }
    if (bad.length) setError(`Skipped unsupported file${bad.length > 1 ? 's' : ''}: ${bad.join(', ')}`)
    setFiles(ok)
  }

  const doAdd = async () => {
    if (!files.length) return
    setBusy(true); setError(null)
    let failed = null
    for (let i = 0; i < files.length; i++) {
      setUpIndex(i); setProgress(0)
      const { error } = await addMaterial(courseId, files[i], setProgress)
      if (error) { failed = `${files[i].name}: ${error.message}`; break }
    }
    setBusy(false); setFiles([])
    if (failed) setError(failed)
    load()
  }

  const doDelete = async () => {
    const m = confirmDel
    setConfirmDel(null)
    const { error } = await deleteMaterialById(m.id, m.url)
    if (error) { setError(error.message); return }
    load()
  }

  return (
    <div className={embedded ? '' : 'ax-wrap'}>
      {!embedded && (
        <div className="admin-head">
          <h1 className="admin-title">Learning Materials</h1>
          <p className="admin-sub">Upload one or more downloadable files for each session</p>
        </div>
      )}

      {!embedded && (
        <div className="ax-tabs">
          {DIVISIONS.map(d => (
            <button key={d} className={`ax-tab${division === d ? ' active' : ''}`} onClick={() => setDivision(d)}>{d}</button>
          ))}
        </div>
      )}

      {!embedded && (
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
      )}

      <div className="vid-admin">
        <div className="vid-admin-head">
          <div className="vid-admin-headtext">
            <span className="vid-admin-eyebrow">{course ? `${course.code} · Session ${course.session}` : '—'}</span>
            <h3 className="vid-admin-title">{course?.title || 'Select a session'}</h3>
          </div>
          <span className={`vid-admin-badge ${materials.length ? 'has' : 'none'}`}>
            {materials.length ? `${materials.length} file${materials.length === 1 ? '' : 's'}` : 'No files'}
          </span>
        </div>

        <div className="vid-admin-split">
          {/* Left — current materials */}
          <div className="vid-admin-left">
            {loading ? (
              <div className="vid-empty-box">Loading…</div>
            ) : materials.length === 0 ? (
              <div className="vid-empty-box">
                <div className="vid-admin-empty-ic"><FileText size={28} /></div>
                <p>No materials for this session yet</p>
                <span>Upload a file on the right</span>
              </div>
            ) : (
              <div className="mat-file-list">
                {materials.map(m => {
                  const ext = (m.file_name?.split('.').pop() || '').toLowerCase()
                  return (
                    <div key={m.id} className="mat-file-card">
                      <button type="button" className="mat-file-open" onClick={() => window.open(m.url, '_blank', 'noopener')} title="Open file">
                        <span className={`mat-file-ic ${badgeClass(ext)}`}>{ext.toUpperCase() || 'FILE'}</span>
                        <span className="mat-file-meta">
                          <span className="mat-file-name">{m.file_name}</span>
                          <span className="mat-file-sub">Added {fmtDate(m.created_at)} · click to open</span>
                        </span>
                        <ExternalLink size={16} className="mat-file-ext" />
                      </button>
                      <button type="button" className="mat-file-del" onClick={() => setConfirmDel(m)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right — upload */}
          <div className="vid-admin-right">
            <label className={`vid-admin-pick${busy ? ' disabled' : ''}`}>
              <UploadCloud size={22} />
              <div className="vid-admin-pick-txt">
                <strong>{files.length === 0 ? 'Choose files' : files.length === 1 ? files[0].name : `${files.length} files selected`}</strong>
                <small>Select one or many · PDF, Word, PowerPoint, Excel, images & more</small>
              </div>
              <input type="file" accept={ACCEPT} multiple onClick={e => { e.currentTarget.value = '' }} onChange={pick} hidden disabled={busy} />
            </label>

            {error && <div className="task-error">{error}</div>}

            {busy ? (
              <div className="vid-progress">
                <div className="vid-progress-track"><div className="vid-progress-fill" style={{ width: `${progress}%` }} /></div>
                <span className="vid-progress-pct">
                  {files.length > 1 ? `Uploading ${upIndex + 1} of ${files.length} · ` : 'Uploading… '}{progress}%
                </span>
              </div>
            ) : (
              <button className="vid-admin-up" onClick={doAdd} disabled={!files.length}>
                {files.length > 1 ? `Add ${files.length} Files` : 'Add File'}
              </button>
            )}

            <p className="vid-admin-note">Learners can download every file listed here for the session.</p>
          </div>
        </div>
      </div>

      {confirmDel && (
        <ConfirmModal
          icon={Trash2}
          title="Delete this file?"
          message={`"${confirmDel.file_name}" will be permanently removed from this session.`}
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
