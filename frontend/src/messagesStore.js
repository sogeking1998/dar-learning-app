// Direct messages between two users (Supabase + Realtime).
import { supabase } from './supabaseClient'

// Every message that involves me (sent or received), oldest first.
export async function fetchMyMessages(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, text, created_at, read_at')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true })
  if (error) { console.error('Load messages failed:', error.message); return [] }
  return data || []
}

export async function sendMessageRow(senderId, recipientId, text) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, text })
    .select()
    .single()
  if (error) console.error('Send message failed:', error.message)
  return { data, error }
}

// Mark all unread messages from `otherId` to me as read.
export async function markReadRows(userId, otherId) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('sender_id', otherId)
    .is('read_at', null)
  if (error) console.error('Mark read failed:', error.message)
  return { error }
}
