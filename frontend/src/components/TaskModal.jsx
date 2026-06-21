import { useState } from 'react'
import { X, UploadCloud, FileText, CheckCircle2, ListChecks, Trash2, ExternalLink } from 'lucide-react'
import { submitTask, getSubmissionUrl, deleteSubmission } from '../taskStore'
import ConfirmModal from './ConfirmModal'
import './TaskModal.css'

const ALLOWED = ['pdf', 'docx']

export default function TaskModal({ task, userId, submission, onClose, onSubmitted }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(!!submission)
  const [savedName, setSavedName] = useState(submission?.file_name || null)
  const [savedPath, setSavedPath] = useState(submission?.file_path || null)
  const [opening, setOpening] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const pick = e => {
    const f = e.target.files?.[0]
    setError(null)
    if (!f) return
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED.includes(ext)) {
      setError('Only PDF or DOCX files are allowed.')
      setFile(null)
      return
    }
    setFile(f)
  }

  const upload = async () => {
    if (!file || busy) return
    if (!userId) { setError('You are not signed in.'); return }
    setBusy(true)
    const { error, path } = await submitTask(userId, task.id, file)
    setBusy(false)
    if (error) { setError(error.message); return }
    setSavedName(file.name)
    setSavedPath(path)
    setFile(null)
    setDone(true)
    if (onSubmitted) onSubmitted()
  }

  const openFile = async () => {
    if (!savedPath || opening) return
    setOpening(true)
    const { url, error } = await getSubmissionUrl(savedPath)
    setOpening(false)
    if (error) { setError(error.message); return }
    window.open(url, '_blank', 'noopener')
  }

  const doDelete = async () => {
    setConfirmDel(false)
    setDeleting(true)
    const { error } = await deleteSubmission(userId, task.id, savedPath)
    setDeleting(false)
    if (error) { setError(error.message); return }
    setDone(false)
    setSavedName(null)
    setSavedPath(null)
    if (onSubmitted) onSubmitted()
  }

  const ext = (savedName?.split('.').pop() || '').toLowerCase()

  return (
    <div className="task-overlay" onClick={onClose}>
      <div className="task-modal" onClick={e => e.stopPropagation()}>
        <button className="task-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        <div className="task-modal-head">
          <div className="task-modal-icon"><FileText size={22} /></div>
          <div className="task-modal-headtext">
            <h2 className="task-modal-title">{task.title}</h2>
            {task.description && <p className="task-modal-desc">{task.description}</p>}
          </div>
        </div>

        {/* Instructions */}
        <div className="task-instructions">
          <p className="task-instructions-label"><ListChecks size={15} /> Instructions</p>
          <p className="task-instructions-text">
            {task.instructions || 'No specific instructions were provided for this task.'}
          </p>
        </div>

        {done && (
          <div className="task-submitted">
            <div className="task-submitted-top">
              <CheckCircle2 size={18} />
              <p className="task-submitted-t">Task submitted</p>
            </div>
            <div className="task-file-chip">
              <button type="button" className="task-file-open" onClick={openFile} disabled={opening} title="Open file">
                <span className={`task-file-ic tf-${ext === 'pdf' ? 'pdf' : 'doc'}`}>{ext.toUpperCase() || 'FILE'}</span>
                <span className="task-file-name">{savedName}</span>
                <ExternalLink size={15} className="task-file-ext" />
              </button>
              <button type="button" className="task-file-del" onClick={() => setConfirmDel(true)} disabled={deleting} title="Delete submission">
                <Trash2 size={15} />
              </button>
            </div>
            {opening && <p className="task-file-hint">Opening…</p>}
          </div>
        )}

        {/* Upload */}
        <p className="task-upload-label">{done ? 'Replace submission' : 'Your submission'}</p>
        <label className="task-drop">
          <UploadCloud size={24} />
          <span className="task-drop-main">{file ? file.name : 'Choose a PDF or DOCX file'}</span>
          <span className="task-drop-sub">{done ? 'Upload a new file to replace your submission' : 'Click to browse your files'}</span>
          <input type="file" accept=".pdf,.docx" onClick={e => { e.currentTarget.value = '' }} onChange={pick} hidden />
        </label>

        {error && <div className="task-error">{error}</div>}

        <div className="task-actions">
          <button className="task-btn task-btn-cancel" onClick={onClose}>Close</button>
          <button className="task-btn task-btn-upload" onClick={upload} disabled={!file || busy}>
            {busy ? 'Uploading…' : (done ? 'Resubmit' : 'Upload & Complete')}
          </button>
        </div>
      </div>

      {confirmDel && (
        <ConfirmModal
          icon={Trash2}
          title="Delete submission?"
          message="Your uploaded file will be permanently removed and this task will be marked incomplete."
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(false)}
        />
      )}
    </div>
  )
}
