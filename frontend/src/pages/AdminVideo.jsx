import { useState, useEffect } from 'react'
import { UploadCloud, Film, Trash2, Plus, RefreshCw } from 'lucide-react'
import { MOCK_COURSES } from '../mockData'
import {
  getSessionVideosForCourse, addSessionVideo, replaceSessionVideo, deleteSessionVideoById,
  getWelcomeVideo, setWelcomeVideo, deleteWelcomeVideo,
} from '../videoStore'
import ConfirmModal from '../components/ConfirmModal'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']
const fmtDate = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export default function AdminVideo() {
  const [division, setDivision] = useState('PBD')
  const [courseId, setCourseId] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  // Choice flow when a video already exists
  const [choice, setChoice] = useState(null)   // null | 'ask' | 'replace'
  const [replaceSel, setReplaceSel] = useState(null)

  // Welcome video (Home page)
  const [welcome, setWelcome] = useState(null)
  const [wFile, setWFile] = useState(null)
  const [wBusy, setWBusy] = useState(false)
  const [wProgress, setWProgress] = useState(0)
  const [wError, setWError] = useState(null)
  const [confirmDelWelcome, setConfirmDelWelcome] = useState(false)

  const loadWelcome = async () => setWelcome(await getWelcomeVideo())
  useEffect(() => { loadWelcome() }, [])

  const pickWelcome = e => {
    const f = e.target.files?.[0]
    setWError(null)
    if (!f) return
    if (!f.type.startsWith('video/')) { setWError('Please choose a video file (MP4 recommended).'); setWFile(null); return }
    setWFile(f)
  }
  const uploadWelcome = async () => {
    if (!wFile) return
    setWBusy(true); setWProgress(0); setWError(null)
    const { error } = await setWelcomeVideo(wFile, setWProgress)
    setWBusy(false)
    if (error) { setWError(error.message); return }
    setWFile(null); loadWelcome()
  }
  const doDeleteWelcome = async () => {
    setConfirmDelWelcome(false)
    const { error } = await deleteWelcomeVideo()
    if (error) { setWError(error.message); return }
    loadWelcome()
  }

  const divCourses = MOCK_COURSES.filter(c => c.division === division).sort((a, b) => a.session - b.session)

  useEffect(() => {
    if (!divCourses.find(c => c.id === courseId)) setCourseId(divCourses[0]?.id ?? null)
  }, [division]) // eslint-disable-line

  const load = async () => {
    if (courseId == null) return
    setLoading(true)
    setVideos(await getSessionVideosForCourse(courseId))
    setLoading(false)
    setFile(null); setError(null)
  }
  useEffect(() => { load() }, [courseId]) // eslint-disable-line

  const course = divCourses.find(c => c.id === courseId)

  const pick = e => {
    const f = e.target.files?.[0]
    setError(null)
    if (!f) return
    if (!f.type.startsWith('video/')) { setError('Please choose a video file (MP4 recommended).'); setFile(null); return }
    setFile(f)
  }

  const startUpload = () => {
    if (!file) return
    if (videos.length === 0) doAdd()
    else { setChoice('ask'); setReplaceSel(null) }
  }

  const doAdd = async () => {
    setChoice(null); setBusy(true); setProgress(0); setError(null)
    const { error } = await addSessionVideo(courseId, file, setProgress)
    setBusy(false)
    if (error) { setError(error.message); return }
    load()
  }

  const doReplace = async () => {
    if (!replaceSel) return
    const id = replaceSel
    setChoice(null); setBusy(true); setProgress(0); setError(null)
    const { error } = await replaceSessionVideo(id, courseId, file, setProgress)
    setBusy(false)
    if (error) { setError(error.message); return }
    load()
  }

  const doDelete = async () => {
    const id = confirmDel
    setConfirmDel(null)
    const { error } = await deleteSessionVideoById(id)
    if (error) { setError(error.message); return }
    load()
  }

  return (
    <div className="ax-wrap">
      <div className="admin-head">
        <h1 className="admin-title">Video Presentation</h1>
        <p className="admin-sub">Upload one or more presentation videos for each session</p>
      </div>

      {/* Welcome video — shown on the Home page */}
      <div className="vid-admin vid-admin-welcome">
        <div className="vid-admin-head">
          <div className="vid-admin-headtext">
            <span className="vid-admin-eyebrow">Home page</span>
            <h3 className="vid-admin-title">Welcome Video</h3>
          </div>
          <span className={`vid-admin-badge ${welcome ? 'has' : 'none'}`}>
            {welcome ? 'Uploaded' : 'No video'}
          </span>
        </div>

        <div className="vid-admin-split">
          <div className="vid-admin-left">
            {welcome ? (
              <div className="vid-list">
                <div className="vid-item">
                  <video className="vid-item-thumb" src={welcome.url} controls />
                  <div className="vid-item-info">
                    <p className="vid-item-title">{welcome.title || 'Welcome video'}</p>
                    <p className="vid-item-meta">Added {fmtDate(welcome.created_at)} · shown on Home</p>
                  </div>
                  <button className="vid-item-del" onClick={() => setConfirmDelWelcome(true)} title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>
            ) : (
              <div className="vid-empty-box">
                <div className="vid-admin-empty-ic"><Film size={28} /></div>
                <p>No welcome video yet</p>
                <span>Upload an MP4 on the right — it appears on the Home page</span>
              </div>
            )}
          </div>

          <div className="vid-admin-right">
            <label className={`vid-admin-pick${wBusy ? ' disabled' : ''}`}>
              <UploadCloud size={22} />
              <div className="vid-admin-pick-txt">
                <strong>{wFile ? wFile.name : 'Choose a video file'}</strong>
                <small>MP4 · click to browse</small>
              </div>
              <input type="file" accept="video/*" onClick={e => { e.currentTarget.value = '' }} onChange={pickWelcome} hidden disabled={wBusy} />
            </label>

            {wError && <div className="task-error">{wError}</div>}

            {wBusy ? (
              <div className="vid-progress">
                <div className="vid-progress-track"><div className="vid-progress-fill" style={{ width: `${wProgress}%` }} /></div>
                <span className="vid-progress-pct">Uploading… {wProgress}%</span>
              </div>
            ) : (
              <button className="vid-admin-up" onClick={uploadWelcome} disabled={!wFile}>
                {welcome ? 'Replace Welcome Video' : 'Upload Welcome Video'}
              </button>
            )}

            <p className="vid-admin-note">Shown at the top of the Home page for all learners.</p>
          </div>
        </div>
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

      <div className="vid-admin">
        <div className="vid-admin-head">
          <div className="vid-admin-headtext">
            <span className="vid-admin-eyebrow">{course ? `${course.code} · Session ${course.session}` : '—'}</span>
            <h3 className="vid-admin-title">{course?.title || 'Select a session'}</h3>
          </div>
          <span className={`vid-admin-badge ${videos.length ? 'has' : 'none'}`}>
            {videos.length ? `${videos.length} video${videos.length === 1 ? '' : 's'}` : 'No video'}
          </span>
        </div>

        <div className="vid-admin-split">
          {/* Left — videos */}
          <div className="vid-admin-left">
            {loading ? (
              <div className="vid-empty-box">Loading…</div>
            ) : videos.length === 0 ? (
              <div className="vid-empty-box">
                <div className="vid-admin-empty-ic"><Film size={28} /></div>
                <p>No video for this session yet</p>
                <span>Upload an MP4 on the right to get started</span>
              </div>
            ) : (
              <div className="vid-list">
                {videos.map((v, i) => (
                  <div key={v.id} className="vid-item">
                    <video className="vid-item-thumb" src={v.url} controls />
                    <div className="vid-item-info">
                      <p className="vid-item-title">{v.title || `Video ${i + 1}`}</p>
                      <p className="vid-item-meta">Added {fmtDate(v.created_at)}{i === 0 ? ' · shown to learners' : ''}</p>
                    </div>
                    <button className="vid-item-del" onClick={() => setConfirmDel(v.id)} title="Delete"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — upload */}
          <div className="vid-admin-right">
            <label className={`vid-admin-pick${busy ? ' disabled' : ''}`}>
              <UploadCloud size={22} />
              <div className="vid-admin-pick-txt">
                <strong>{file ? file.name : 'Choose a video file'}</strong>
                <small>MP4 · click to browse</small>
              </div>
              <input type="file" accept="video/*" onClick={e => { e.currentTarget.value = '' }} onChange={pick} hidden disabled={busy} />
            </label>

            {error && <div className="task-error">{error}</div>}

            {busy ? (
              <div className="vid-progress">
                <div className="vid-progress-track"><div className="vid-progress-fill" style={{ width: `${progress}%` }} /></div>
                <span className="vid-progress-pct">Uploading… {progress}%</span>
              </div>
            ) : (
              <button className="vid-admin-up" onClick={startUpload} disabled={!file}>Upload Video</button>
            )}

            <p className="vid-admin-note">The first video in the list is the one shown to learners.</p>
          </div>
        </div>
      </div>

      {/* Replace / Add choice modal */}
      {choice && (
        <div className="cm-overlay" onClick={() => setChoice(null)}>
          <div className="cm-card vid-choice" onClick={e => e.stopPropagation()}>
            {choice === 'ask' ? (
              <>
                <h3 className="cm-title">This session already has a video</h3>
                <p className="cm-message">Add this as a new video, or replace one of the existing videos?</p>
                <div className="vid-choice-opts">
                  <button className="vid-choice-opt" onClick={doAdd} disabled={busy}>
                    <Plus size={18} /> <span><b>Add as new video</b><small>Keep the current ones</small></span>
                  </button>
                  <button className="vid-choice-opt" onClick={() => setChoice('replace')} disabled={busy}>
                    <RefreshCw size={18} /> <span><b>Replace a video</b><small>Pick which one to overwrite</small></span>
                  </button>
                </div>
                <button className="vid-choice-cancel" onClick={() => setChoice(null)}>Cancel</button>
              </>
            ) : (
              <>
                <h3 className="cm-title">Which video to replace?</h3>
                <div className="vid-choice-list">
                  {videos.map((v, i) => (
                    <label key={v.id} className={`vid-choice-item${replaceSel === v.id ? ' sel' : ''}`}>
                      <input type="radio" name="repl" checked={replaceSel === v.id} onChange={() => setReplaceSel(v.id)} />
                      <video className="vid-choice-thumb" src={v.url} muted />
                      <span className="vid-choice-name">{v.title || `Video ${i + 1}`}</span>
                    </label>
                  ))}
                </div>
                <div className="vid-choice-foot">
                  <button className="vid-choice-cancel" onClick={() => setChoice('ask')}>Back</button>
                  <button className="vid-choice-confirm" onClick={doReplace} disabled={!replaceSel || busy}>
                    {busy ? 'Replacing…' : 'Replace video'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmDel && (
        <ConfirmModal
          icon={Trash2}
          title="Delete this video?"
          message="This video will be permanently removed from the session."
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {confirmDelWelcome && (
        <ConfirmModal
          icon={Trash2}
          title="Delete the welcome video?"
          message="It will be removed from the Home page."
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={doDeleteWelcome}
          onCancel={() => setConfirmDelWelcome(false)}
        />
      )}
    </div>
  )
}
