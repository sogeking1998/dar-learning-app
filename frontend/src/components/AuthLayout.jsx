import { GraduationCap, FolderDown, Award } from 'lucide-react'
import DarLogo from './DarLogo'
import '../pages/Auth.css'

const FEATURES = [
  { icon: GraduationCap, title: 'Structured Courses', desc: 'Step-by-step training modules' },
  { icon: FolderDown,    title: 'Resource Materials', desc: 'Videos, exams & downloads' },
  { icon: Award,         title: 'Certificates',       desc: 'Recognized upon completion' },
]

const Illustration = () => (
  <svg viewBox="0 0 280 230" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* soft sky glow */}
    <circle cx="140" cy="104" r="96" fill="rgba(255,255,255,0.05)" />

    {/* sun */}
    <circle cx="204" cy="64" r="34" fill="rgba(245,215,122,0.16)" />
    <circle cx="204" cy="64" r="24" fill="#f5d77a" />

    {/* birds */}
    <path d="M66 58 q7 -7 14 0" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M86 50 q6 -6 12 0" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* graduation cap */}
    <path d="M96 36 L132 52 L96 68 L60 52 Z" fill="rgba(255,255,255,0.94)" />
    <path d="M76 58 V72 C76 80 116 80 116 72 V58" stroke="rgba(255,255,255,0.94)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <line x1="132" y1="52" x2="132" y2="72" stroke="rgba(255,255,255,0.94)" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="132" cy="76" r="3.5" fill="#5fe09a" />

    {/* back rolling field */}
    <path d="M8 162 C70 132 120 146 152 154 C196 165 232 146 272 156 L272 210 L8 210 Z" fill="rgba(255,255,255,0.10)" />

    {/* crop rows on back field */}
    <g stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeLinecap="round">
      <line x1="44" y1="150" x2="40" y2="160" />
      <line x1="70" y1="146" x2="66" y2="156" />
      <line x1="200" y1="152" x2="204" y2="162" />
      <line x1="228" y1="150" x2="232" y2="160" />
    </g>

    {/* front rolling field */}
    <path d="M8 186 C84 158 134 176 184 182 C218 186 244 178 272 182 L272 214 L8 214 Z" fill="rgba(95,224,154,0.32)" />

    {/* sprout in the center */}
    <path d="M140 188 C140 174 140 166 140 154" stroke="#7df0b3" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M140 170 C126 170 117 161 116 150 C130 149 140 158 140 170 Z" fill="#5fe09a" />
    <path d="M140 162 C153 162 162 153 163 143 C150 142 140 151 140 162 Z" fill="#7df0b3" />
    <ellipse cx="140" cy="189" rx="16" ry="4" fill="rgba(0,0,0,0.12)" />

    {/* sparkles */}
    <circle cx="46" cy="92" r="2.5" fill="rgba(255,255,255,0.5)" />
    <circle cx="244" cy="118" r="3" fill="rgba(255,255,255,0.4)" />
  </svg>
)

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        {/* ── Brand panel (hidden on mobile) ── */}
        <aside className="auth-aside">
          <div className="auth-aside-brand">
            <div className="auth-logo-icon"><DarLogo size={26} /></div>
            <span>DAR Online CapDev</span>
          </div>

          <div className="auth-aside-content">
            <div className="auth-illustration"><Illustration /></div>
            <h2 className="auth-aside-title">Grow your skills,<br />serve with purpose</h2>
            <p className="auth-aside-sub">
              The official capacity development portal for the Department of
              Agrarian Reform.
            </p>
          </div>

          <ul className="auth-features">
            {FEATURES.map(f => (
              <li className="auth-feature" key={f.title}>
                <span className="auth-feature-icon"><f.icon size={18} /></span>
                <span className="auth-feature-text">
                  <strong>{f.title}</strong>
                  <em>{f.desc}</em>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* ── Form panel ── */}
        <div className="auth-main">
          {children}
        </div>
      </div>
    </div>
  )
}
