import { useState, useRef, useEffect } from 'react'
import { Search, Send, ArrowLeft, Phone, Video, CalendarPlus, MessageSquare, Users } from 'lucide-react'
import { initials } from '../UserContext'
import { useAuth } from '../AuthContext'
import { useMessages } from '../MessagesContext'
import { getAvailability, createBooking, DEFAULT_WEEKDAYS, DEFAULT_SLOTS } from '../calendarStore'
import BookingModal from '../components/BookingModal'
import CallModal from '../components/CallModal'
import Toast from '../components/Toast'
import './Messages.css'

export default function Messages() {
  const { session, isAdmin, isSuperAdmin } = useAuth()
  const me = session?.user?.id
  const { conversations, users, messagesWith, sendMessage, markRead } = useMessages()
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('chats') // 'chats' | 'people'
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [threadOpenMobile, setThreadOpenMobile] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [bookingAvail, setBookingAvail] = useState(null)
  const [toast, setToast] = useState(null)
  const [call, setCall] = useState(null)   // { mode: 'audio' | 'video' }
  const scrollRef = useRef(null)

  const canBook = !isAdmin && !isSuperAdmin   // only employees book meetings
  const myName = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'DAR member'
  // Deterministic private room for this pair, so both sides join the same call.
  const roomFor = otherId => `dar-capdev-${[me, otherId].sort().join('-')}`

  const startCall = mode => {
    setCall({ mode })
    sendMessage(activeId, mode === 'audio' ? '📞 Started an audio call — open Messages and tap the phone to join.' : '📹 Started a video call — open Messages and tap the camera to join.')
  }

  // Header info comes from the directory (or the conversation summary as fallback).
  const active = activeId
    ? (users.find(u => u.id === activeId) || conversations.find(c => c.id === activeId) || null)
    : null
  const thread = activeId ? messagesWith(activeId) : []

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.role.toLowerCase().includes(query.toLowerCase())
  )

  // Directory: online first, then alphabetical.
  const peopleFiltered = users
    .filter(u =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.role.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name))
  const onlineCount = users.filter(u => u.online).length

  const startChat = user => {
    setActiveId(user.id)
    setThreadOpenMobile(true)
    setTab('chats')
    markRead(user.id)
  }

  const openConvo = id => {
    setActiveId(id)
    setThreadOpenMobile(true)
    markRead(id)
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [activeId, thread.length])

  const send = e => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !activeId) return
    sendMessage(activeId, text)
    setDraft('')
  }

  const openBooking = async () => {
    setBookingAvail(await getAvailability(activeId))
    setShowBooking(true)
  }

  const handleBooking = async (date, slot) => {
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const { error } = await createBooking(me, activeId, isoDate, slot)
    if (error) {
      const taken = error.code === '23505' || /duplicate|unique/i.test(error.message || '')
      setToast({
        type: 'error',
        message: taken
          ? 'That time was just reserved. Please pick another slot.'
          : `Couldn't book the meeting: ${error.message || 'unknown error'}`,
      })
      return
    }
    const pretty = date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    setShowBooking(false)
    setToast({ type: 'success', message: `Meeting booked for ${pretty} at ${slot}.` })
    sendMessage(activeId, `📅 I'd like to book a meeting on ${pretty} at ${slot}.`)
  }

  return (
    <div className="messages-page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header">
        <h1 className="page-title">Messages</h1>
        <p className="page-sub">Stay in touch with your training coordinators and colleagues</p>
      </div>

      <div className={`msg-shell${threadOpenMobile ? ' show-thread' : ''}`}>

        {/* ── Conversation list ── */}
        <aside className="msg-list">
          <div className="msg-tabs">
            <button className={`msg-tab${tab === 'chats' ? ' active' : ''}`} onClick={() => setTab('chats')}>
              <MessageSquare size={15} /> Chats
            </button>
            <button className={`msg-tab${tab === 'people' ? ' active' : ''}`} onClick={() => setTab('people')}>
              <Users size={15} /> People
              <span className="msg-tab-count">{users.length}</span>
            </button>
          </div>

          <div className="msg-search">
            <Search size={15} className="msg-search-icon" />
            <input
              className="msg-search-input"
              placeholder={tab === 'chats' ? 'Search conversations…' : 'Search people…'}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {tab === 'chats' ? (
            <div className="msg-convos">
              {filtered.map(c => (
                <button
                  key={c.id}
                  className={`msg-convo${c.id === activeId ? ' active' : ''}`}
                  onClick={() => openConvo(c.id)}
                >
                  <div className={`msg-avatar ${c.color}`}>
                    {initials(c.name)}
                    {c.online && <span className="msg-online-dot" />}
                  </div>
                  <div className="msg-convo-body">
                    <div className="msg-convo-top">
                      <span className="msg-convo-name">{c.name}</span>
                      <span className="msg-convo-time">{c.time}</span>
                    </div>
                    <div className="msg-convo-bottom">
                      <span className="msg-convo-preview">{c.lastText}</span>
                      {c.unread > 0 && <span className="msg-unread">{c.unread}</span>}
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="msg-empty">
                  {conversations.length === 0
                    ? 'No conversations yet. Open the People tab to start one.'
                    : 'No conversations found.'}
                </p>
              )}
            </div>
          ) : (
            <div className="msg-convos">
              <p className="msg-people-head">{onlineCount} online · {users.length} members</p>
              {peopleFiltered.map(u => (
                <button key={u.id} className="msg-person" onClick={() => startChat(u)}>
                  <div className={`msg-avatar ${u.color}`}>
                    {initials(u.name)}
                    {u.online && <span className="msg-online-dot" />}
                  </div>
                  <div className="msg-convo-body">
                    <span className="msg-convo-name">{u.name}</span>
                    <span className="msg-person-role">{u.role}</span>
                  </div>
                  <span className={`msg-presence${u.online ? ' on' : ''}`}>
                    <span className="msg-presence-dot" />{u.online ? 'Active' : 'Offline'}
                  </span>
                </button>
              ))}
              {peopleFiltered.length === 0 && <p className="msg-empty">No people found.</p>}
            </div>
          )}
        </aside>

        {/* ── Active thread ── */}
        <section className="msg-thread">
          {!active ? (
            <div className="msg-thread-empty">
              <div className="msg-thread-empty-ic"><MessageSquare size={30} /></div>
              <p className="msg-thread-empty-t">No conversation selected</p>
              <p className="msg-thread-empty-s">Pick a chat, or open the <strong>People</strong> tab to start a new one.</p>
            </div>
          ) : (
            <>
              <header className="msg-thread-hd">
                <button className="msg-back" onClick={() => setThreadOpenMobile(false)} aria-label="Back">
                  <ArrowLeft size={18} />
                </button>
                <div className={`msg-avatar sm ${active.color}`}>
                  {initials(active.name)}
                  {active.online && <span className="msg-online-dot" />}
                </div>
                <div className="msg-thread-info">
                  <span className="msg-thread-name">{active.name}</span>
                  <span className="msg-thread-status">
                    {active.online ? <><span className="status-dot" /> Active now</> : active.role}
                  </span>
                </div>
                <div className="msg-thread-actions">
                  {canBook && active.accountRole === 'admin' && (
                    <button className="msg-book-btn" onClick={openBooking}>
                      <CalendarPlus size={15} /> <span>Book a Meeting</span>
                    </button>
                  )}
                  <button aria-label="Audio call" title="Audio call" onClick={() => startCall('audio')}><Phone size={17} /></button>
                  <button aria-label="Video call" title="Video call" onClick={() => startCall('video')}><Video size={17} /></button>
                </div>
              </header>

              <div className="msg-scroll" ref={scrollRef}>
                {thread.length === 0 && (
                  <p className="msg-thread-start">This is the start of your conversation with {active.name}.</p>
                )}
                {thread.map(m => (
                  <div key={m.id} className={`msg-bubble-row ${m.from === 'me' ? 'me' : 'them'}`}>
                    <div className="msg-bubble">
                      {m.text}
                      <span className="msg-bubble-time">{m.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <form className="msg-composer" onSubmit={send}>
                <input
                  className="msg-input"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                />
                <button type="submit" className="msg-send" disabled={!draft.trim()} aria-label="Send">
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {showBooking && active && (
        <BookingModal
          conversation={{
            ...active,
            availableDays: bookingAvail?.weekdays || DEFAULT_WEEKDAYS,
            slots: bookingAvail?.slots || DEFAULT_SLOTS,
          }}
          onClose={() => setShowBooking(false)}
          onConfirm={handleBooking}
        />
      )}

      {call && active && (
        <CallModal
          room={roomFor(activeId)}
          mode={call.mode}
          name={myName}
          withName={active.name}
          onClose={() => setCall(null)}
        />
      )}
    </div>
  )
}
