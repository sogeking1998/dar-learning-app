import { useState } from 'react'
import { Award, Download, Eye, Lock, CheckCircle2, BookOpenCheck } from 'lucide-react'
import { useUser } from '../UserContext'
import { useCourses } from '../courseStore'
import { certificateIssueDate, sessionCompletion, useUserProgress } from '../completion'
import CertificateModal from '../components/CertificateModal'
import './Certificates.css'

const fmtDate = d =>
  d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })

export default function Certificates() {
  const { user } = useUser()
  const { courses } = useCourses()
  const [preview, setPreview] = useState(null)
  const progress = useUserProgress(user?.id)

  // Real completion: video + task + pre-test + post-test all done.
  const withComp = courses.map(c => ({
    ...c,
    comp: sessionCompletion(c, progress),
    issuedAt: certificateIssueDate(c, progress),
  }))
  const earned = withComp.filter(c => c.comp.status === 'completed')
  const locked = withComp.filter(c => c.comp.status !== 'completed')
  const completionRate = courses.length ? Math.round((earned.length / courses.length) * 100) : 0

  return (
    <div className="certs-page">
      <div className="page-header">
        <h1 className="page-title">Certificates</h1>
        <p className="page-sub">Certificates of completion are issued once a course is fully finished</p>
      </div>

      <section className="cert-overview">
        <div className="cert-overview-main">
          <span className="cert-overview-icon"><Award size={28} /></span>
          <div>
            <p className="cert-overview-label">Certificate portfolio</p>
            <p className="cert-overview-title">Your learning achievements, all in one place.</p>
            <p className="cert-overview-copy">
              {locked.length > 0
                ? `Complete ${locked.length} remaining ${locked.length === 1 ? 'course' : 'courses'} to unlock every certificate.`
                : 'All available course certificates have been earned.'}
            </p>
          </div>
        </div>
        <div className="cert-overview-progress">
          <div className="cert-progress-summary">
            <div><strong>{earned.length}</strong><span>Earned</span></div>
            <div><strong>{locked.length}</strong><span>In progress</span></div>
            <div><strong>{completionRate}%</strong><span>Complete</span></div>
          </div>
          <div className="cert-progress-track" aria-label={`${completionRate}% of certificates earned`}>
            <span style={{ width: `${completionRate}%` }} />
          </div>
          <p>Portfolio progress · {earned.length} of {courses.length} courses</p>
        </div>
      </section>

      {/* Earned */}
      <div className="cert-section-heading">
        <div>
          <h2 className="cert-section-title"><CheckCircle2 size={17} /> Earned certificates</h2>
        </div>
        <span className="cert-count">{earned.length}</span>
      </div>
      {earned.length === 0 ? (
        <div className="cert-empty">
          <Award size={36} />
          <p>No certificates yet — finish a course to earn your first one.</p>
        </div>
      ) : (
        <div className="cert-grid">
          {earned.map(c => (
            <article key={c.id} className="cert-card">
              <div className="cert-card-mark"><Award size={42} /></div>
              <div className="cert-body">
                <div className="cert-card-top">
                  <p className="cert-card-label">Certificate of Completion</p>
                  <span className="cert-status"><CheckCircle2 size={12} /> Earned</span>
                </div>
                <div className="cert-card-meta"><span>{c.division}</span><i /> <span>Session {c.session}</span></div>
                <h3 className="cert-course">{c.title}</h3>
                <div className="cert-issued">
                  <div><span>Awarded to</span><strong>{user.name}</strong></div>
                  <div><span>Issued</span><strong>{fmtDate(c.issuedAt)}</strong></div>
                </div>
                <div className="cert-actions">
                  <button className="cert-btn cert-btn-view" onClick={() => setPreview(c)}><Eye size={15} /> Preview</button>
                  <button className="cert-btn cert-btn-dl" onClick={() => setPreview(c)}><Download size={15} /> Download</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <>
          <div className="cert-section-heading locked-heading">
            <div>
              <h2 className="cert-section-title"><Lock size={16} /> In progress</h2>
            </div>
            <span className="cert-count muted">{locked.length}</span>
          </div>
          <div className="cert-locked-grid">
            {locked.map(c => (
              <div key={c.id} className={`cert-locked cert-locked-${c.division.toLowerCase()}`}>
                <div className="cert-locked-icon"><BookOpenCheck size={17} /></div>
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
          date={preview.issuedAt}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
