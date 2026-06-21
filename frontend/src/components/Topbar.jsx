import { Menu, Leaf } from 'lucide-react'

export default function Topbar({ onOpenMobile }) {
  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onOpenMobile} aria-label="Open menu">
        <Menu size={22} />
      </button>
      <div className="topbar-brand">
        <div className="topbar-logo"><Leaf size={17} strokeWidth={2.5} /></div>
        <span className="topbar-title">DAR Online CapDev</span>
      </div>
    </header>
  )
}
