import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  MonitorPlay, FileText, Download, CheckCircle2, ClipboardCheck,
  BookOpen, ArrowLeft, Award, Lock, Eye, AlertTriangle
} from 'lucide-react'
import { getCourses } from '../courseStore'
import { useUser } from '../UserContext'
import { getResultsForUser } from '../examStore'
import { getTasksForCourse, getSubmissionsForUser, taskApproved } from '../taskStore'
import { getVideoProgress } from '../progressStore'
import { getSessionVideosForCourse, readVideoDuration, formatVideoDuration } from '../videoStore'
import { getMaterialsForCourse } from '../materialsStore'
import QuizModal from '../components/QuizModal'
import TaskModal from '../components/TaskModal'
import VideoModal from '../components/VideoModal'
import CertificateModal from '../components/CertificateModal'
import DarLogo from '../components/DarLogo'
import { certificateIssueDate, examPassed, PASS_PCT } from '../completion'
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
              <p className="sd-brand-name">TARUNGA</p>
              <p className="sd-brand-sub">DAR Online CapDev · Newly Hired Employees</p>
            </div>
          </div>
          <Link to="/courses" className="sd-topbar-link">
            <ArrowLeft size={15} /> Courses
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
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [showCert, setShowCert] = useState(false)

  const loadSubs = () => { if (userId) getSubmissionsForUser(userId).then(setSubmissions) }
  const loadResults = () => { if (userId) getResultsForUser(userId).then(setResults) }
  const loadVideoProg = () => { if (userId) getVideoProgress(userId).then(setVideoProg) }

  // Resolve the course by id (DB-backed, hardcoded fallback inside the store).
  useEffect(() => {
    let active = true
    getCourses().then(list => {
      if (!active) return
      const found = (list || []).find(c => String(c.id) === String(courseId))
      if (found) { setCourse(found); setNotFound(false) }
      else setNotFound(true)
    })
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

  // Continue Learning links open the exact next requirement. Consume the
  // query once so closing the modal does not immediately reopen it.
  useEffect(() => {
    if (!course) return
    const action = searchParams.get('continue')
    const itemId = searchParams.get('item')
    if (!action) return

    if (action === 'video') {
      const video = videos.find(v => String(v.id) === itemId)
      if (!video) return
      setVideoModal({ course, video })
    } else if (action === 'task') {
      const task = tasks.find(t => String(t.id) === itemId)
      if (!task) return
      setTaskModal(task)
    } else if (action === 'pre' || action === 'post') {
      setQuiz({ type: action, priorResult: results[`${course.id}-${action}`] })
    } else if (action === 'tasks') {
      requestAnimationFrame(() => document.getElementById('session-tasks')?.scrollIntoView({ behavior: 'smooth' }))
    } else {
      return
    }

    setSearchParams({}, { replace: true })
  }, [course, videos, tasks, results, searchParams, setSearchParams])

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
          <Link to="/courses" className="sd-back-link"><ArrowLeft size={15} /> Back to Courses</Link>
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
  const taskDoneCount = tasks.filter(t => taskApproved(submissions[t.id])).length
  const videoPct = videos.length ? Math.round((watchedCount / videos.length) * 100) : 100
  const taskPct = tasks.length ? Math.round((taskDoneCount / tasks.length) * 100) : 100

  // Same completion logic as the Browse Courses card.
  const videoDone = !course.hasVideo || videos.length === 0 || videos.every(v => videoProg[v.id]?.completed)
  const taskDone = tasks.length === 0 || tasks.every(t => taskApproved(submissions[t.id]))
  const postPassed = examPassed(postResult)
  const items = [videoDone, taskDone, !!preResult, postPassed]
  const completedRequirementCount = items.filter(Boolean).length
  const pct = Math.round((completedRequirementCount / items.length) * 100)
  const issuedAt = certificateIssueDate(course, {
    results,
    submissions,
    videoProg,
    tasks: { [course.id]: tasks },
    sessionVideos: { [course.id]: videos },
  })
  const titleParts = course.title.split(/\s+[\u2013\u2014-]\s+/)
  const titleLead = titleParts.shift()
  const titleAccent = titleParts.join(' — ')

  return (
    <Shell>
      {/* Hero / session summary */}
      <header className="sd-hero">
        <span className="sd-hero-glow" aria-hidden="true" />
        <div className="sd-hero-top">
          <span className="sd-session-pill">Session {course.session}</span>
        </div>
        <h1 className="sd-title">
          <span>{titleLead}</span>
          {titleAccent && <strong> — {titleAccent}</strong>}
        </h1>
        {course.description && <p className="sd-desc">{course.description}</p>}

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
          <span className="sd-progress-pct"><strong>{pct}%</strong><small>Complete</small></span>
        </div>
      </header>

      {/* Quick stat cards */}
      <div className="sd-stats">
        <div className="sd-stat">
          <MonitorPlay size={20} className="sd-stat-ic icon-video" />
          <div><p className="sd-stat-num">{watchedCount}/{videos.length}</p><p className="sd-stat-lbl">Videos watched</p></div>
          {videoDone ? <CheckCircle2 className="sd-stat-state done" size={15} /> : <AlertTriangle className="sd-stat-state pending" size={15} />}
        </div>
        <div className="sd-stat">
          <ClipboardCheck size={20} className="sd-stat-ic icon-tasks" />
          <div><p className="sd-stat-num">{taskDoneCount}/{tasks.length}</p><p className="sd-stat-lbl">Tasks done</p></div>
          {taskDone ? <CheckCircle2 className="sd-stat-state done" size={15} /> : <AlertTriangle className="sd-stat-state pending" size={15} />}
        </div>
        <div className="sd-stat">
          <FileText size={20} className="sd-stat-ic icon-pretest" />
          <div><p className="sd-stat-num">{preResult ? `${preResult.pct}%` : '—'}</p><p className="sd-stat-lbl">Pre-Test score</p></div>
          {preResult ? <CheckCircle2 className="sd-stat-state done" size={15} /> : <AlertTriangle className="sd-stat-state pending" size={15} />}
        </div>
        <div className="sd-stat">
          <FileText size={20} className="sd-stat-ic icon-posttest" />
          <div><p className="sd-stat-num">{postResult ? `${postResult.pct}%` : '—'}</p><p className="sd-stat-lbl">{postResult && !postPassed ? 'Retake required' : 'Post-Test'}</p></div>
          {postPassed ? <CheckCircle2 className="sd-stat-state done" size={15} /> : <AlertTriangle className="sd-stat-state pending" size={15} />}
        </div>
      </div>

      <div className="sd-learning-plan">
      {/* Video lectures */}
      <section id="session-videos" className="sd-section">
        <h2 className="sd-section-title"><MonitorPlay size={18} className="icon-video" /> Video Lectures</h2>
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
      <section id="session-tasks" className="sd-section">
        <h2 className="sd-section-title"><ClipboardCheck size={18} className="icon-tasks" /> Tasks</h2>
        {tasks.length === 0 ? (
          <p className="sd-none">No tasks for this session.</p>
        ) : (
          <ul className="sd-list">
            {tasks.map(t => {
              const sub = submissions[t.id]
              const st = sub?.status
              return (
                <li key={t.id} className="sd-item sd-item-btn" onClick={() => setTaskModal(t)}>
                  <div className="sd-item-info">
                    <span className={`sd-task-ic${st === 'passed' ? ' done' : ''}`}>
                      {st === 'passed' ? <CheckCircle2 size={16} /> : <FileText size={15} />}
                    </span>
                    <div>
                      <p className="sd-item-title">{t.title}</p>
                      {t.description && <p className="sd-item-sub">{t.description}</p>}
                    </div>
                  </div>
                  {st === 'passed'
                    ? <span className="sd-badge sd-badge-done">Passed</span>
                    : st === 'failed'
                      ? <span className="sd-badge sd-badge-failed">Needs revision</span>
                      : sub
                        ? <span className="sd-badge sd-badge-review">In review</span>
                        : <span className="sd-badge sd-badge-todo">Submit</span>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Tests */}
      <section id="session-assessments" className="sd-section">
        <h2 className="sd-section-title"><FileText size={18} className="icon-pretest" /> Assessments</h2>
        <div className="sd-tests">
          <button className={`sd-test ${preResult ? 'done' : ''}`} onClick={() => setQuiz({ type: 'pre', priorResult: preResult })}>
            <FileText size={18} className="icon-pretest" />
            <div className="sd-test-info">
              <p className="sd-item-title">Pre-Test</p>
              {preResult
                ? <p className="sd-item-sub">Score: {preResult.score}/{preResult.total} · <b>{preResult.pct}%</b> · Completed</p>
                : <p className="sd-item-sub">Tap to start</p>}
            </div>
            {preResult && <CheckCircle2 size={15} className="sd-test-check" />}
          </button>

          <button
            className={`sd-test ${postPassed ? 'done' : ''}${postResult && !postPassed ? ' failed' : ''}${!preResult ? ' locked' : ''}`}
            disabled={!preResult}
            onClick={() => preResult && setQuiz({ type: 'post', priorResult: postResult })}
          >
            <FileText size={18} className="icon-posttest" />
            <div className="sd-test-info">
              <p className="sd-item-title">Post-Test</p>
              {postResult
                ? <p className="sd-item-sub">Score: {postResult.score}/{postResult.total} · <b>{postResult.pct}%</b>{!postPassed && ` · Retake required (${PASS_PCT}% needed)`}</p>
                : <p className="sd-item-sub">{preResult ? 'Tap to start' : 'Take the Pre-Test first'}</p>}
            </div>
            {postPassed && <CheckCircle2 size={15} className="sd-test-check" />}
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

      {/* Certificate */}
      <section className="sd-section">
        <h2 className="sd-section-title"><Award size={18} className="icon-cert" /> Certificate</h2>
        {pct === 100 ? (
          <div className="sd-cert sd-cert-ready">
            <div className="sd-cert-badge"><Award size={26} /></div>
            <div className="sd-cert-info">
              <p className="sd-item-title">Certificate of Completion</p>
              <p className="sd-item-sub">You've completed this session — your certificate is ready to download.</p>
            </div>
            <div className="sd-cert-actions">
              <button className="sd-icon-btn" onClick={() => setShowCert(true)} title="View certificate"><Eye size={15} /></button>
              <button className="sd-btn" onClick={() => setShowCert(true)}><Download size={14} /> Download</button>
            </div>
          </div>
        ) : (
          <div className="sd-cert sd-cert-locked">
            <div className="sd-cert-badge locked"><Lock size={22} /></div>
            <div className="sd-cert-info">
              <p className="sd-item-title">Certificate locked</p>
              <p className="sd-item-sub">Complete the video, task, pre-test and post-test to unlock your certificate.</p>
            </div>
            <div className="sd-cert-prog">
              <div className="sd-cert-bar"><div className="sd-cert-fill" style={{ width: `${pct}%` }} /></div>
              <span className="sd-cert-pct">{pct}%</span>
            </div>
          </div>
        )}
      </section>

      <section className="sd-overview">
        <div className="sd-overview-head">
          <div><span>Progress overview</span><small>{completedRequirementCount} of {items.length} requirements completed</small></div>
          <strong>{pct === 100 ? 'Session complete' : `${items.length - completedRequirementCount} remaining`}</strong>
        </div>
        <div className="sd-overview-body">
          <div className="sd-overall-score" style={{ '--score': `${pct * 3.6}deg` }}>
            <div><strong>{pct}%</strong><span>Overall</span></div>
          </div>
          <div className="sd-overview-bars">
            {[
              { label: 'Videos', value: videoDone ? 100 : videoPct, tone: 'ov-green', detail: videoDone ? 'Complete' : `${watchedCount}/${videos.length} watched` },
              { label: 'Tasks', value: taskDone ? 100 : taskPct, tone: 'ov-amber', detail: taskDone ? 'Complete' : `${taskDoneCount}/${tasks.length} approved` },
              { label: 'Pre-Test', value: preResult ? 100 : 0, tone: 'ov-blue', detail: preResult ? `Completed · Score ${preResult.pct}%` : 'Not taken' },
              { label: 'Post-Test', value: postPassed ? 100 : 0, tone: 'ov-purple', detail: postPassed ? `Passed · Score ${postResult.pct}%` : postResult ? `Retake · Score ${postResult.pct}%` : 'Not taken' },
            ].map(({ label, value, tone, detail }) => (
              <div className="sd-overview-row" key={label}>
                <span>{label}</span>
                <div><i className={tone} style={{ width: `${value}%` }} /></div>
                <strong className={value === 100 ? 'complete' : ''}>{detail}</strong>
              </div>
            ))}
          </div>
          <blockquote><span>“</span><p>{pct === 100 ? 'Excellent work. You completed every session requirement.' : 'Keep going! You’re making meaningful progress.'}</p></blockquote>
        </div>
      </section>
      </div>

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
      {showCert && (
        <CertificateModal
          name={user.name}
          course={course}
          date={issuedAt}
          onClose={() => setShowCert(false)}
        />
      )}
    </Shell>
  )
}
