// Per-course tasks + submissions backed by Supabase (Storage for files).
import { supabase } from './supabaseClient'

const BUCKET = 'task-files'
const TASK_COLS = 'id, course_id, title, description, instructions'

// Returns a map of { [course_id]: [tasks] }.
export async function getTasksMap() {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_COLS)
    .order('created_at', { ascending: true })
  if (error) { console.error('Load tasks failed:', error.message); return {} }
  const map = {}
  for (const t of data || []) {
    (map[t.course_id] ||= []).push(t)
  }
  return map
}

// ── Admin CRUD ──
export async function getTasksForCourse(courseId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_COLS)
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })
  if (error) { console.error('Load tasks failed:', error.message); return [] }
  return data || []
}

export async function addTask(courseId, { title, description, instructions }) {
  const { error } = await supabase.from('tasks').insert({ course_id: courseId, title, description, instructions })
  if (error) console.error('Add task failed:', error.message)
  return { error }
}

export async function updateTask(id, { title, description, instructions }) {
  const { error } = await supabase.from('tasks').update({ title, description, instructions }).eq('id', id)
  if (error) console.error('Update task failed:', error.message)
  return { error }
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) console.error('Delete task failed:', error.message)
  return { error }
}

// ── Submissions ──
export async function getSubmissionsForUser(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('task_submissions')
    .select('task_id, file_name, file_path, submitted_at')
    .eq('user_id', userId)
  if (error) { console.error('Load submissions failed:', error.message); return {} }
  const map = {}
  for (const s of data || []) map[s.task_id] = s
  return map
}

export async function submitTask(userId, taskId, file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const path = `${userId}/${taskId}.${ext}`

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (upErr) return { error: upErr }

  const { error } = await supabase.from('task_submissions').upsert(
    { user_id: userId, task_id: taskId, file_path: path, file_name: file.name, submitted_at: new Date().toISOString() },
    { onConflict: 'user_id,task_id' }
  )
  return { error, path }
}

// Private bucket — generate a short-lived link to view/open the submitted file.
export async function getSubmissionUrl(filePath) {
  if (!filePath) return { error: { message: 'No file on record.' } }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60 * 5)
  if (error) { console.error('Sign url failed:', error.message); return { error } }
  return { url: data.signedUrl }
}

// Remove the uploaded file and its submission record.
export async function deleteSubmission(userId, taskId, filePath) {
  if (filePath) await supabase.storage.from(BUCKET).remove([filePath])
  const { error } = await supabase.from('task_submissions').delete()
    .eq('user_id', userId).eq('task_id', taskId)
  if (error) console.error('Delete submission failed:', error.message)
  return { error }
}
