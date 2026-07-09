import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useMessages } from '../MessagesContext'
import Avatar from './Avatar'
import './MessageNotifier.css'

// App-wide toast that pops top-right when a new message arrives,
// unless you're already on the Messages page.
export default function MessageNotifier() {
  const { notice, clearNotice, users } = useMessages()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [card, setCard] = useState(null)

  useEffect(() => {
    if (!notice) return
    if (pathname === '/messages') { clearNotice(); return }
    const sender = users.find(u => u.id === notice.senderId)
    setCard({
      key: notice.key,
      name: sender?.name || 'New message',
      gender: sender?.gender,
      color: sender?.color || 'c-green',
      text: notice.text,
    })
    const t = setTimeout(() => { setCard(null); clearNotice() }, 5000)
    return () => clearTimeout(t)
  }, [notice?.key]) // eslint-disable-line

  if (!card) return null

  const dismiss = e => { e.stopPropagation(); setCard(null); clearNotice() }
  const open = () => { setCard(null); clearNotice(); nav('/messages') }

  return (
    <div key={card.key} className="msg-notif" onClick={open} role="button" tabIndex={0}>
      <Avatar name={card.name} gender={card.gender} className={`msg-notif-avatar ${card.color}`} />
      <div className="msg-notif-body">
        <p className="msg-notif-name">{card.name}</p>
        <p className="msg-notif-text">{card.text}</p>
      </div>
      <button className="msg-notif-close" onClick={dismiss} aria-label="Dismiss"><X size={15} /></button>
      <div className="msg-notif-timer"><div className="msg-notif-timer-fill" /></div>
    </div>
  )
}
