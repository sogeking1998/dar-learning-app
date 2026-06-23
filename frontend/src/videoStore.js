// Per-session presentation videos (Supabase) — a session can have several.
import { supabase } from './supabaseClient'

const BUCKET = 'videos'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

// { [course_id]: firstVideoUrl } — what the student plays per session.
export async function getSessionVideos() {
  const { data, error } = await supabase
    .from('session_videos')
    .select('course_id, url, created_at')
    .order('created_at', { ascending: true })
  if (error) { console.error('Load session videos failed:', error.message); return {} }
  const map = {}
  for (const r of data || []) if (!map[r.course_id]) map[r.course_id] = r.url
  return map
}

// All videos grouped by session — { [course_id]: [{id, url, title, created_at}] }.
// Students see the full playlist per session.
export async function getAllSessionVideos() {
  const { data, error } = await supabase
    .from('session_videos')
    .select('id, course_id, url, title, created_at')
    .order('created_at', { ascending: true })
  if (error) { console.error('Load session videos failed:', error.message); return {} }
  const map = {}
  for (const r of data || []) (map[r.course_id] ||= []).push(r)
  return map
}

// Full list of videos for one session (admin).
export async function getSessionVideosForCourse(courseId) {
  const { data, error } = await supabase
    .from('session_videos')
    .select('id, url, title, created_at')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })
  if (error) { console.error('Load videos failed:', error.message); return [] }
  return data || []
}

// Uploads via XHR so we can report real progress (the JS SDK doesn't expose it).
async function uploadFile(courseId, file, onProgress) {
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
  const path = `session-${courseId}-${Date.now()}.${ext}`
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token || SUPABASE_KEY

  // Mirror what supabase-js sends for a File: multipart/form-data, NOT raw binary.
  // (Don't set Content-Type — the browser adds the multipart boundary itself.)
  const form = new FormData()
  form.append('cacheControl', '3600')
  form.append('', file)

  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', SUPABASE_KEY)
    xhr.setRequestHeader('x-upsert', 'true')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
        resolve({ url: pub.publicUrl })
      } else {
        resolve({ error: { message: `Upload failed (${xhr.status}) ${xhr.responseText || ''}`.trim() } })
      }
    }
    xhr.onerror = () => resolve({ error: { message: 'Upload failed (network error).' } })
    xhr.send(form)
  })
}

export async function addSessionVideo(courseId, file, onProgress) {
  const { error: upErr, url } = await uploadFile(courseId, file, onProgress)
  if (upErr) return { error: upErr }
  const { error } = await supabase.from('session_videos').insert({ course_id: courseId, url, title: file.name })
  if (error) console.error('Add video failed:', error.message)
  return { error }
}

export async function replaceSessionVideo(videoId, courseId, file, onProgress) {
  const { error: upErr, url } = await uploadFile(courseId, file, onProgress)
  if (upErr) return { error: upErr }
  const { error } = await supabase.from('session_videos').update({ url, title: file.name }).eq('id', videoId)
  if (error) console.error('Replace video failed:', error.message)
  return { error }
}

export async function deleteSessionVideoById(videoId) {
  const { error } = await supabase.from('session_videos').delete().eq('id', videoId)
  if (error) console.error('Delete video failed:', error.message)
  return { error }
}

// ── Welcome video ──────────────────────────────────────────────
// The Home page welcome video is stored in the SAME session_videos table under a
// reserved course_id (0) — no real session has id 0, so it never appears in the
// per-session listings. This avoids any schema/migration changes.
export const WELCOME_COURSE_ID = 0

export async function getWelcomeVideo() {
  const { data, error } = await supabase
    .from('session_videos')
    .select('id, url, title, created_at')
    .eq('course_id', WELCOME_COURSE_ID)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) { console.error('Load welcome video failed:', error.message); return null }
  return data?.[0] || null
}

// Upload + store the welcome video (replaces the existing one if present).
export async function setWelcomeVideo(file, onProgress) {
  const existing = await getWelcomeVideo()
  return existing
    ? replaceSessionVideo(existing.id, WELCOME_COURSE_ID, file, onProgress)
    : addSessionVideo(WELCOME_COURSE_ID, file, onProgress)
}

export async function deleteWelcomeVideo() {
  const existing = await getWelcomeVideo()
  if (!existing) return { error: null }
  return deleteSessionVideoById(existing.id)
}

// Read a video's duration (seconds) from its URL without downloading it fully.
export function readVideoDuration(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => resolve(v.duration)
    v.onerror = () => resolve(null)
    v.src = url
  })
}

// Total real video length per session → { [course_id]: totalSeconds }.
// Used to show an accurate "X min of video" instead of a hardcoded estimate.
export async function getSessionDurations() {
  const map = await getAllSessionVideos()
  const out = {}
  await Promise.all(Object.entries(map).map(async ([courseId, vids]) => {
    const secs = await Promise.all(vids.map(v => readVideoDuration(v.url)))
    out[courseId] = secs.reduce((sum, s) => sum + (s || 0), 0)
  }))
  return out
}

// Format a duration in seconds as a short label, or null when there's nothing.
export function formatVideoDuration(seconds) {
  if (!seconds || seconds <= 0) return null
  const mins = Math.round(seconds / 60)
  return mins < 1 ? '<1 min' : `${mins} min`
}
