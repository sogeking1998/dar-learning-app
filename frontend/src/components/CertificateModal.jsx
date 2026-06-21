import { useState } from 'react'
import { Download, X, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import Certificate, { certNumber } from './Certificate'
import './Certificate.css'

export default function CertificateModal({ name, course, date, onClose }) {
  const [busy, setBusy] = useState(false)

  const download = async () => {
    const el = document.getElementById('certificate-print')
    if (!el || busy) return
    setBusy(true)
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })
      const img = canvas.toDataURL('image/png')

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pw / canvas.width, ph / canvas.height)
      const w = canvas.width * ratio
      const h = canvas.height * ratio
      pdf.addImage(img, 'PNG', (pw - w) / 2, (ph - h) / 2, w, h)
      pdf.save(`Certificate-${certNumber(course)}.pdf`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="certm-overlay" onClick={onClose}>
      <div className="certm-toolbar" onClick={e => e.stopPropagation()}>
        <button className="certm-btn certm-btn-dl" onClick={download} disabled={busy}>
          {busy
            ? <><Loader2 size={15} className="certm-spin" /> Preparing…</>
            : <><Download size={15} /> Download (PDF)</>}
        </button>
        <button className="certm-btn certm-btn-close" onClick={onClose}>
          <X size={15} /> Close
        </button>
      </div>

      <div className="certm-stage" onClick={e => e.stopPropagation()}>
        <Certificate name={name} course={course} date={date} />
      </div>
    </div>
  )
}
