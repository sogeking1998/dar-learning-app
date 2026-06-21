import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Download, PlayCircle, FileText, Search, FolderDown, ChevronDown, ChevronUp
} from 'lucide-react'
import { MOCK_COURSES } from '../mockData'
import { getAllSessionVideos, readVideoDuration } from '../videoStore'
import { getMaterialsMap } from '../materialsStore'
import './Resources.css'

const DIVISIONS = ['All', 'PBD', 'LTS', 'AJD', 'Admin']

const fmtTime = s => {
  if (!s || s < 0) return null
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

const extOf = name => {
  const e = (name?.split('.').pop() || '').split('?')[0].toUpperCase()
  return /^[A-Z0-9]{1,5}$/.test(e) ? e : 'FILE'
}

const TYPE_ICON = { video: PlayCircle, docs: FileText }
const TYPE_CLS = { video: 'rs-video', docs: 'rs-docs' }

export default function Resources() {
  const [courses, setCourses] = useState(MOCK_COURSES)
  const [videos, setVideos] = useState({})         // { course_id: [videos] }
  const [materials, setMaterials] = useState({})   // { course_id: [materials] }
  const [videoDur, setVideoDur] = useState({})     // { video_id: seconds }
  const [activeDiv, setActiveDiv] = useState('All')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState({})   // { course_id: bool } — collapsed by default

  useEffect(() => {
    axios.get('/api/courses').then(r => { if (Array.isArray(r.data)) setCourses(r.data) }).catch(() => {})
    getMaterialsMap().then(setMaterials)
  }, [])

  // Videos per session + real durations.
  useEffect(() => {
    let active = true
    getAllSessionVideos().then(async map => {
      if (!active) return
      setVideos(map)
      const all = Object.values(map).flat()
      const pairs = await Promise.all(all.map(async v => [v.id, await readVideoDuration(v.url)]))
      if (active) setVideoDur(Object.fromEntries(pairs))
    })
    return () => { active = false }
  }, [])

  // Real downloadable items for a session: uploaded videos + uploaded materials.
  const itemsFor = course => {
    const vids = videos[course.id] || []
    const mats = materials[course.id] || []
    return [
      ...vids.map((v, i) => ({
        key: `v-${v.id}`, type: 'video',
        name: v.title || `Video ${i + 1}`, meta: fmtTime(videoDur[v.id]) || 'Video presentation',
        ext: extOf(v.url), url: v.url,
      })),
      ...mats.map(m => ({
        key: `m-${m.id}`, type: 'docs',
        name: m.file_name, meta: 'Learning material',
        ext: extOf(m.file_name), url: m.url,
      })),
    ]
  }

  const filtered = courses.filter(c => {
    const divOk = activeDiv === 'All' || c.division === activeDiv
    const qOk = !query || c.title.toLowerCase().includes(query.toLowerCase())
    return divOk && qOk
  })

  // Only sessions that actually have downloadable files.
  const groups = filtered
    .map(c => ({ course: c, items: itemsFor(c) }))
    .filter(g => g.items.length > 0)

  const totalFiles = groups.reduce((s, g) => s + g.items.length, 0)

  const downloadAll = items =>
    items.forEach((it, i) => setTimeout(() => {
      const a = document.createElement('a')
      a.href = `${it.url}?download`
      a.target = '_blank'
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }, i * 350))

  return (
    <div className="resources-page">
      <div className="page-header">
        <h1 className="page-title">Resource Materials</h1>
        <p className="page-sub">All downloadable videos and learning materials in one place</p>
      </div>

      {/* Toolbar */}
      <div className="rs-toolbar">
        <div className="rs-search">
          <Search size={15} className="rs-search-icon" />
          <input
            className="rs-search-input"
            placeholder="Search materials…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="rs-tabs">
          {DIVISIONS.map(d => (
            <button
              key={d}
              className={`rs-tab${activeDiv === d ? ' active' : ''}`}
              onClick={() => setActiveDiv(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <p className="rs-count">{totalFiles} {totalFiles === 1 ? 'file' : 'files'} available</p>

      {/* Material groups */}
      <div className="rs-list">
        {groups.map(({ course, items }) => {
          const isOpen = !!open[course.id]
          return (
          <div key={course.id} className="rs-group">
            <button
              type="button"
              className="rs-group-hd rs-group-toggle"
              onClick={() => setOpen(p => ({ ...p, [course.id]: !p[course.id] }))}
            >
              <span className={`rs-div-badge dp-${course.division.toLowerCase()}`}>{course.division}</span>
              <div className="rs-group-titles">
                <p className="rs-group-title">{course.title}</p>
                <p className="rs-group-sub">Session {course.session} · {course.code} · {items.length} {items.length === 1 ? 'file' : 'files'}</p>
              </div>
              <span className="rs-dl-all" role="button" tabIndex={0}
                onClick={e => { e.stopPropagation(); downloadAll(items) }}
                title="Download all files for this session">
                <Download size={14} /> <span>Download All</span>
              </span>
              {isOpen ? <ChevronUp size={18} className="rs-caret" /> : <ChevronDown size={18} className="rs-caret" />}
            </button>
            {isOpen && (
            <div className="rs-files">
              {items.map(m => {
                const Icon = TYPE_ICON[m.type]
                return (
                  <a
                    key={m.key}
                    className="rs-file rs-file-link"
                    href={`${m.url}?download`}
                    target="_blank"
                    rel="noreferrer"
                    title={`Download ${m.name}`}
                  >
                    <div className={`rs-file-icon ${TYPE_CLS[m.type]}`}><Icon size={18} /></div>
                    <div className="rs-file-info">
                      <p className="rs-file-name">{m.name}</p>
                      <p className="rs-file-meta">{m.meta}</p>
                    </div>
                    <span className="rs-file-ext">{m.ext}</span>
                    <span className="rs-dl"><Download size={15} /></span>
                  </a>
                )
              })}
            </div>
            )}
          </div>
          )
        })}

        {groups.length === 0 && (
          <div className="rs-empty">
            <FolderDown size={36} />
            <p>No materials available yet{activeDiv !== 'All' ? ` for ${activeDiv}` : ''}.</p>
          </div>
        )}
      </div>
    </div>
  )
}
