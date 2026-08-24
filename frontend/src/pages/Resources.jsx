import { useState, useEffect } from 'react'
import {
  Download, PlayCircle, FileText, Search, FolderDown, ChevronDown, ChevronUp,
  LayoutGrid, Users, Map, Scale, Building2, Files, X, ArrowDownToLine, FolderOpen,
} from 'lucide-react'
import { useCourses } from '../courseStore'
import { getAllSessionVideos, readVideoDuration } from '../videoStore'
import { getMaterialsMap } from '../materialsStore'
import illustration from '../assets/resources/resource-illustration.png'
import './Resources.css'

// Filter cards, in display order — the code they filter on, the label/blurb
// shown, the icon, and the color class shared with the matching group badges.
const FILTERS = [
  { code: 'All',   label: 'All Topics', sub: 'All materials',                    Icon: LayoutGrid, cls: 'all'   },
  { code: 'PBD',   label: 'PBD',        sub: 'Program Beneficiaries Development', Icon: Users,      cls: 'pbd'   },
  { code: 'LTS',   label: 'LTS',        sub: 'Land Tenure Services',              Icon: Map,        cls: 'lts'   },
  { code: 'AJD',   label: 'Legal (AJD)',sub: 'Agrarian Justice Delivery',         Icon: Scale,      cls: 'ajd'   },
  { code: 'Admin', label: 'Admin',      sub: 'Administrative Services',           Icon: Building2,  cls: 'admin' },
]
const DIV_ICON = { PBD: Users, LTS: Map, AJD: Scale, Admin: Building2 }

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
  const { courses } = useCourses()
  const [videos, setVideos] = useState({})         // { course_id: [videos] }
  const [materials, setMaterials] = useState({})   // { course_id: [materials] }
  const [videoDur, setVideoDur] = useState({})     // { video_id: seconds }
  const [activeDiv, setActiveDiv] = useState('All')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState({})   // { course_id: bool } — collapsed by default

  useEffect(() => {
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

  // Build the library once, then layer topic and keyword filters over it.
  const allGroups = courses
    .map(course => ({ course, items: itemsFor(course) }))
    .filter(group => group.items.length > 0)

  const normalizedQuery = query.trim().toLowerCase()
  const groups = allGroups.filter(({ course, items }) => {
    const divisionMatches = activeDiv === 'All' || course.division === activeDiv
    const searchText = [
      course.title,
      course.code,
      course.division,
      `session ${course.session}`,
      ...items.map(item => item.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return divisionMatches && (!normalizedQuery || searchText.includes(normalizedQuery))
  })

  const totalFiles = groups.reduce((sum, group) => sum + group.items.length, 0)
  const totalLibraryFiles = allGroups.reduce((sum, group) => sum + group.items.length, 0)
  const hasFilters = activeDiv !== 'All' || normalizedQuery.length > 0

  const fileCountFor = division => allGroups.reduce((sum, group) => {
    if (division !== 'All' && group.course.division !== division) return sum
    return sum + group.items.length
  }, 0)

  const clearFilters = () => {
    setActiveDiv('All')
    setQuery('')
  }

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
      <section className="rs-hero" aria-labelledby="resources-title">
        <span className="rs-hero-glow rs-hero-glow-one" />
        <span className="rs-hero-glow rs-hero-glow-two" />

        <div className="rs-hero-copy">
          <h1 id="resources-title">Resources that keep<br /><span>learning within reach.</span></h1>
          <p>Review course videos, presentations, and reference materials whenever you need them—all organized in one place.</p>

          <div className="rs-hero-stats" aria-label="Resource library summary">
            <div className="rs-hero-stat">
              <strong>{totalLibraryFiles}</strong>
              <span>Learning files</span>
            </div>
            <span className="rs-stat-divider" />
            <div className="rs-hero-stat">
              <strong>{allGroups.length}</strong>
              <span>Course sessions</span>
            </div>
            <span className="rs-stat-divider" />
            <div className="rs-hero-stat rs-anytime-stat">
              <span className="rs-stat-icon"><ArrowDownToLine size={17} /></span>
              <span>Ready to download</span>
            </div>
          </div>
        </div>

        <div className="rs-hero-art" aria-hidden="true">
          <span className="rs-art-ring rs-art-ring-one" />
          <span className="rs-art-ring rs-art-ring-two" />
          <span className="rs-art-platform" />
          <img src={illustration} alt="" />
          <div className="rs-art-note">
            <span><Files size={15} /></span>
            <div><strong>One library</strong><small>All your course files</small></div>
          </div>
        </div>
      </section>

      <section className="rs-library" aria-label="Browse resource materials">
      <div className="rs-toolbar">
        <div className="rs-search">
          <Search size={19} className="rs-search-icon" />
          <label className="rs-sr-only" htmlFor="resource-search">Search learning materials</label>
          <input
            id="resource-search"
            className="rs-search-input"
            placeholder="Search materials by title, topic, or keyword…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="rs-search-clear" type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="rs-filter-heading">
        <div>
          <span className="rs-section-label">Browse by topic</span>
          <p>Choose a service area to narrow down the library.</p>
        </div>
        {hasFilters && <button type="button" className="rs-reset" onClick={clearFilters}>Reset filters</button>}
      </div>

      <div className="rs-filters">
        {FILTERS.map(({ code, label, sub, Icon, cls }) => (
          <button
            key={code}
            className={`rs-filter-card ${cls}${activeDiv === code ? ' active' : ''}`}
            onClick={() => setActiveDiv(code)}
            aria-pressed={activeDiv === code}
          >
            <span className="rs-filter-icon"><Icon size={18} /></span>
            <span className="rs-filter-text">
              <b>{label}</b>
              <small>{sub}</small>
            </span>
            <span className="rs-filter-count">{fileCountFor(code)}</span>
          </button>
        ))}
      </div>
      </section>

      <section className="rs-results" aria-labelledby="resource-results-title">
      <div className="rs-results-head">
        <div className="rs-results-heading">
          <span className="rs-results-icon"><FolderOpen size={20} /></span>
          <div>
            <span className="rs-section-label">Available materials</span>
            <h2 id="resource-results-title"><strong>{totalFiles}</strong> {totalFiles === 1 ? 'resource' : 'resources'} found</h2>
          </div>
        </div>
        {groups.length > 0 && (
          <span className="rs-results-context">
            <LayoutGrid size={13} />
            {activeDiv === 'All' ? 'All learning topics' : FILTERS.find(filter => filter.code === activeDiv)?.label}
          </span>
        )}
      </div>

      {/* Material groups */}
      <div className="rs-list">
        {groups.map(({ course, items }) => {
          const isOpen = !!open[course.id]
          const DivIcon = DIV_ICON[course.division]
          return (
          <article key={course.id} className={`rs-group dp-${course.division.toLowerCase()}${isOpen ? ' open' : ''}`}>
            <div className="rs-group-hd">
              <button
                type="button"
                className="rs-group-toggle"
                onClick={() => setOpen(p => ({ ...p, [course.id]: !p[course.id] }))}
                aria-expanded={isOpen}
                aria-controls={`resource-files-${course.id}`}
              >
              <span className="rs-group-icon">{DivIcon && <DivIcon size={20} />}</span>
              <div className="rs-group-titles">
                <span className={`rs-group-kicker dp-${course.division.toLowerCase()}`}>{course.division}</span>
                <p className="rs-group-title">{course.title}</p>
                <p className="rs-group-meta">
                  <span>{course.code}</span><i />
                  <span>Session {course.session}</span><i />
                  <span>{items.length} {items.length === 1 ? 'file' : 'files'}</span>
                </p>
              </div>
              <span className="rs-expand-label">{isOpen ? 'Hide files' : 'View files'}</span>
              <span className="rs-caret-btn" aria-hidden="true">
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
              </button>
              <button
                type="button"
                className="rs-dl-all"
                onClick={() => downloadAll(items)}
                title="Download all files for this session"
              >
                <Download size={16} /> <span>Download all</span>
              </button>
            </div>
            {isOpen && (
            <div className="rs-files" id={`resource-files-${course.id}`}>
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
          </article>
          )
        })}

        {groups.length === 0 && (
          <div className="rs-empty">
            <span className="rs-empty-icon"><FolderDown size={30} /></span>
            <h3>No matching materials</h3>
            <p>Try another keyword or choose a different learning topic.</p>
            {hasFilters && <button type="button" onClick={clearFilters}>View all resources</button>}
          </div>
        )}
      </div>
      </section>
    </div>
  )
}
