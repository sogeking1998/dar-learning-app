// Courses/sessions backed by Supabase, with the hardcoded MOCK_COURSES as a
// safety fallback (used when the table is empty or unreachable). The `courses`
// table is seeded with the same ids as the mock list, so all related content
// (exam_questions, session_videos, tasks, materials, results) keys by the
// same course_id either way.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { MOCK_COURSES } from './mockData'

const mockById = Object.fromEntries(MOCK_COURSES.map(c => [c.id, c]))

// db row (snake_case) → app shape (camelCase + legacy fields some pages read).
function mapRow(r) {
  const mock = mockById[r.id]
  return {
    id: r.id,
    code: r.code || '',
    session: r.session ?? 1,
    title: r.title || '',
    shortTitle: r.short_title || r.title || '',
    division: r.division || 'PBD',
    description: r.description || '',
    duration: r.duration || '',
    // Legacy fields still referenced by a few pages; sane defaults for new rows.
    preTest: mock?.preTest || { questions: 0 },
    postTest: mock?.postTest || { questions: 0 },
    assignments: mock?.assignments ?? 0,
    hasVideo: mock?.hasVideo ?? true,
    hasDownloads: mock?.hasDownloads ?? true,
  }
}

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, code, session, title, short_title, division, description, duration')
    .order('division', { ascending: true })
    .order('session', { ascending: true })
  if (error) { console.error('Load courses failed:', error.message); return MOCK_COURSES }
  if (!data || data.length === 0) return MOCK_COURSES   // table not seeded yet → hardcoded fallback
  return data.map(mapRow)
}

// Shared hook: courses + loading + reload (after admin edits).
export function useCourses() {
  const [courses, setCourses] = useState(MOCK_COURSES)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    getCourses().then(list => { setCourses(list); setLoading(false) })
  }, [])
  useEffect(() => { reload() }, [reload])
  return { courses, loading, reload }
}

// ── Admin CRUD ──
export async function addCourse({ code, session, title, shortTitle, division, description, duration }) {
  const { error } = await supabase.from('courses').insert({
    code, session, title, short_title: shortTitle, division, description, duration,
  })
  if (error) console.error('Add course failed:', error.message)
  return { error }
}

export async function updateCourse(id, { code, session, title, shortTitle, division, description, duration }) {
  const { error } = await supabase.from('courses').update({
    code, session, title, short_title: shortTitle, division, description, duration,
  }).eq('id', id)
  if (error) console.error('Update course failed:', error.message)
  return { error }
}

// Deleting a session also removes everything attached to it, so orphaned
// questions/videos/tasks/materials don't silently linger.
export async function deleteCourse(id) {
  const related = ['exam_questions', 'exam_results', 'session_videos', 'session_materials', 'video_completions', 'tasks']
  for (const table of related) {
    const { error } = await supabase.from(table).delete().eq('course_id', id)
    if (error) { console.error(`Delete ${table} for course failed:`, error.message); return { error } }
  }
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) console.error('Delete course failed:', error.message)
  return { error }
}
