import { Award } from 'lucide-react'
import DarLogo from './DarLogo'
import './Certificate.css'

const fmtDate = d =>
  new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })

// Deterministic certificate number so the same course always reads the same.
export const certNumber = course => {
  const year = new Date().getFullYear()
  return `DAR-CAPDEV-${year}-${course.division.toUpperCase()}${course.session}-${String(course.id).padStart(4, '0')}`
}

export default function Certificate({ name, course, date }) {
  return (
    <div className="certificate" id="certificate-print">
      <div className="cert-frame">
        <DarLogo className="cert-watermark" />

        <span className="cert-corner tl" />
        <span className="cert-corner tr" />
        <span className="cert-corner bl" />
        <span className="cert-corner br" />

        <div className="cert-content">
          <DarLogo size={64} className="cert-logo-top" />

          <p className="cert-org">Republic of the Philippines</p>
          <h2 className="cert-dept">Department of Agrarian Reform</h2>
          <p className="cert-prog">Online Capacity Development Program</p>

          <h1 className="cert-title">Certificate of Completion</h1>
          <span className="cert-title-rule" />

          <p className="cert-present">This certificate is proudly presented to</p>
          <p className="cert-name">{name}</p>

          <p className="cert-text">
            for successfully completing all requirements of the training module
          </p>
          <p className="cert-course">“{course.title}”</p>
          <p className="cert-meta">{course.division} Division · Session {course.session} · {course.code}</p>

          <div className="cert-footer">
            <div className="cert-sign">
              <span className="cert-sign-line" />
              <span className="cert-sign-name">Training Office</span>
              <span className="cert-sign-role">DAR CapDev</span>
            </div>

            <div className="cert-badge"><Award size={26} /></div>

            <div className="cert-sign">
              <span className="cert-sign-line" />
              <span className="cert-sign-name">Atty. Robert Anthony P. Yu</span>
              <span className="cert-sign-role">Regional Director</span>
            </div>
          </div>

          <div className="cert-issue">
            <span>Issued on {fmtDate(date)}</span>
            <span>Certificate No. {certNumber(course)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
