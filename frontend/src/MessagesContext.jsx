import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { fetchMyMessages, sendMessageRow, markReadRows } from './messagesStore'

// Stable avatar colour per user id.
const COLORS = ['c-green', 'c-blue', 'c-amber', 'c-purple']
const hash = s => { let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h }
const colorFor = id => COLORS[Math.abs(hash(String(id))) % COLORS.length]
const roleLabel = p => p.position || (p.division ? `${p.division} Division` : 'Employee')

const fmtTime = iso => {
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

const MessagesContext = createContext(null)

export function MessagesProvider({ children }) {
  const { session } = useAuth()
  const me = session?.user?.id
  const [directory, setDirectory] = useState([])  // real users from `profiles`
  const [onlineIds, setOnlineIds] = useState([])  // ids currently connected
  const [msgs, setMsgs] = useState([])            // all message rows involving me
  const [notice, setNotice] = useState(null)      // newest incoming message, for the toast

  // Load everyone (except yourself) from Supabase for the People tab.
  useEffect(() => {
    if (!me) return
    let active = true
    supabase
      .from('profiles')
      .select('id, name, division, position, role')
      .neq('id', me)
      .then(({ data, error }) => {
        if (error) { console.error('Load directory failed:', error.message); return }
        if (!active) return
        setDirectory((data || [])
          .filter(p => p.name && p.role !== 'superadmin')   // onboarded users, no super admin
          .map(p => ({ id: p.id, name: p.name, role: roleLabel(p), accountRole: p.role, color: colorFor(p.id) }))
          .sort((a, b) => a.name.localeCompare(b.name)))
      })
    return () => { active = false }
  }, [me])

  // Realtime presence: who is actually online right now.
  useEffect(() => {
    if (!me) return
    const channel = supabase.channel('online-users', { config: { presence: { key: me } } })
    channel
      .on('presence', { event: 'sync' }, () => setOnlineIds(Object.keys(channel.presenceState())))
      .subscribe(status => {
        if (status === 'SUBSCRIBED') channel.track({ online_at: new Date().toISOString() })
      })
    return () => { supabase.removeChannel(channel) }
  }, [me])

  // Load my message history + subscribe to new incoming messages live.
  useEffect(() => {
    if (!me) return
    let active = true
    fetchMyMessages(me).then(rows => { if (active) setMsgs(rows) })

    const channel = supabase
      .channel(`messages-${me}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` },
        payload => {
          setMsgs(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
          setNotice({ key: payload.new.id, senderId: payload.new.sender_id, text: payload.new.text })
        })
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel) }
  }, [me])

  const usersById = useMemo(() => {
    const map = {}
    for (const u of directory) map[u.id] = u
    return map
  }, [directory])

  const users = useMemo(
    () => directory.map(u => ({ ...u, online: onlineIds.includes(String(u.id)) })),
    [directory, onlineIds]
  )

  // Conversation summaries (one per person you've exchanged messages with).
  const conversations = useMemo(() => {
    const byOther = {}
    for (const m of msgs) {
      const otherId = m.sender_id === me ? m.recipient_id : m.sender_id
      ;(byOther[otherId] ||= []).push(m)
    }
    return Object.entries(byOther).map(([otherId, list]) => {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      const last = list[list.length - 1]
      const u = usersById[otherId] || {}
      return {
        id: otherId,
        name: u.name || 'Unknown user',
        role: u.role || '',
        accountRole: u.accountRole || null,
        color: u.color || colorFor(otherId),
        online: onlineIds.includes(String(otherId)),
        unread: list.filter(m => m.recipient_id === me && !m.read_at).length,
        lastText: `${last.sender_id === me ? 'You: ' : ''}${last.text}`,
        time: fmtTime(last.created_at),
        ts: new Date(last.created_at).getTime(),
      }
    }).sort((a, b) => b.ts - a.ts)
  }, [msgs, usersById, onlineIds, me])

  const unreadTotal = useMemo(
    () => msgs.filter(m => m.recipient_id === me && !m.read_at).length,
    [msgs, me]
  )

  // Messages with one person, mapped for the thread view.
  const messagesWith = otherId => msgs
    .filter(m =>
      (m.sender_id === me && m.recipient_id === otherId) ||
      (m.sender_id === otherId && m.recipient_id === me))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(m => ({ id: m.id, from: m.sender_id === me ? 'me' : 'them', text: m.text, time: fmtTime(m.created_at) }))

  const sendMessage = async (recipientId, text) => {
    if (!me || !recipientId || !text.trim()) return
    const { data } = await sendMessageRow(me, recipientId, text.trim())
    if (data) setMsgs(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
  }

  const markRead = async otherId => {
    setMsgs(prev => prev.map(m =>
      (m.sender_id === otherId && m.recipient_id === me && !m.read_at)
        ? { ...m, read_at: new Date().toISOString() } : m))
    await markReadRows(me, otherId)
  }

  const clearNotice = () => setNotice(null)

  return (
    <MessagesContext.Provider value={{ users, conversations, messagesWith, sendMessage, markRead, unreadTotal, notice, clearNotice }}>
      {children}
    </MessagesContext.Provider>
  )
}

export const useMessages = () => useContext(MessagesContext)
