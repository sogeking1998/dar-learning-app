// Tracks video playback position + completion per user, per video (Supabase).
import { supabase } from './supabaseClient'

// { [video_id]: { position, completed } }
export async function getVideoProgress(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('video_completions')
    .select('video_id, position, completed')
    .eq('user_id', userId)
  if (error) { console.error('Load video progress failed:', error.message); return {} }
  const map = {}
  for (const r of data || []) if (r.video_id != null) map[r.video_id] = { position: r.position || 0, completed: !!r.completed }
  return map
}

// Save where the user stopped (does NOT change the completed flag).
export async function saveVideoPosition(userId, courseId, videoId, position) {
  if (!userId || videoId == null) return { error: null }
  const { error } = await supabase.from('video_completions').upsert(
    { user_id: userId, course_id: courseId, video_id: videoId, position },
    { onConflict: 'user_id,video_id' }
  )
  return { error }
}

// Mark the video finished.
export async function markVideoCompleted(userId, courseId, videoId, position = 0) {
  if (!userId || videoId == null) return { error: null }
  const { error } = await supabase.from('video_completions').upsert(
    { user_id: userId, course_id: courseId, video_id: videoId, position, completed: true, completed_at: new Date().toISOString() },
    { onConflict: 'user_id,video_id' }
  )
  return { error }
}
