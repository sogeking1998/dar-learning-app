import { useState } from 'react'
import { Award, Download, Eye, Lock, CheckCircle2, Sprout } from 'lucide-react'
import { useUser } from '../UserContext'
import { useCourses } from '../courseStore'
import { sessionCompletion, useUserProgress } from '../completion'
import CertificateModal from '../components/CertificateModal'
import './Certificates.css'

const HEAD_BG = { PBD: 'hd-pbd', LTS: 'hd-lts', AJD: 'hd-ajd', Admin: 'hd-admin' }

// Deterministic issue date derived from course id (mock).
const issueDateOf = id => {
  const base = new Date('2024-02-01')
  base.setDate(base.getDate() + id * 9)
  return base
}
const fmtDate = d =>
  d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })

export default function Certificates() {
  const { user } = useUser()
  const { courses } = useCourses()
  const [preview, setPreview] = useState(null)
  const progress = useUserProgress(user?.id)

  // Real completion: video + task + pre-test + post-test all done.
  const withComp = courses.map(c => ({ ...c, comp: sessionCompletion(c, progress) }))
  const earned = withComp.filter(c => c.comp.status === 'completed')
  const locked = withComp.filter(c => c.comp.status !== 'completed')

  return (
    <div className="certs-page">
      <div className="page-header">
        <h1 className="page-title">Certificates</h1>
        <p className="page-sub">Certificates of completion are issued once a course is fully finished</p>
      </div>

      {/* Summary banner */}
      <div className="cert-banner">
        <div className="cert-banner-icon"><Award size={26} /></div>
        <div>
          <p className="cert-banner-num">{earned.length} {earned.length === 1 ? 'Certificate' : 'Certificates'} earned</p>
          <p className="cert-banner-sub">
            {locked.length > 0
              ? `${locked.length} more available after you complete the remaining courses.`
              : 'You have completed every available course. Congratulations!'}
          </p>
        </div>
      </div>

      {/* Earned */}
      <h2 className="cert-section-title"><CheckCircle2 size={16} /> Earned Certificates</h2>
      {earned.length === 0 ? (
        <div className="cert-empty">
          <Award size={36} />
          <p>No certificates yet — finish a course to earn your first one.</p>
        </div>
      ) : (
        <div className="cert-grid">
          {earned.map(c => (
            <div key={c.id} className="cert-card">
              <div className={`cert-ribbon ${HEAD_BG[c.division] || 'hd-pbd'}`}>
                <div className="cert-seal"><Sprout size={20} /></div>
                <span className="cert-ribbon-div">{c.division}</span>
              </div>
              <div className="cert-body">
                <p className="cert-eyebrow">Certificate of Completion</p>
                <h3 className="cert-course">{c.title}</h3>
                <p className="cert-awarded">Awarded to <strong>{user.name}</strong></p>
                <p className="cert-date">Issued {fmtDate(issueDateOf(c.id))}</p>
                <div className="cert-actions">
                  <button className="cert-btn cert-btn-view" onClick={() => setPreview(c)}><Eye size={14} /> View</button>
                  <button className="cert-btn cert-btn-dl" onClick={() => setPreview(c)}><Download size={14} /> Download</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <>
          <h2 className="cert-section-title locked-title"><Lock size={15} /> Not Yet Available</h2>
          <div className="cert-locked-grid">
            {locked.map(c => (
              <div key={c.id} className="cert-locked">
                <div className="cert-locked-icon"><Lock size={16} /></div>
                <div className="cert-locked-info">
                  <p className="cert-locked-title">{c.title}</p>
                  <p className="cert-locked-meta">{c.division} · Session {c.session}</p>
                </div>
                <div className="cert-locked-prog">
                  <div className="clp-bar"><div className="clp-fill" style={{ width: `${c.comp.pct}%` }} /></div>
                  <span className="clp-pct">{c.comp.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {preview && (
        <CertificateModal
          name={user.name}
          course={preview}
          date={issueDateOf(preview.id)}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
