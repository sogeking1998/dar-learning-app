// Per-session presentation videos. Files live in Cloudflare R2 (zero egress
// cost); the database only stores the public R2 URL. Uploads go straight from
// the browser to R2 via a short-lived presigned URL minted by /api/r2-presign.
import { supabase } from './supabaseClient'

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

// Upload a file to R2: ask the server for a presigned PUT URL, then PUT the
// raw file straight to R2 (XHR so we can report real upload progress).
async function uploadFile(courseId, file, onProgress) {
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()

  // 1) Get a short-lived presigned upload URL from our serverless function.
  let presign
  try {
    const r = await fetch('/api/r2-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, ext }),
    })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      return { error: { message: `Could not start the upload (${r.status}). ${txt}`.trim() } }
    }
    presign = await r.json()
  } catch (e) {
    return { error: { message: `Upload service unreachable: ${e.message}` } }
  }

  // 2) PUT the file directly to R2.
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', presign.uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve({ url: presign.publicUrl })
      else resolve({ error: { message: `Upload to R2 failed (${xhr.status}) ${xhr.responseText || ''}`.trim() } })
    }
    xhr.onerror = () => resolve({ error: { message: 'Upload failed — likely the R2 CORS policy. Check the bucket CORS settings.' } })
    xhr.send(file)
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
