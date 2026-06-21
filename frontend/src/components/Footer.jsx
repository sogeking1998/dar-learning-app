import { HelpCircle, Phone, Mail, MapPin } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">DAR</div>
          <div>
            <p className="footer-brand-name">Department of Agrarian Reform</p>
            <p className="footer-brand-sub">Online Capacity Development Program</p>
          </div>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">
            <HelpCircle size={14} /> Help Center
          </h4>
          <ul className="footer-links">
            <li><a href="#">FAQs</a></li>
            <li><a href="#">User Guide</a></li>
            <li><a href="#">Technical Support</a></li>
            <li><a href="#">Report an Issue</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Contact Us</h4>
          <ul className="footer-contact">
            <li><Phone size={13} /> (053) 832-0162</li>
            <li><Mail size={13} /> region8@dar.gov.ph</li>
            <li><MapPin size={13} /> DAR Regional Office No. VIII, Sto. Niño Extension, Tacloban City, 6500, Leyte</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Department of Agrarian Reform. All rights reserved. | Republic of the Philippines</p>
      </div>
    </footer>
  )
}
