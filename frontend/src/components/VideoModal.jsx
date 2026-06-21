import { useState, useEffect, useRef } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { saveVideoPosition, markVideoCompleted } from '../progressStore'
import './VideoModal.css'

const fmt = s => {
  if (!s || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function VideoModal({ course, video, userId, startPosition = 0, alreadyCompleted, onClose, onProgress }) {
  const url = video?.url
  const videoId = video?.id
  const [done, setDone] = useState(!!alreadyCompleted)
  const videoRef = useRef(null)
  const lastSave = useRef(0)
  const doneRef = useRef(!!alreadyCompleted)

  // Resume from the saved position.
  const onLoaded = () => {
    const v = videoRef.current
    if (v && startPosition > 0 && startPosition < (v.duration || Infinity) - 1) {
      v.currentTime = startPosition
    }
  }

  const persist = pos => {
    if (userId && pos > 0) saveVideoPosition(userId, course.id, videoId, Math.floor(pos))
  }

  // Save position roughly every 5 seconds while playing.
  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    const now = Date.now()
    if (now - lastSave.current > 5000) {
      lastSave.current = now
      persist(v.currentTime)
    }
  }

  const onPause = () => {
    const v = videoRef.current
    if (v) persist(v.currentTime)
  }

  const onEnded = async () => {
    if (doneRef.current) return
    const v = videoRef.current
    if (userId) await markVideoCompleted(userId, course.id, videoId, Math.floor(v?.duration || 0))
    doneRef.current = true
    setDone(true)
    if (onProgress) onProgress()
  }

  const close = () => {
    const v = videoRef.current
    if (v) persist(v.currentTime)
    onClose()
  }

  // Save final position if the component unmounts unexpectedly.
  useEffect(() => () => {
    const v = videoRef.current
    if (v && userId) saveVideoPosition(userId, course.id, videoId, Math.floor(v.currentTime))
  }, []) // eslint-disable-line

  return (
    <div className="vid-overlay" onClick={close}>
      <div className="vid-modal" onClick={e => e.stopPropagation()}>
        <header className="vid-hd">
          <div>
            <p className="vid-eyebrow">{course.code} · {course.title}</p>
            <h2 className="vid-title">{video?.title || 'Video Presentation'}</h2>
          </div>
          <button className="vid-close" onClick={close} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="vid-stage">
          {!url ? (
            <div className="vid-empty">No video has been uploaded for this session yet.</div>
          ) : (
            <video
              ref={videoRef}
              className="vid-player"
              src={url}
              controls
              autoPlay
              onLoadedMetadata={onLoaded}
              onTimeUpdate={onTimeUpdate}
              onPause={onPause}
              onEnded={onEnded}
            />
          )}
        </div>

        <footer className="vid-foot">
          {done ? (
            <span className="vid-done"><CheckCircle2 size={16} /> Completed — this part is done</span>
          ) : startPosition > 0 ? (
            <span className="vid-hint">Resuming from {fmt(startPosition)} · watch to the end to complete this part</span>
          ) : (
            <span className="vid-hint">Watch the video to the end to complete this part.</span>
          )}
        </footer>
      </div>
    </div>
  )
}
