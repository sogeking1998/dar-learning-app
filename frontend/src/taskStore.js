// Per-course tasks + submissions backed by Supabase (Storage for files).
import { supabase } from './supabaseClient'

const BUCKET = 'task-files'
const TASK_COLS = 'id, course_id, title, description, instructions'
const missingColumn = (error, column) =>
  !!error && new RegExp(`(?:column[^.]*${column}|${column}[^.]*schema cache)`, 'i').test(error.message || '')

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
// A submission only counts as complete once an admin has marked it 'passed'.
export const taskApproved = sub => sub?.status === 'passed'

export async function getSubmissionsForUser(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('user_id', userId)
  if (error) { console.error('Load submissions failed:', error.message); return {} }
  const map = {}
  for (const s of data || []) map[s.task_id] = { ...s, status: s.status || 'pending' }
  return map
}

export async function submitTask(userId, taskId, file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const path = `${userId}/${taskId}.${ext}`

  // Insert first so projects with the original storage policies still work.
  // If a previous attempt left the deterministic path behind, remove only that
  // user's object and insert the replacement instead of requiring UPDATE access.
  let { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  const duplicate = upErr && (Number(upErr.statusCode) === 409 || /already exists|duplicate/i.test(upErr.message || ''))
  if (duplicate) {
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove([path])
    if (removeErr) return { error: removeErr }
    ;({ error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false }))
  }
  if (upErr) return { error: upErr }

  // A new upload always resets the review — the admin must re-check it.
  const submission = {
    user_id: userId, task_id: taskId, file_path: path, file_name: file.name,
    submitted_at: new Date().toISOString(),
  }
  let { data, error } = await supabase.from('task_submissions')
    .upsert(submission, { onConflict: 'user_id,task_id' })
    .select('*')
    .maybeSingle()
  if (error) return { error, path }
  if (!data) return { error: { message: 'The file uploaded, but the submission record could not be confirmed.' }, path }

  // Reset an existing review on resubmission when the newer workflow columns
  // exist. Legacy tables simply keep working until the migration is applied.
  if (Object.prototype.hasOwnProperty.call(data, 'status')) {
    const reset = { status: 'pending' }
    if (Object.prototype.hasOwnProperty.call(data, 'reviewed_at')) reset.reviewed_at = null
    if (Object.prototype.hasOwnProperty.call(data, 'reviewed_by')) reset.reviewed_by = null
    const result = await supabase.from('task_submissions')
      .update(reset)
      .eq('user_id', userId).eq('task_id', taskId)
      .select('*')
      .maybeSingle()
    if (result.error) return { error: result.error, path }
    data = result.data || data
  }
  return { error: null, path, submission: { ...data, status: data.status || 'pending' } }
}

// Admin review: mark a student's submission passed or failed.
export async function reviewSubmission(userId, taskId, status, reviewerId) {
  let { data, error } = await supabase.from('task_submissions')
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq('user_id', userId).eq('task_id', taskId)
    .select('*')
    .maybeSingle()
  if (missingColumn(error, 'reviewed_at') || missingColumn(error, 'reviewed_by')) {
    ;({ data, error } = await supabase.from('task_submissions')
      .update({ status })
      .eq('user_id', userId).eq('task_id', taskId)
      .select('*')
      .maybeSingle())
  }
  if (missingColumn(error, 'status')) {
    error = {
      ...error,
      message: 'The Supabase task_submissions table is missing the status column. Run supabase/migrations/add-task-submission-review-columns.sql in the Supabase SQL Editor, then try again.',
    }
  }
  if (error) console.error('Review submission failed:', error.message)
  return { data, error }
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
