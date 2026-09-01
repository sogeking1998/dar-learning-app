// Shared "is this session complete?" logic, driven by the real Supabase data:
// video watched + task submitted + pre-test + post-test.
import { useState, useEffect } from 'react'
import { getResultsForUser } from './examStore'
import { getSubmissionsForUser, getTasksMap, taskApproved } from './taskStore'
import { getVideoProgress } from './progressStore'
import { getAllSessionVideos } from './videoStore'

// A pre/post test only counts as completed once the score reaches this percentage.
export const PASS_PCT = 80
export const examPassed = result => (result?.pct ?? 0) >= PASS_PCT

// A certificate is issued when the final required item is completed. Derive
// that moment from the latest persisted completion timestamp for the course.
export function certificateIssueDate(course, { results = {}, submissions = {}, videoProg = {}, tasks = {}, sessionVideos = {} }) {
  const dates = []
  const add = value => {
    if (!value) return
    const time = new Date(value).getTime()
    if (Number.isFinite(time)) dates.push(time)
  }

  add(results[`${course.id}-pre`]?.taken_at)
  add(results[`${course.id}-post`]?.taken_at)

  for (const task of tasks[course.id] || []) {
    const submission = submissions[task.id]
    if (taskApproved(submission)) add(submission.reviewed_at || submission.submitted_at)
  }
  for (const video of sessionVideos[course.id] || []) {
    const videoState = videoProg[video.id]
    if (videoState?.completed) add(videoState.completed_at)
  }

  return dates.length ? new Date(Math.max(...dates)) : new Date()
}

export function sessionCompletion(course, { results = {}, submissions = {}, videoProg = {}, tasks = {}, sessionVideos = {} }) {
  const courseTasks = tasks[course.id] || []
  const courseVideos = sessionVideos[course.id] || []
  const hasVideos = courseVideos.length > 0
  const hasTasks = courseTasks.length > 0
  // Done when every uploaded video for the session has been watched to the end.
  const videoDone = !hasVideos || courseVideos.every(v => videoProg[v.id]?.completed)
  // A task is "done" only when the admin has approved the submission (passed).
  const taskDone = !hasTasks || courseTasks.every(t => taskApproved(submissions[t.id]))
  // Any submitted Pre-Test counts. The Post-Test only counts after the learner
  // reaches the required passing score.
  const preDone = !!results[`${course.id}-pre`]
  const postDone = examPassed(results[`${course.id}-post`])
  // Only count requirements that actually exist for this session — otherwise a
  // session with no video/tasks would look "half done" before anyone starts it.
  const items = [preDone, postDone]
  if (hasVideos) items.push(videoDone)
  if (hasTasks) items.push(taskDone)
  const done = items.filter(Boolean).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0
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
