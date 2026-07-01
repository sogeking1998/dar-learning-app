import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowRight, CheckCircle2, PlayCircle, Filter, RotateCcw } from 'lucide-react'
import { MOCK_COURSES } from '../mockData'
import { useUser } from '../UserContext'
import { sessionCompletion, useUserProgress } from '../completion'
import { getQuestionCounts } from '../examStore'
import { getSessionDurations, formatVideoDuration } from '../videoStore'
import './MyCourses.css'

const FILTERS = ['All', 'In Progress', 'Completed', 'Not Started']
const statusMap = { 'All': null, 'In Progress': 'in_progress', 'Completed': 'completed', 'Not Started': 'not_started' }

const HEAD_BG = { PBD: 'hd-pbd', LTS: 'hd-lts', AJD: 'hd-ajd', Admin: 'hd-admin' }

export default function MyCourses() {
  const [courses, setCourses] = useState(MOCK_COURSES)
  const [filter, setFilter]   = useState('All')
  const [durations, setDurations] = useState({})  // { course_id: totalVideoSeconds }
  const [qCounts, setQCounts] = useState({})      // { `${course_id}-${type}`: questionCount }
  const nav = useNavigate()
  const { user } = useUser()
  const progress = useUserProgress(user?.id)

  useEffect(() => {
    axios.get('/api/courses').then(r => { if (Array.isArray(r.data)) setCourses(r.data) }).catch(() => {})
  }, [])

  useEffect(() => { getSessionDurations().then(setDurations) }, [])
  useEffect(() => { getQuestionCounts().then(setQCounts) }, [])

  const openInBrowse = course =>
    nav('/courses/browse', { state: { division: course.division, courseId: course.id } })

  // Real completion from Supabase: video + tasks + pre + post.
  const withComp = courses.map(c => ({ ...c, comp: sessionCompletion(c, progress) }))
  const statusKey = statusMap[filter]
  const visible   = statusKey ? withComp.filter(c => c.comp.status === statusKey) : withComp

  return (
    <div className="mycourses-page">
      <div className="mc-page-hd">
        <div>
          <h1 className="mc-page-title">My Courses</h1>
          <p className="mc-page-sub">Your enrolled modules and learning progress</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <Filter size={14} className="filter-icon" />
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            <span className="filter-count">
              {f === 'All' ? withComp.length : withComp.filter(c => c.comp.status === statusMap[f]).length}
            </span>
          </button>
        ))}
      </div>

      {/* Course grid */}
      <div className="mc-grid">
        {visible.map(course => (
          <div key={course.id} className="mc-card" onClick={() => openInBrowse(course)}>

            {/* Gradient header (matches Home page cards) */}
            <div className={`mc-head ${HEAD_BG[course.division] || 'hd-pbd'}`}>
              <div className="mc-head-top">
                <span className="mc-div-lbl">{course.division}</span>
                <span className={`mc-status ${
                  course.comp.status === 'completed'   ? 'mcs-done'
                  : course.comp.status === 'in_progress' ? 'mcs-active'
                  : 'mcs-pending'
                }`}>
                  {course.comp.status === 'completed' ? 'Completed'
                   : course.comp.status === 'in_progress' ? 'In Progress'
                   : 'Not Started'}
                </span>
              </div>
              <h3 className="mc-title">{course.title}</h3>
              <div className="mc-head-bar">
                <div className="mc-head-fill" style={{ width: `${course.comp.pct}%` }} />
              </div>
              <div className="mc-head-foot">
                <span className="mc-pct-lbl">{course.comp.pct}% complete</span>
                <span className="mc-session-lbl">Session {course.session}</span>
              </div>
            </div>

            <div className="mc-body">
              <p className="mc-desc">{course.description}</p>

              <div className="mc-meta">
                {formatVideoDuration(durations[course.id]) && (
                  <span><PlayCircle size={12} /> {formatVideoDuration(durations[course.id])}</span>
                )}
                <span><CheckCircle2 size={12} /> {(progress.tasks[course.id] || []).length} tasks</span>
              </div>

              <div className="mc-tests">
                <div className={`test-pill ${course.comp.preDone ? 'tp-done' : 'tp-pending'}`}>
                  Pre-Test {course.comp.preDone ? '✓' : `(${qCounts[`${course.id}-pre`] ?? course.preTest.questions}Q)`}
                </div>
                <div className={`test-pill ${course.comp.postDone ? 'tp-done' : 'tp-pending'}`}>
                  Post-Test {course.comp.postDone ? '✓' : `(${qCounts[`${course.id}-post`] ?? course.postTest.questions}Q)`}
                </div>
              </div>

              <button
                className={`mc-btn ${
                  course.comp.status === 'completed'    ? 'mc-btn-review'
                  : course.comp.pct > 0                 ? 'mc-btn-continue'
                  : 'mc-btn-start'
                }`}
                onClick={e => { e.stopPropagation(); openInBrowse(course) }}
              >
                {course.comp.status === 'completed'
                  ? <><RotateCcw size={13} /> Review Course</>
                  : course.comp.pct > 0
                  ? <>Continue Learning <ArrowRight size={13} /></>
                  : <><PlayCircle size={13} /> Start Course</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="mc-empty">
          <Filter size={36} />
          <p>No courses match this filter.</p>
        </div>
      )}
    </div>
  )
}
