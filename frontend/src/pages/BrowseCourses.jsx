import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  PlayCircle, FileText, Download, CheckCircle2,
  ClipboardList, BookOpen, ChevronDown, ChevronUp, Lock, ExternalLink
} from 'lucide-react'
import { MOCK_COURSES } from '../mockData'
import { useUser } from '../UserContext'
import { getResultsForUser } from '../examStore'
import { getTasksMap, getSubmissionsForUser } from '../taskStore'
import { getVideoProgress } from '../progressStore'
import { getAllSessionVideos, readVideoDuration } from '../videoStore'
import { getMaterialsMap } from '../materialsStore'
import { PASS_PCT, examPassed } from '../completion'
import QuizModal from '../components/QuizModal'
import TaskModal from '../components/TaskModal'
import VideoModal from '../components/VideoModal'
import './BrowseCourses.css'

const DIVISIONS = ['PBD', 'LTS', 'AJD', 'Admin']

const fmtTime = s => {
  if (!s || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

// One Pre/Post test card. Clickable to take the test; shows the recorded score.
function TestCard({ label, type, course, result, locked, onTake }) {
  const pct = result ? result.pct : 0
  const passed = pct >= PASS_PCT

  return (
    <button
      type="button"
      className={`test-card test-card-btn ${passed ? 'test-card-done' : ''}${locked ? ' test-card-locked' : ''}`}
      onClick={() => { if (!locked) onTake(type, result) }}
      disabled={locked}
      aria-disabled={locked}
    >
      {locked
        ? <Lock size={18} className="mat-icon test-lock-ic" />
        : <FileText size={18} className={`mat-icon ${type === 'pre' ? 'icon-pretest' : 'icon-posttest'}`} />}
      <div className="test-card-info">
        <p className="mat-name">{label}</p>
        {locked ? (
          <p className="mat-sub">Take the Pre-Test first</p>
        ) : result ? (
          <p className="mat-sub">
            Score: {result.score}/{result.total}
            <span className={`test-score-pct ${passed ? 'tsp-pass' : 'tsp-fail'}`}>{pct}%</span>
            {!passed && <span className="test-need"> · Need {PASS_PCT}% to pass</span>}
          </p>
        ) : (
          <p className="mat-sub">Tap to start</p>
        )}
      </div>
      {!locked && passed && <CheckCircle2 size={15} className="test-check" />}
    </button>
  )
}

export default function BrowseCourses() {
  const location = useLocation()
  const target = location.state || {}
  const { user } = useUser()
  const userId = user?.id
  const [courses, setCourses] = useState(MOCK_COURSES)
  const [activeDiv, setActiveDiv] = useState(target.division || 'PBD')
  const [expanded, setExpanded] = useState({})
  const [highlightId, setHighlightId] = useState(target.courseId || null)
  const [quiz, setQuiz] = useState(null)
  const [results, setResults] = useState({})
  const [tasks, setTasks] = useState({})
  const [submissions, setSubmissions] = useState({})
  const [videoProg, setVideoProg] = useState({})
  const [sessionVideos, setSessionVideos] = useState({})   // { course_id: [videos] }
  const [videoDurations, setVideoDurations] = useState({}) // { video_id: seconds }
  const [videoOpen, setVideoOpen] = useState({})           // { course_id: bool }
  const [materials, setMaterials] = useState({})           // { course_id: [{file_name, url}] }
  const [matOpen, setMatOpen] = useState({})               // { course_id: bool }
  const [taskOpen, setTaskOpen] = useState({})             // { course_id: bool }
  const [taskModal, setTaskModal] = useState(null)
  const [videoModal, setVideoModal] = useState(null)
  const cardRefs = useRef({})

  const loadSubs = () => { if (userId) getSubmissionsForUser(userId).then(setSubmissions) }
  const loadVideoProg = () => { if (userId) getVideoProgress(userId).then(setVideoProg) }

  const openQuiz = (course, type, priorResult) => setQuiz({ course, type, priorResult })
  const closeQuiz = () => setQuiz(null)

  const loadResults = () => {
    if (userId) getResultsForUser(userId).then(setResults)
  }

  useEffect(() => {
    axios.get('/api/courses')
      .then(r => { if (Array.isArray(r.data)) setCourses(r.data) })
      .catch(() => {})
  }, [])

  useEffect(() => { loadResults() }, [userId]) // eslint-disable-line
  useEffect(() => { loadSubs() }, [userId]) // eslint-disable-line
  useEffect(() => { loadVideoProg() }, [userId]) // eslint-disable-line
  useEffect(() => { getTasksMap().then(setTasks) }, [])
  useEffect(() => { getMaterialsMap().then(setMaterials) }, [])

  // Load every session's video playlist + read each video's real duration.
  useEffect(() => {
    let active = true
    getAllSessionVideos().then(async map => {
      if (!active) return
      setSessionVideos(map)
      const all = Object.values(map).flat()
      const pairs = await Promise.all(all.map(async v => [v.id, await readVideoDuration(v.url)]))
      if (active) setVideoDurations(Object.fromEntries(pairs))
    })
    return () => { active = false }
  }, [])

  // When arriving from "My Courses", jump to the exact division + topic.
  useEffect(() => {
    if (!target.courseId) return
    if (target.division) setActiveDiv(target.division)
    setExpanded(prev => ({ ...prev, [target.courseId]: true }))
    setHighlightId(target.courseId)
    const t = setTimeout(() => {
      const el = cardRefs.current[target.courseId]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
    const clear = setTimeout(() => setHighlightId(null), 2400)
    return () => { clearTimeout(t); clearTimeout(clear) }
  }, [target.courseId, target.division])

  // Sort by session so each one gates the next.
  const divCourses = courses
    .filter(c => c.division === activeDiv)
    .sort((a, b) => a.session - b.session)

  const toggleExpand = id =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  // Real session progress: video watched + task submitted + pre & post taken.
  const progressOf = course => {
    const courseTasks = tasks[course.id] || []
    const courseVideos = sessionVideos[course.id] || []
    const hasVideos = courseVideos.length > 0
    const hasTasks = courseTasks.length > 0
    const videoDone = !hasVideos || courseVideos.every(v => videoProg[v.id]?.completed)
    const taskDone = !hasTasks || courseTasks.every(t => submissions[t.id])
    const preDone = examPassed(results[`${course.id}-pre`])
    const postDone = examPassed(results[`${course.id}-post`])
    // Only count requirements that actually exist for this session.
    const items = [preDone, postDone]
    if (hasVideos) items.push(videoDone)
    if (hasTasks) items.push(taskDone)
    const done = items.filter(Boolean).length
    const pct = items.length ? Math.round((done / items.length) * 100) : 0
    const status = done === items.length ? 'completed' : done > 0 ? 'in_progress' : 'not_started'
    return { videoDone, taskDone, preDone, postDone, done, pct, status }
  }

  return (
    <div className="browse-page">
      <div className="page-header">
        <h1 className="page-title">Browse Courses</h1>
        <p className="page-sub">Explore all available training modules by division</p>
      </div>

      {/* Division tabs */}
      <div className="div-tabs-wrap">
        <p className="div-tabs-label">Select based on Division/Section</p>
        <div className="div-tabs">
          {DIVISIONS.map(div => (
            <button
              key={div}
              className={`div-tab${activeDiv === div ? ' active' : ''}`}
              onClick={() => setActiveDiv(div)}
            >
              {div}
            </button>
          ))}
        </div>
      </div>

      {/* Materials section */}
      <div className="materials-section">
        <h2 className="materials-title">
          <BookOpen size={18} /> Materials: {activeDiv}
        </h2>

        <div className="sessions-list">
          {divCourses.map((course, i) => {
            const prev = divCourses[i - 1]
            const prog = progressOf(course)
            const locked = i > 0 && progressOf(prev).status !== 'completed'
            const openVal = locked
              ? false
              : (expanded[course.id] === undefined ? true : expanded[course.id])

            return (
              <div
                key={course.id}
                ref={el => { cardRefs.current[course.id] = el }}
                className={`session-card${highlightId === course.id ? ' session-card-highlight' : ''}${locked ? ' session-card-locked' : ''}`}
              >
                {/* Session header */}
                <div className="session-header-row">
                  <button
                    className="session-header"
                    onClick={() => { if (!locked) toggleExpand(course.id) }}
                    disabled={locked}
                    aria-disabled={locked}
                  >
                    <div className="sh-left">
                      <span className="sh-num">Session {course.session}</span>
                      <h3 className="sh-title">{course.title}</h3>
                    </div>
                    <div className="sh-right">
                      {locked ? (
                        <span className="sh-status ss-locked"><Lock size={12} /> Locked</span>
                      ) : (
                        <>
                          <span className={`sh-status ${
                            prog.status === 'completed'   ? 'ss-done'
                            : prog.status === 'in_progress' ? 'ss-progress'
                            : 'ss-pending'
                          }`}>
                            {prog.status === 'completed'   ? 'Completed'
                             : prog.status === 'in_progress' ? 'In Progress'
                             : 'Not Started'}
                          </span>
                          {openVal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </>
                      )}
                    </div>
                  </button>
                  {!locked && (
                    <a
                      className="sh-open"
                      href={`/session/${course.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open this session in a new tab"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>

                {/* Locked note */}
                {locked && (
                  <div className="session-locked-note">
                    <Lock size={14} />
                    Complete Session {prev.session} to unlock this session.
                  </div>
                )}

                {/* Session materials */}
                {openVal && !locked && (
                  <div className="session-materials">
                    {/* Video presentation — expandable playlist */}
                    {course.hasVideo && (() => {
                      const vids = sessionVideos[course.id] || []
                      const watchedCount = vids.filter(v => videoProg[v.id]?.completed).length
                      const vOpen = !!videoOpen[course.id]
                      return (
                        <div className="video-block">
                          <button
                            type="button"
                            className="material-row video-head"
                            onClick={() => vids.length && setVideoOpen(p => ({ ...p, [course.id]: !p[course.id] }))}
                          >
                            <div className="mat-info">
                              <PlayCircle size={18} className="mat-icon icon-video" />
                              <div>
                                <p className="mat-name">Video Lectures</p>
                                <p className="mat-sub">
                                  {vids.length === 0
                                    ? 'No video uploaded yet'
                                    : `${vids.length} video${vids.length === 1 ? '' : 's'} · ${watchedCount}/${vids.length} watched`}
                                </p>
                              </div>
                            </div>
                            <div className="mat-actions">
                              {prog.videoDone && vids.length > 0 && <span className="mat-watched"><CheckCircle2 size={14} /> Watched</span>}
                              {vids.length > 0 && (vOpen ? <ChevronUp size={16} className="vid-caret" /> : <ChevronDown size={16} className="vid-caret" />)}
                            </div>
                          </button>

                          {vOpen && vids.length > 0 && (
                            <ul className="video-list">
                              {vids.map((v, idx) => {
                                const vp = videoProg[v.id]
                                const dur = videoDurations[v.id]
                                const durTxt = dur != null ? fmtTime(dur) : null
                                const sub = vp?.completed
                                  ? `Completed${durTxt ? ` · ${durTxt}` : ''}`
                                  : vp?.position > 0
                                    ? `Stopped at ${fmtTime(vp.position)}${durTxt ? ` / ${durTxt}` : ''}`
                                    : durTxt ? `Duration: ${durTxt}` : 'Reading length…'
                                return (
                                  <li key={v.id} className="video-item">
                                    <div className="vi-info">
                                      <span className="vi-num">{idx + 1}</span>
                                      <div>
                                        <p className="vi-title">{v.title || `Video ${idx + 1}`}</p>
                                        <p className="mat-sub">{sub}</p>
                                      </div>
                                    </div>
                                    <div className="mat-actions">
                                      {vp?.completed && <span className="mat-watched"><CheckCircle2 size={14} /> Watched</span>}
                                      <button className="mat-mark" onClick={() => setVideoModal({ course, video: v })}>
                                        {vp?.completed ? 'Rewatch' : (vp?.position > 0 ? 'Resume' : 'Watch')}
                                      </button>
                                      <a className="mat-action btn-download" href={`${v.url}?download`} target="_blank" rel="noreferrer" title="Download">
                                        <Download size={14} />
                                      </a>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      )
                    })()}

                    {/* Tasks */}
                    {(() => {
                      const courseTasks = tasks[course.id] || []
                      const doneCount = courseTasks.filter(t => submissions[t.id]).length
                      const tOpen = !!taskOpen[course.id]
                      return (
                        <div className="video-block">
                          <button
                            type="button"
                            className="material-row video-head"
                            onClick={() => courseTasks.length && setTaskOpen(p => ({ ...p, [course.id]: !p[course.id] }))}
                          >
                            <div className="mat-info">
                              <ClipboardList size={18} className="mat-icon icon-tasks" />
                              <div>
                                <p className="mat-name">Tasks per Topic</p>
                                <p className="mat-sub">{doneCount}/{courseTasks.length} completed</p>
                              </div>
                            </div>
                            <div className="mat-actions">
                              {courseTasks.length > 0 && doneCount === courseTasks.length && (
                                <span className="mat-watched"><CheckCircle2 size={14} /> Completed</span>
                              )}
                              {courseTasks.length > 0 && (tOpen ? <ChevronUp size={16} className="vid-caret" /> : <ChevronDown size={16} className="vid-caret" />)}
                            </div>
                          </button>
                          {tOpen && courseTasks.length > 0 && (
                            <ul className="task-list">
                              {courseTasks.map(t => {
                                const sub = submissions[t.id]
                                return (
                                  <li key={t.id}>
                                    <button type="button" className="task-item task-item-btn" onClick={() => setTaskModal(t)}>
                                      <span className={`task-ic${sub ? ' done' : ''}`}>
                                        {sub ? <CheckCircle2 size={16} /> : <FileText size={15} />}
                                      </span>
                                      <div className="task-body">
                                        <p className="task-title">{t.title}</p>
                                        {t.description && <p className="task-desc">{t.description}</p>}
                                      </div>
                                      {sub
                                        ? <span className="task-badge task-badge-done">Submitted</span>
                                        : <span className="task-badge task-badge-todo">Submit</span>}
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      )
                    })()}

                    {/* Pre/Post test row */}
                    <div className="tests-row">
                      <TestCard label="Pre-Test" type="pre" course={course} result={results[`${course.id}-pre`]} onTake={(t, r) => openQuiz(course, t, r)} />
                      <TestCard label="Post-Test" type="post" course={course} result={results[`${course.id}-post`]} locked={!results[`${course.id}-pre`]} onTake={(t, r) => openQuiz(course, t, r)} />
                    </div>

                    {/* Downloadable materials — expandable file list */}
                    {course.hasDownloads && (() => {
                      const mats = materials[course.id] || []
                      const mOpen = !!matOpen[course.id]
                      return (
                        <div className="video-block">
                          <button
                            type="button"
                            className="material-row video-head"
                            onClick={() => mats.length && setMatOpen(p => ({ ...p, [course.id]: !p[course.id] }))}
                          >
                            <div className="mat-info">
                              <FileText size={18} className="mat-icon icon-docs" />
                              <div>
                                <p className="mat-name">Downloadable Learning Materials</p>
                                <p className="mat-sub">
                                  {mats.length === 0 ? 'No materials uploaded yet' : `${mats.length} file${mats.length === 1 ? '' : 's'}`}
                                </p>
                              </div>
                            </div>
                            <div className="mat-actions">
                              {mats.length > 0 && (mOpen ? <ChevronUp size={16} className="vid-caret" /> : <ChevronDown size={16} className="vid-caret" />)}
                            </div>
                          </button>

                          {mOpen && mats.length > 0 && (
                            <ul className="video-list">
                              {mats.map((m, idx) => (
                                <li key={m.id} className="video-item">
                                  <a className="vi-info vi-info-link" href={m.url} target="_blank" rel="noreferrer" title="Open file">
                                    <span className="vi-num">{idx + 1}</span>
                                    <div>
                                      <p className="vi-title">{m.file_name}</p>
                                      <p className="mat-sub">Click to open · or download →</p>
                                    </div>
                                  </a>
                                  <a className="mat-action btn-download" href={`${m.url}?download`} target="_blank" rel="noreferrer" title="Download">
                                    <Download size={14} />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })()}

                    {/* Progress bar */}
                    <div className="session-progress">
                      <div className="sp-bar">
                        <div
                          className="sp-fill"
                          style={{
                            width: `${prog.pct}%`,
                            background:
                              prog.pct === 100 ? 'var(--g500)'
                              : prog.pct > 0   ? 'var(--b500)'
                              : 'transparent'
                          }}
                        />
                      </div>
                      <span className="sp-pct">{prog.pct}% Complete</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {divCourses.length === 0 && (
            <div className="empty-state">
              <BookOpen size={36} />
              <p>No courses found for {activeDiv} division.</p>
            </div>
          )}
        </div>
      </div>

      {quiz && (
        <QuizModal
          course={quiz.course}
          type={quiz.type}
          userId={userId}
          priorResult={quiz.priorResult}
          onClose={closeQuiz}
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
    </div>
  )
}
