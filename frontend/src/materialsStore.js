// Downloadable learning materials per session (Supabase Storage + table).
// A session can have several materials of mixed file types.
import { supabase } from './supabaseClient'

const BUCKET = 'materials'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

// { [course_id]: [ {id, title, file_name, url, created_at} ] }
export async function getMaterialsMap() {
  const { data, error } = await supabase
    .from('session_materials')
    .select('id, course_id, title, file_name, url, created_at')
    .order('created_at', { ascending: true })
  if (error) { console.error('Load materials failed:', error.message); return {} }
  const map = {}
  for (const m of data || []) (map[m.course_id] ||= []).push(m)
  return map
}

// Full list for one session (admin).
export async function getMaterialsForCourse(courseId) {
  const { data, error } = await supabase
    .from('session_materials')
    .select('id, title, file_name, url, created_at')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })
  if (error) { console.error('Load materials failed:', error.message); return [] }
  return data || []
}

// Derive a storage path back out of a public URL (so we can delete the object).
function pathFromUrl(url) {
  const marker = `/object/public/${BUCKET}/`
  const i = url?.indexOf(marker)
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null
}

// Upload via XHR so we get real progress (the JS SDK doesn't expose it).
async function uploadFile(path, file, onProgress) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token || SUPABASE_KEY
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

// Add a new material file to a session.
export async function addMaterial(courseId, file, onProgress) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `material-${courseId}-${Date.now()}.${ext}`
  const { error: upErr, url } = await uploadFile(path, file, onProgress)
  if (upErr) return { error: upErr }

  const { error } = await supabase.from('session_materials')
    .insert({ course_id: courseId, title: file.name, file_name: file.name, url })
  if (error) console.error('Save material failed:', error.message)
  return { error }
}

export async function deleteMaterialById(id, url) {
  const path = pathFromUrl(url)
  if (path) await supabase.storage.from(BUCKET).remove([path])
  const { error } = await supabase.from('session_materials').delete().eq('id', id)
  if (error) console.error('Delete material failed:', error.message)
  return { error }
}
