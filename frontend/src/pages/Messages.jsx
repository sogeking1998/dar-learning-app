import { useState, useRef, useEffect } from 'react'
import { Search, Send, ArrowLeft, Phone, Video, CalendarPlus, MessageSquare, Users, Paperclip, Smile, FileText, X, Trash2 } from 'lucide-react'
import { initials } from '../UserContext'
import { useAuth } from '../AuthContext'
import { useMessages, presenceLabel, EMOJIS, REACTIONS } from '../MessagesContext'
import { NotoEmoji, renderEmoji } from '../emoji'
import { getAvailability, createBooking, DEFAULT_WEEKDAYS, DEFAULT_SLOTS } from '../calendarStore'
import BookingModal from '../components/BookingModal'
import ConfirmModal from '../components/ConfirmModal'
import { useCall } from '../CallContext'
import Toast from '../components/Toast'
import './Messages.css'

export default function Messages() {
  const { session, isAdmin, isSuperAdmin } = useAuth()
  const me = session?.user?.id
  const { conversations, users, messagesWith, sendMessage, sendFile, toggleReaction, deleteMessage, markRead } = useMessages()
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('chats') // 'chats' | 'people'
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [threadOpenMobile, setThreadOpenMobile] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [bookingAvail, setBookingAvail] = useState(null)
  const [toast, setToast] = useState(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [reactFor, setReactFor] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const scrollRef = useRef(null)
  const fileRef = useRef(null)
  const pressRef = useRef(null)
  const { start: startCallEngine } = useCall()

  // Re-render every minute so "Online X mins ago" labels stay current.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  // Stage the picked file (don't send yet) so it can be reviewed/removed.
  const onPickFile = e => {
    const f = e.target.files?.[0]
    if (f) setPendingFile(f)
    e.target.value = ''
  }

  // Long-press a message (mobile) to open the reaction picker.
  const startPress = id => { pressRef.current = setTimeout(() => setReactFor(id), 450) }
  const endPress = () => { if (pressRef.current) { clearTimeout(pressRef.current); pressRef.current = null } }

  // Close the reaction picker when clicking/tapping elsewhere.
  useEffect(() => {
    if (!reactFor) return
    const onDoc = e => {
      if (!e.target.closest('.msg-react-bar') && !e.target.closest('.msg-react-add')) setReactFor(null)
    }
    const t = setTimeout(() => document.addEventListener('click', onDoc), 0)
    return () => { clearTimeout(t); document.removeEventListener('click', onDoc) }
  }, [reactFor])

  const canBook = !isAdmin && !isSuperAdmin   // only employees book meetings

  const startCall = mode => {
    if (active) startCallEngine(active, mode)
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
    if (!activeId) return
    const text = draft.trim()
    if (pendingFile) {
      sendFile(activeId, pendingFile, text)
      setPendingFile(null); setDraft(''); setEmojiOpen(false)
      return
    }
    if (!text) return
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
                    <span className="msg-presence-dot" />{presenceLabel(u.online, u.lastSeen)}
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
                    {active.online
                      ? <><span className="status-dot" /> Online now</>
                      : (active.lastSeen ? presenceLabel(false, active.lastSeen) : active.role)}
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
                    <div className="msg-msg">
                      <div
                        className="msg-bubble"
                        onTouchStart={() => startPress(m.id)}
                        onTouchEnd={endPress}
                        onTouchMove={endPress}
                        onContextMenu={e => e.preventDefault()}
                      >
                        {m.fileUrl && (
                          <a className="msg-file-chip" href={m.fileUrl} target="_blank" rel="noreferrer" title={m.fileName}>
                            <FileText size={18} />
                            <span className="msg-file-name">{m.fileName || 'Attachment'}</span>
                          </a>
                        )}
                        {m.text && <span className="msg-bubble-text">{renderEmoji(m.text)}</span>}
                      </div>
                      {m.reactions.length > 0 && (
                        <div className="msg-reacts">
                          {m.reactions.map(r => (
                            <button key={r.emoji} className={`msg-react${r.mine ? ' mine' : ''}`} onClick={() => toggleReaction(m.id, r.emoji)}>
                              <NotoEmoji char={r.emoji} size={14} />{r.count > 1 ? <span className="msg-react-n">{r.count}</span> : null}
                            </button>
                          ))}
                        </div>
                      )}
                      <span className="msg-bubble-time">{m.time}</span>
                    </div>
                    <button className="msg-react-add" onClick={() => setReactFor(reactFor === m.id ? null : m.id)} aria-label="React">
                      <Smile size={16} />
                    </button>
                    {reactFor === m.id && (
                      <div className="msg-react-bar">
                        {REACTIONS.map(e => (
                          <button key={e} onClick={() => { toggleReaction(m.id, e); setReactFor(null) }}><NotoEmoji char={e} size={22} /></button>
                        ))}
                        {m.from === 'me' && (
                          <button className="msg-react-del" title="Delete for everyone" onClick={() => { setConfirmDel(m.id); setReactFor(null) }}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <form className="msg-composer" onSubmit={send}>
                <input type="file" hidden ref={fileRef} onChange={onPickFile}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,image/*" />

                {pendingFile && (
                  <div className="msg-pending">
                    <FileText size={16} className="msg-pending-ic" />
                    <span className="msg-pending-name">{pendingFile.name}</span>
                    <button type="button" className="msg-pending-x" onClick={() => setPendingFile(null)} aria-label="Remove file">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="msg-composer-row">
                  <button type="button" className="msg-tool" onClick={() => fileRef.current?.click()} aria-label="Attach file" title="Attach a file">
                    <Paperclip size={18} />
                  </button>
                  <button type="button" className="msg-tool" onClick={() => setEmojiOpen(o => !o)} aria-label="Emoji" title="Emoji">
                    <Smile size={18} />
                  </button>
                  {emojiOpen && (
                    <div className="msg-emoji-pop">
                      {EMOJIS.map(e => (
                        <button type="button" key={e} onClick={() => setDraft(d => d + e)}><NotoEmoji char={e} size={24} /></button>
                      ))}
                    </div>
                  )}
                  <input
                    className="msg-input"
                    placeholder={pendingFile ? 'Add a caption (optional)…' : 'Type a message…'}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                  />
                  <button type="submit" className="msg-send" disabled={!draft.trim() && !pendingFile} aria-label="Send">
                    <Send size={17} />
                  </button>
                </div>
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

      {confirmDel && (
        <ConfirmModal
          icon={Trash2}
          title="Delete message?"
          message="This message will be permanently removed for everyone in the conversation."
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={() => { deleteMessage(confirmDel); setConfirmDel(null) }}
          onCancel={() => setConfirmDel(null)}
        />
      )}

    </div>
  )
}
