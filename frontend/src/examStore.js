// Exam questions + results backed by Supabase.
// Questions: everyone reads, staff (admin/superadmin) writes (RLS).
// Results: each user reads/writes only their own (RLS).
import { supabase } from './supabaseClient'

// ── Questions ──
export async function getQuestions(courseId, type) {
  const { data, error } = await supabase
    .from('exam_questions')
    .select('id, question, choices, answer')
    .eq('course_id', courseId)
    .eq('type', type)
    .order('created_at', { ascending: true })
  if (error) { console.error('Load questions failed:', error.message); return [] }
  return (data || []).map(q => ({ id: q.id, text: q.question, choices: q.choices || [], answer: q.answer }))
}

export async function addQuestion(courseId, type, { text, choices, answer }) {
  const { error } = await supabase
    .from('exam_questions')
    .insert({ course_id: courseId, type, question: text, choices, answer })
  if (error) console.error('Add question failed:', error.message)
  return { error }
}

export async function updateQuestion(id, { text, choices, answer }) {
  const { error } = await supabase
    .from('exam_questions')
    .update({ question: text, choices, answer })
    .eq('id', id)
  if (error) console.error('Update question failed:', error.message)
  return { error }
}

export async function deleteQuestion(id) {
  const { error } = await supabase.from('exam_questions').delete().eq('id', id)
  if (error) console.error('Delete question failed:', error.message)
  return { error }
}

// Blank question for the editor form (no id until saved).
export function makeQuestion() {
  return { text: '', choices: ['', '', '', ''], answer: 0 }
}

// ── Results ──
// Returns a map keyed `${course_id}-${type}` for one user.
export async function getResultsForUser(userId) {
  if (!userId) return {}
  const { data, error } = await supabase
    .from('exam_results')
    .select('course_id, type, score, total, pct, answers')
    .eq('user_id', userId)
  if (error) { console.error('Load results failed:', error.message); return {} }
  const map = {}
  for (const r of data || []) map[`${r.course_id}-${r.type}`] = r
  return map
}

export async function saveResult(userId, courseId, type, { score, total, pct, answers }) {
  const { error } = await supabase.from('exam_results').upsert(
    { user_id: userId, course_id: courseId, type, score, total, pct, answers, taken_at: new Date().toISOString() },
    { onConflict: 'user_id,course_id,type' }
  )
  if (error) console.error('Save result failed:', error.message)
  return { error }
}
