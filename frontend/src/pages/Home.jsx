import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Award, Bell, BookOpen, Building2, CheckCircle2, FolderDown, GraduationCap, Play, Scale, ScrollText, Sprout, Users } from 'lucide-react'
import { getAnnouncements } from '../announcementStore'
import { getWelcomeVideo } from '../videoStore'
import { useUser } from '../UserContext'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import './Home.css'

const AREAS = [
  { icon: Sprout, code: 'PBD', title: 'Program & Beneficiaries Dev.', text: 'Community organizing, research, and enterprise development.' },
  { icon: ScrollText, code: 'LTS', title: 'Land Tenure Services', text: 'EP/CLOA processing and land acquisition under CARP.' },
  { icon: Scale, code: 'AJD', title: 'Agrarian Justice Delivery', text: 'Mediation and adjudication of agrarian disputes.' },
  { icon: Building2, code: 'ADMIN', title: 'Administrative Services', text: 'DAR procedures, documentation, and office protocols.' },
]
const FALLBACK_VIDEO = `${import.meta.env.BASE_URL}videos/welcome.mp4`
const fmtDate = value => new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export default function Home() {
  const { user } = useUser()
  const { session } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [video, setVideo] = useState({ url: FALLBACK_VIDEO })
  const [started, setStarted] = useState(false)
  const videoRef = useRef(null)
  const markedSeen = useRef(false)

  useEffect(() => {
    getAnnouncements().then(setAnnouncements)
    getWelcomeVideo().then(item => { if (item?.url) setVideo(item) })
  }, [])

  const isFirstLogin = !!user && !user.lastSeen

  useEffect(() => {
    if (!user?.id || user.lastSeen || markedSeen.current) return
    markedSeen.current = true
    supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.error('Failed to record first login:', error.message)
      })
  }, [user?.id, user?.lastSeen])

  const play = () => { setStarted(true); videoRef.current?.play() }
  const profileName = (user?.name || '').trim()
  const metadataName = (session?.user?.user_metadata?.name || session?.user?.user_metadata?.full_name || '').trim()
  const usableName = [profileName, metadataName].find(name => name && !['employee', 'user', 'admin', 'administrator'].includes(name.toLowerCase()))
  const emailName = (user?.email || session?.user?.email || '').split('@')[0].split(/[._-]+/)[0]
  const firstName = (usableName?.split(/\s+/)[0] || emailName || 'there').replace(/^./, letter => letter.toUpperCase())

  return <div className="home home-modern">
    <section className="home-hero">
      <div className="home-hero-copy">
        <div className="home-brand-lockup">
          <span className="home-brand-name">TARUNGA</span>
          <span className="home-kicker">
            <span className="home-kicker-icon"><GraduationCap size={14} /></span>
            <span>DAR Online Capacity Development <strong>System</strong></span>
          </span>
        </div>
        <h1>{isFirstLogin ? 'Welcome' : 'Welcome back'}, <em>{firstName}{isFirstLogin ? '!' : '.'}</em></h1>
        <p>Build the knowledge and practical skills you need to serve agrarian reform communities with confidence.</p>
        <div className="home-hero-actions">
          <Link to="/dashboard" className="home-primary">Continue learning <ArrowRight size={16} /></Link>
          <Link to="/courses" className="home-secondary"><BookOpen size={15} /> Browse sessions</Link>
        </div>
        <div className="home-trust"><span><strong>4</strong> service areas</span><i /><span><CheckCircle2 size={13} /> Self-paced</span><i /><span><Award size={13} /> Certificates</span></div>
      </div>
      <div className="home-video-card">
        <div className="home-video-head"><span><Play size={13} /> Program introduction</span><small>Welcome video</small></div>
        <div className="wv-frame">
          {video?.url ? <>
            <video ref={videoRef} src={video.url} preload="metadata" playsInline controls={started} onPlay={() => setStarted(true)} />
            {!started && <button className="wv-overlay" onClick={play} aria-label="Play welcome video"><span className="wv-shade" /><span className="wv-play"><Play size={24} fill="currentColor" /></span><span className="wv-caption"><small>Department of Agrarian Reform</small><b>Welcome to TARUNGA</b></span></button>}
          </> : <div className="wv-empty"><Play size={25} /><span>Welcome video coming soon</span></div>}
        </div>
      </div>
    </section>

    <section className="home-quick" aria-label="Quick access">
      <QuickLink to="/dashboard" icon={GraduationCap} tone="green" title="My learning" text="Resume your active session" />
      <QuickLink to="/courses" icon={BookOpen} tone="blue" title="Course catalog" text="Explore all learning areas" />
      <QuickLink to="/resources" icon={FolderDown} tone="amber" title="Resources" text="Videos and downloadable files" />
    </section>

    <div className="home-columns">
      <section>
        <SectionHead kicker="Your curriculum" title="Four areas of public service" link="/courses" />
        <div className="about-card">
          <h3>A practical foundation for newly hired employees</h3>
          <p>Learn DAR's core functions through guided videos, references, knowledge checks, and practical activities designed for your role.</p>
          <div className="area-grid">{AREAS.map(({ icon: Icon, code, title, text }) => <article className="area-card" key={code}><span className="area-icon"><Icon size={17} /></span><div><small>{code}</small><h4>{title}</h4><p>{text}</p></div></article>)}</div>
        </div>
      </section>
      <section>
        <div className="section-head"><div><small>Stay informed</small><h2>Announcements</h2></div><span className="ann-count"><Bell size={12} /> {announcements.length}</span></div>
        <div className="ann-card">{announcements.length ? announcements.slice(0, 5).map((item, index) => <article className="ann-item" key={item.id}><span className="ann-dot" /><div><header><h4>{item.title}</h4><time>{fmtDate(item.created_at)}</time></header><p>{item.content}</p></div></article>) : <div className="ann-empty"><span><Bell size={20} /></span><b>You're all caught up</b><p>New program updates will appear here.</p></div>}</div>
      </section>
    </div>

    <section>
      <div className="section-head"><div><small>Official resource</small><h2>DAR Directory</h2></div></div>
      <a className="directory-card" href="https://www.dar.gov.ph/directory" target="_blank" rel="noreferrer"><span className="directory-icon"><Users size={22} /></span><span><b>Find DAR officials and contact information</b><small>Access the official national directory on dar.gov.ph</small></span><em>Visit directory <ArrowUpRight size={15} /></em></a>
    </section>
  </div>
}

function QuickLink({ to, icon: Icon, tone, title, text }) {
  return <Link to={to}><span className={`quick-icon ${tone}`}><Icon size={18} /></span><span><b>{title}</b><small>{text}</small></span><ArrowUpRight size={15} /></Link>
}

function SectionHead({ kicker, title, link }) {
  return <div className="section-head"><div><small>{kicker}</small><h2>{title}</h2></div>{link && <Link to={link}>View courses <ArrowRight size={14} /></Link>}</div>
}
