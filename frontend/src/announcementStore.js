// Announcements backed by Supabase. Everyone (signed in) can read;
// only staff (admin / superadmin) can write — enforced by RLS.
import { supabase } from './supabaseClient'

export async function getAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, author, created_at')
    .order('created_at', { ascending: false })
  if (error) { console.error('Load announcements failed:', error.message); return [] }
  return data || []
}

export async function addAnnouncement({ title, content, author }) {
  const { error } = await supabase.from('announcements').insert({ title, content, author })
  if (error) console.error('Add announcement failed:', error.message)
  return { error }
}

export async function updateAnnouncement(id, { title, content, author }) {
  const { error } = await supabase.from('announcements').update({ title, content, author }).eq('id', id)
  if (error) console.error('Update announcement failed:', error.message)
  return { error }
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) console.error('Delete announcement failed:', error.message)
  return { error }
}
