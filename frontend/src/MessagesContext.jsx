import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { fetchMyMessages, sendMessageRow, markReadRows, uploadMessageFile, fetchReactions, addReaction, removeReaction } from './messagesStore'

// Emoji palette for the composer and quick reactions.
export const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😅','🙏','👍','👎','👏','🙌','🔥','🎉','❤️','✅','❌','📌','😢','😮','😱','💪']
export const REACTIONS = ['👍','❤️','😂','😮','😢','🙏']

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
  const [reactions, setReactions] = useState([])  // {message_id, user_id, emoji}
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
          setNotice({ key: payload.new.id, senderId: payload.new.sender_id, text: payload.new.text || (payload.new.file_name ? `📎 ${payload.new.file_name}` : '') })
        })
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel) }
  }, [me])

  // Reactions: load + keep in sync live.
  useEffect(() => {
    if (!me) return
    let active = true
    fetchReactions().then(r => { if (active) setReactions(r) })
    const ch = supabase
      .channel(`reactions-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        () => { fetchReactions().then(r => setReactions(r)) })
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
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
        lastText: `${last.sender_id === me ? 'You: ' : ''}${last.text || (last.file_name ? '📎 ' + last.file_name : '')}`,
        time: fmtTime(last.created_at),
        ts: new Date(last.created_at).getTime(),
      }
    }).sort((a, b) => b.ts - a.ts)
  }, [msgs, usersById, onlineIds, me])

  const unreadTotal = useMemo(
    () => msgs.filter(m => m.recipient_id === me && !m.read_at).length,
    [msgs, me]
  )

  // Group reactions per message → [{ emoji, count, mine }]
  const reactionsFor = id => {
    const rows = reactions.filter(r => r.message_id === id)
    const by = {}
    for (const r of rows) {
      by[r.emoji] = by[r.emoji] || { emoji: r.emoji, count: 0, mine: false }
      by[r.emoji].count++
      if (r.user_id === me) by[r.emoji].mine = true
    }
    return Object.values(by)
  }

  // Messages with one person, mapped for the thread view.
  const messagesWith = otherId => msgs
    .filter(m =>
      (m.sender_id === me && m.recipient_id === otherId) ||
      (m.sender_id === otherId && m.recipient_id === me))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(m => ({
      id: m.id, from: m.sender_id === me ? 'me' : 'them', text: m.text, time: fmtTime(m.created_at),
      fileUrl: m.file_url, fileName: m.file_name, reactions: reactionsFor(m.id),
    }))

  const sendMessage = async (recipientId, text) => {
    if (!me || !recipientId || !text.trim()) return
    const { data } = await sendMessageRow(me, recipientId, text.trim())
    if (data) setMsgs(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
  }

  const sendFile = async (recipientId, file) => {
    if (!me || !recipientId || !file) return
    const up = await uploadMessageFile(me, file)
    if (up.error) return { error: up.error }
    const { data } = await sendMessageRow(me, recipientId, '', up.url, up.name)
    if (data) setMsgs(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
    return {}
  }

  const toggleReaction = (messageId, emoji) => {
    const mine = reactions.find(r => r.message_id === messageId && r.user_id === me && r.emoji === emoji)
    if (mine) {
      setReactions(prev => prev.filter(r => !(r.message_id === messageId && r.user_id === me && r.emoji === emoji)))
      removeReaction(messageId, me, emoji)
    } else {
      setReactions(prev => [...prev, { id: 'tmp-' + Date.now(), message_id: messageId, user_id: me, emoji }])
      addReaction(messageId, me, emoji)
    }
  }

  const markRead = async otherId => {
    setMsgs(prev => prev.map(m =>
      (m.sender_id === otherId && m.recipient_id === me && !m.read_at)
        ? { ...m, read_at: new Date().toISOString() } : m))
    await markReadRows(me, otherId)
  }

  const clearNotice = () => setNotice(null)

  return (
    <MessagesContext.Provider value={{ users, conversations, messagesWith, sendMessage, sendFile, toggleReaction, markRead, unreadTotal, notice, clearNotice }}>
      {children}
    </MessagesContext.Provider>
  )
}

export const useMessages = () => useContext(MessagesContext)
