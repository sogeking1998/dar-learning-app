// Shared "is this session complete?" logic, driven by the real Supabase data:
// video watched + task submitted + pre-test + post-test.
import { useState, useEffect } from 'react'
import { getResultsForUser } from './examStore'
import { getSubmissionsForUser, getTasksMap } from './taskStore'
import { getVideoProgress } from './progressStore'
import { getAllSessionVideos } from './videoStore'

// A pre/post test only counts as completed once the score reaches this percentage.
export const PASS_PCT = 80
export const examPassed = result => (result?.pct ?? 0) >= PASS_PCT

export function sessionCompletion(course, { results = {}, submissions = {}, videoProg = {}, tasks = {}, sessionVideos = {} }) {
  const courseTasks = tasks[course.id] || []
  const courseVideos = sessionVideos[course.id] || []
  // Done when every uploaded video for the session has been watched to the end.
  const videoDone = !course.hasVideo || courseVideos.length === 0 || courseVideos.every(v => videoProg[v.id]?.completed)
  const taskDone = courseTasks.length === 0 || courseTasks.every(t => submissions[t.id])
  const preDone = examPassed(results[`${course.id}-pre`])
  const postDone = examPassed(results[`${course.id}-post`])
  const items = [videoDone, taskDone, preDone, postDone]
  const done = items.filter(Boolean).length
  const pct = Math.round((done / items.length) * 100)
  const status = done === items.length ? 'completed' : done > 0 ? 'in_progress' : 'not_started'
  return { videoDone, taskDone, preDone, postDone, done, pct, status }
}

// Loads everything needed to compute completion for a user.
export function useUserProgress(userId) {
  const [data, setData] = useState({ results: {}, submissions: {}, videoProg: {}, tasks: {}, sessionVideos: {}, loading: true })
  useEffect(() => {
    let active = true
    Promise.all([
      getResultsForUser(userId),
      getSubmissionsForUser(userId),
      getVideoProgress(userId),
      getTasksMap(),
      getAllSessionVideos(),
    ]).then(([results, submissions, videoProg, tasks, sessionVideos]) => {
      if (active) setData({ results, submissions, videoProg, tasks, sessionVideos, loading: false })
    })
    return () => { active = false }
  }, [userId])
  return data
}
