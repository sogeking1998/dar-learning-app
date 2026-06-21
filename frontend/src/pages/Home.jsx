import { useState, useEffect } from 'react'
import {
  Bell, Play, Sprout, ScrollText, Scale, Building2,
} from 'lucide-react'
import { getAnnouncements } from '../announcementStore'
import './Home.css'

const ABOUT_POINTS = [
  { icon: Sprout,    title: 'Program & Beneficiaries Dev. (PBD)', text: 'Community organizing, participatory research, and enterprise development for agrarian reform beneficiaries.' },
  { icon: ScrollText,title: 'Land Tenure Services (LTS)',          text: 'EP/CLOA processing and the end-to-end land acquisition and distribution process under CARP.' },
  { icon: Scale,     title: 'Adjudication (AJD)',                  text: 'Mediation techniques and the adjudication process for resolving agrarian disputes.' },
  { icon: Building2, title: 'Administrative (Admin)',              text: 'DAR administrative procedures, documentation, and office protocols for new staff.' },
]

const fmtDate = d =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

export default function Home() {
  const [anns, setAnns] = useState([])

  useEffect(() => {
    getAnnouncements().then(setAnns)
  }, [])

  return (
    <div className="home">

      {/* ── WELCOME VIDEO (first thing) ── */}
      <section className="hsec">
        <div className="sec-hd">
          <h2 className="sec-title"><Play size={16} /> Welcome Video</h2>
        </div>
        <div className="welcome-video">
          <div className="wv-frame">
            <div className="wv-mesh" />
            <button className="wv-play" aria-label="Play welcome video">
              <Play size={30} fill="currentColor" />
            </button>
            <span className="wv-duration">4:12</span>
            <div className="wv-caption">
              <p className="wv-cap-eyebrow">Department of Agrarian Reform</p>
              <p className="wv-cap-title">Welcome to the Online CapDev Program</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT (left, wider) + ANNOUNCEMENTS (right) ── */}
      <div className="home-cols">
        <section className="hsec">
          <div className="sec-hd">
            <h2 className="sec-title"><Sprout size={16} /> About the Program</h2>
          </div>
          <div className="about-card">
            <div className="about-intro">
              <h3 className="about-h">Online CapDev for Newly Hired Employees</h3>
              <p className="about-p">
                The Department of Agrarian Reform's Online Capacity Development platform equips
                newly hired employees with the foundational knowledge and skills needed to serve
                the agrarian reform program. The curriculum is organized across four core divisions,
                each with self-paced video sessions, downloadable materials, pre- and post-tests,
                and practical tasks.
              </p>
            </div>
            <div className="about-grid">
              {ABOUT_POINTS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="ab-point">
                  <div className="ab-point-icon"><Icon size={18} /></div>
                  <div>
                    <p className="ab-point-title">{title}</p>
                    <p className="ab-point-text">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hsec">
          <div className="sec-hd">
            <h2 className="sec-title"><Bell size={16} /> Announcements</h2>
          </div>
          <div className="ann-card">
            {anns.map((a, i) => (
              <div key={a.id} className={`ann-item ${i < anns.length - 1 ? 'ann-border' : ''}`}>
                <div className="ann-dot p-green" />
                <div className="ann-body">
                  <div className="ann-head">
                    <h4 className="ann-title">{a.title}</h4>
                    <span className="ann-date">{fmtDate(a.created_at)}</span>
                  </div>
                  <p className="ann-text">{a.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

    </div>
  )
}
