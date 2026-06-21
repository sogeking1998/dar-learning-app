// Direct messages between two users (Supabase + Realtime).
import { supabase } from './supabaseClient'

const FILE_BUCKET = 'message-files'

// Every message that involves me (sent or received), oldest first.
export async function fetchMyMessages(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, text, file_url, file_name, created_at, read_at')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true })
  if (error) { console.error('Load messages failed:', error.message); return [] }
  return data || []
}

export async function sendMessageRow(senderId, recipientId, text, fileUrl = null, fileName = null) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, text, file_url: fileUrl, file_name: fileName })
    .select()
    .single()
  if (error) console.error('Send message failed:', error.message)
  return { data, error }
}

// Delete a message for everyone (RLS lets only the sender do this).
export async function deleteMessageRow(messageId) {
  const { error } = await supabase.from('messages').delete().eq('id', messageId)
  if (error) console.error('Delete message failed:', error.message)
  return { error }
}

// Upload a shared file to the public message-files bucket.
export async function uploadMessageFile(senderId, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${senderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(FILE_BUCKET).upload(path, file)
  if (error) { console.error('Upload message file failed:', error.message); return { error } }
  const { data: pub } = supabase.storage.from(FILE_BUCKET).getPublicUrl(path)
  return { url: pub.publicUrl, name: file.name }
}

// ── Reactions ──
export async function fetchReactions() {
  // RLS limits rows to reactions on messages I'm part of.
  const { data, error } = await supabase
    .from('message_reactions')
    .select('id, message_id, user_id, emoji')
  if (error) { console.error('Load reactions failed:', error.message); return [] }
  return data || []
}

export async function addReaction(messageId, userId, emoji) {
  const { error } = await supabase.from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji })
  if (error) console.error('Add reaction failed:', error.message)
  return { error }
}

export async function removeReaction(messageId, userId, emoji) {
  const { error } = await supabase.from('message_reactions')
    .delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji)
  if (error) console.error('Remove reaction failed:', error.message)
  return { error }
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
