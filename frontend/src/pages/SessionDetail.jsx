import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import {
  PlayCircle, FileText, Download, CheckCircle2, ClipboardList,
  BookOpen, ArrowLeft, Clock, Hash, GraduationCap
} from 'lucide-react'
import { MOCK_COURSES } from '../mockData'
import { useUser } from '../UserContext'
import { getResultsForUser } from '../examStore'
import { getTasksForCourse, getSubmissionsForUser } from '../taskStore'
import { getVideoProgress } from '../progressStore'
import { getSessionVideosForCourse, readVideoDuration, formatVideoDuration } from '../videoStore'
import { getMaterialsForCourse } from '../materialsStore'
import QuizModal from '../components/QuizModal'
import TaskModal from '../components/TaskModal'
import VideoModal from '../components/VideoModal'
import DarLogo from '../components/DarLogo'
import './SessionDetail.css'

// Chrome-free shell for the standalone (new-tab) session view: a slim branded
// top bar with a way back to the full app, then the page body.
function Shell({ children }) {
  return (
    <div className="sd-standalone">
      <header className="sd-topbar">
        <div className="sd-topbar-inner">
          <div className="sd-brand">
            <DarLogo size={34} />
            <div>
              <p className="sd-brand-name">DAR Online CapDev</p>
              <p className="sd-brand-sub">Capacity Development Platform</p>
            </div>
          </div>
          <Link to="/courses/browse" className="sd-topbar-link">
            <ArrowLeft size={15} /> Browse Courses
          </Link>
        </div>
      </header>
      <div className="sd-page">{children}</div>
    </div>
  )
}

const fmtTime = s => {
  if (!s || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function SessionDetail() {
  const { courseId } = useParams()
  const { user } = useUser()
  const userId = user?.id

  const [course, setCourse] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [videos, setVideos] = useState([])
  const [durations, setDurations] = useState({})
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [results, setResults] = useState({})
  const [materials, setMaterials] = useState([])
  const [videoProg, setVideoProg] = useState({})

  const [quiz, setQuiz] = useState(null)
  const [taskModal, setTaskModal] = useState(null)
  const [videoModal, setVideoModal] = useState(null)

  const loadSubs = () => { if (userId) getSubmissionsForUser(userId).then(setSubmissions) }
  const loadResults = () => { if (userId) getResultsForUser(userId).then(setResults) }
  const loadVideoProg = () => { if (userId) getVideoProgress(userId).then(setVideoProg) }

  // Resolve the course from the API (fallback to mock data) by id.
  useEffect(() => {
    let active = true
    const pick = list => {
      const found = (list || []).find(c => String(c.id) === String(courseId))
      if (!active) return
      if (found) { setCourse(found); setNotFound(false) }
      else setNotFound(true)
    }
    axios.get('/api/courses')
      .then(r => pick(Array.isArray(r.data) ? r.data : MOCK_COURSES))
      .catch(() => pick(MOCK_COURSES))
    return () => { active = false }
  }, [courseId])

  // Pull every content type for this one session.
  useEffect(() => {
    if (!courseId) return
    getTasksForCourse(courseId).then(setTasks)
    getMaterialsForCourse(courseId).then(setMaterials)
    getSessionVideosForCourse(courseId).then(async vids => {
      setVideos(vids)
      const pairs = await Promise.all(vids.map(async v => [v.id, await readVideoDuration(v.url)]))
      setDurations(Object.fromEntries(pairs))
    })
  }, [courseId])

  useEffect(() => { loadSubs() }, [userId])       // eslint-disable-line
  useEffect(() => { loadResults() }, [userId])    // eslint-disable-line
  useEffect(() => { loadVideoProg() }, [userId])  // eslint-disable-line

  // Keep the browser tab title meaningful for the standalone view.
  useEffect(() => {
    if (course) document.title = `Session ${course.session} — ${course.title}`
    return () => { document.title = 'DAR Online CapDev' }
  }, [course])

  if (notFound) {
    return (
      <Shell>
        <div className="sd-empty">
          <BookOpen size={40} />
          <p>Session not found.</p>
          <Link to="/courses/browse" className="sd-back-link"><ArrowLeft size={15} /> Back to Browse Courses</Link>
        </div>
      </Shell>
    )
  }

  if (!course) {
    return <Shell><div className="sd-loading">Loading session…</div></Shell>
  }

  const preResult = results[`${course.id}-pre`]
  const postResult = results[`${course.id}-post`]
  const watchedCount = videos.filter(v => videoProg[v.id]?.completed).length
  const totalVideoSecs = videos.reduce((sum, v) => sum + (durations[v.id] || 0), 0)
  const videoDurationLabel = formatVideoDuration(totalVideoSecs)
  const taskDoneCount = tasks.filter(t => submissions[t.id]).length

  // Same completion logic as the Browse Courses card.
  const videoDone = !course.hasVideo || videos.length === 0 || videos.every(v => videoProg[v.id]?.completed)
  const taskDone = tasks.length === 0 || tasks.every(t => submissions[t.id])
  const items = [videoDone, taskDone, !!preResult, !!postResult]
  const pct = Math.round((items.filter(Boolean).length / items.length) * 100)

  return (
    <Shell>
      {/* Hero / session summary */}
      <header className="sd-hero">
        <div className="sd-hero-top">
          <span className="sd-session-pill">Session {course.session}</span>
          {course.code && <span className="sd-code">{course.code}</span>}
          <span className="sd-division">{course.division}</span>
        </div>
        <h1 className="sd-title">{course.title}</h1>
        {course.description && <p className="sd-desc">{course.description}</p>}

        <div className="sd-meta">
          {videoDurationLabel && <span className="sd-meta-item"><Clock size={15} /> {videoDurationLabel}</span>}
          <span className="sd-meta-item"><Hash size={15} /> {course.code || `Session ${course.session}`}</span>
          <span className="sd-meta-item"><GraduationCap size={15} /> {course.division} Division</span>
        </div>

        <div className="sd-progress">
          <div className="sd-progress-bar">
            <div
              className="sd-progress-fill"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? 'var(--g500)' : pct > 0 ? 'var(--b500)' : 'transparent'
              }}
            />
          </div>
          <span className="sd-progress-pct">{pct}% Complete</span>
        </div>
      </header>

      {/* Quick stat cards */}
      <div className="sd-stats">
        <div className="sd-stat">
          <PlayCircle size={20} className="sd-stat-ic icon-video" />
          <div><p className="sd-stat-num">{watchedCount}/{videos.length}</p><p className="sd-stat-lbl">Videos watched</p></div>
        </div>
        <div className="sd-stat">
          <ClipboardList size={20} className="sd-stat-ic icon-tasks" />
          <div><p className="sd-stat-num">{taskDoneCount}/{tasks.length}</p><p className="sd-stat-lbl">Tasks done</p></div>
        </div>
        <div className="sd-stat">
          <FileText size={20} className="sd-stat-ic icon-pretest" />
          <div><p className="sd-stat-num">{preResult ? `${preResult.pct}%` : '—'}</p><p className="sd-stat-lbl">Pre-Test</p></div>
        </div>
        <div className="sd-stat">
          <FileText size={20} className="sd-stat-ic icon-posttest" />
          <div><p className="sd-stat-num">{postResult ? `${postResult.pct}%` : '—'}</p><p className="sd-stat-lbl">Post-Test</p></div>
        </div>
      </div>

      {/* Video lectures */}
      <section className="sd-section">
        <h2 className="sd-section-title"><PlayCircle size={18} className="icon-video" /> Video Lectures</h2>
        {videos.length === 0 ? (
          <p className="sd-none">No videos uploaded yet.</p>
        ) : (
          <ul className="sd-list">
            {videos.map((v, idx) => {
              const vp = videoProg[v.id]
              const dur = durations[v.id]
              const durTxt = dur != null ? fmtTime(dur) : null
              const sub = vp?.completed
                ? `Completed${durTxt ? ` · ${durTxt}` : ''}`
                : vp?.position > 0
                  ? `Stopped at ${fmtTime(vp.position)}${durTxt ? ` / ${durTxt}` : ''}`
                  : durTxt ? `Duration: ${durTxt}` : ''
              return (
                <li key={v.id} className="sd-item">
                  <div className="sd-item-info">
                    <span className="sd-num">{idx + 1}</span>
                    <div>
                      <p className="sd-item-title">{v.title || `Video ${idx + 1}`}</p>
                      {sub && <p className="sd-item-sub">{sub}</p>}
                    </div>
                  </div>
                  <div className="sd-item-actions">
                    {vp?.completed && <span className="sd-badge sd-badge-done"><CheckCircle2 size={13} /> Watched</span>}
                    <button className="sd-btn" onClick={() => setVideoModal({ course, video: v })}>
                      {vp?.completed ? 'Rewatch' : (vp?.position > 0 ? 'Resume' : 'Watch')}
                    </button>
                    <a className="sd-icon-btn" href={`${v.url}?download`} target="_blank" rel="noreferrer" title="Download">
                      <Download size={14} />
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Tasks */}
      <section className="sd-section">
        <h2 className="sd-section-title"><ClipboardList size={18} className="icon-tasks" /> Tasks per Topic</h2>
        {tasks.length === 0 ? (
          <p className="sd-none">No tasks for this session.</p>
        ) : (
          <ul className="sd-list">
            {tasks.map(t => {
              const sub = submissions[t.id]
              return (
                <li key={t.id} className="sd-item sd-item-btn" onClick={() => setTaskModal(t)}>
                  <div className="sd-item-info">
                    <span className={`sd-task-ic${sub ? ' done' : ''}`}>
                      {sub ? <CheckCircle2 size={16} /> : <FileText size={15} />}
                    </span>
                    <div>
                      <p className="sd-item-title">{t.title}</p>
                      {t.description && <p className="sd-item-sub">{t.description}</p>}
                    </div>
                  </div>
                  <span className={`sd-badge ${sub ? 'sd-badge-done' : 'sd-badge-todo'}`}>
                    {sub ? 'Submitted' : 'Submit'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Tests */}
      <section className="sd-section">
        <h2 className="sd-section-title"><FileText size={18} className="icon-pretest" /> Assessments</h2>
        <div className="sd-tests">
          <button className={`sd-test ${preResult ? 'done' : ''}`} onClick={() => setQuiz({ type: 'pre', priorResult: preResult })}>
            <FileText size={18} className="icon-pretest" />
            <div className="sd-test-info">
              <p className="sd-item-title">Pre-Test</p>
              {preResult
                ? <p className="sd-item-sub">Score: {preResult.score}/{preResult.total} · <b>{preResult.pct}%</b></p>
                : <p className="sd-item-sub">Tap to start</p>}
            </div>
            {preResult && <CheckCircle2 size={15} className="sd-test-check" />}
          </button>

          <button
            className={`sd-test ${postResult ? 'done' : ''}${!preResult ? ' locked' : ''}`}
            disabled={!preResult}
            onClick={() => preResult && setQuiz({ type: 'post', priorResult: postResult })}
          >
            <FileText size={18} className="icon-posttest" />
            <div className="sd-test-info">
              <p className="sd-item-title">Post-Test</p>
              {postResult
                ? <p className="sd-item-sub">Score: {postResult.score}/{postResult.total} · <b>{postResult.pct}%</b></p>
                : <p className="sd-item-sub">{preResult ? 'Tap to start' : 'Take the Pre-Test first'}</p>}
            </div>
            {postResult && <CheckCircle2 size={15} className="sd-test-check" />}
          </button>
        </div>
      </section>

      {/* Downloadable materials */}
      <section className="sd-section">
        <h2 className="sd-section-title"><Download size={18} className="icon-docs" /> Downloadable Learning Materials</h2>
        {materials.length === 0 ? (
          <p className="sd-none">No materials uploaded yet.</p>
        ) : (
          <ul className="sd-list">
            {materials.map((m, idx) => (
              <li key={m.id} className="sd-item">
                <a className="sd-item-info sd-item-link" href={m.url} target="_blank" rel="noreferrer" title="Open file">
                  <span className="sd-num">{idx + 1}</span>
                  <div>
                    <p className="sd-item-title">{m.title || m.file_name}</p>
                    <p className="sd-item-sub">Click to open · or download →</p>
                  </div>
                </a>
                <a className="sd-icon-btn" href={`${m.url}?download`} target="_blank" rel="noreferrer" title="Download">
                  <Download size={14} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modals */}
      {quiz && (
        <QuizModal
          course={course}
          type={quiz.type}
          userId={userId}
          priorResult={quiz.priorResult}
          onClose={() => setQuiz(null)}
          onSubmitted={loadResults}
        />
      )}
      {taskModal && (
        <TaskModal
          task={taskModal}
          userId={userId}
          submission={submissions[taskModal.id]}
          onClose={() => setTaskModal(null)}
          onSubmitted={loadSubs}
        />
      )}
      {videoModal && (
        <VideoModal
          course={videoModal.course}
          video={videoModal.video}
          userId={userId}
          startPosition={videoProg[videoModal.video.id]?.position || 0}
          alreadyCompleted={videoProg[videoModal.video.id]?.completed}
          onClose={() => setVideoModal(null)}
          onProgress={loadVideoProg}
        />
      )}
    </Shell>
  )
}
