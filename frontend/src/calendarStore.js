// Admin meeting availability + employee bookings (Supabase).
import { supabase } from './supabaseClient'

// 30-minute slots from a start hour through an end hour (inclusive at :00).
export function buildTimes(startH, endH) {
  const out = []
  for (let h = startH; h <= endH; h++) {
    for (const m of [0, 30]) {
      if (h === endH && m > 0) break
      const ampm = h < 12 ? 'AM' : 'PM'
      const hr = h % 12 === 0 ? 12 : h % 12
      out.push(`${hr}:${String(m).padStart(2, '0')} ${ampm}`)
    }
  }
  return out
}

export const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5]             // weekdays only (no weekends)

// Availability is a set of 30-min BLOCK start times. Each start t denotes the
// bookable block [t, endOf(t)]. GRID is the full boundary grid (includes the
// final 5:00 PM end); BLOCK_STARTS drops that trailing end so it lists only the
// times a block can start at (8:00 AM … 4:30 PM).
export const GRID = buildTimes(8, 17)                      // 8:00 AM … 5:00 PM
export const BLOCK_STARTS = GRID.slice(0, -1)              // 8:00 AM … 4:30 PM
export const endOf = t => GRID[GRID.indexOf(t) + 1]        // a block's end time
export const blockLabel = t => `${t} – ${endOf(t)}`        // e.g. "8:00 AM – 8:30 AM"

export const DEFAULT_SLOTS = [...BLOCK_STARTS]             // default: every block open

// Keep only valid block starts — normalizes legacy data that stored boundary
// times (e.g. a trailing "5:00 PM") rather than block starts.
const normSlots = arr => (arr || []).filter(t => BLOCK_STARTS.includes(t))

// An admin's availability. `slots` is the default weekly template; `dateSlots`
// holds per-date overrides ({ 'YYYY-MM-DD': [...slots] }) — a date listed there
// uses exactly those hours, dates not listed fall back to the default template.
export async function getAvailability(userId) {
  if (!userId) return { weekdays: DEFAULT_WEEKDAYS, slots: DEFAULT_SLOTS, dateSlots: {} }
  const { data, error } = await supabase
    .from('meeting_availability')
    .select('weekdays, slots, date_slots')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) { console.error('Load availability failed:', error.message) }
  const dateSlots = Object.fromEntries(
    Object.entries(data?.date_slots || {}).map(([k, v]) => [k, normSlots(v)])
  )
  return {
    weekdays: data?.weekdays?.length ? data.weekdays : DEFAULT_WEEKDAYS,
    slots: data?.slots?.length ? normSlots(data.slots) : DEFAULT_SLOTS,
    dateSlots,
  }
}

export async function saveAvailability(userId, weekdays, slots, dateSlots = {}) {
  const { error } = await supabase.from('meeting_availability').upsert(
    { user_id: userId, weekdays, slots, date_slots: dateSlots, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) console.error('Save availability failed:', error.message)
  return { error }
}

// ── Bookings ──
export async function createBooking(employeeId, adminId, isoDate, slot) {
  const { error } = await supabase.from('bookings')
    .insert({ employee_id: employeeId, admin_id: adminId, meet_date: isoDate, slot })
  if (error) console.error('Create booking failed:', error.message)
  return { error }
}

// Slots already taken for an admin on a given date (any employee).
// Uses an RPC so employees can see taken times without seeing who booked them.
export async function getBookedSlots(adminId, isoDate) {
  const { data, error } = await supabase.rpc('booked_slots', { p_admin: adminId, p_date: isoDate })
  if (error) { console.error('Load booked slots failed:', error.message); return [] }
  return (data || []).map(r => (typeof r === 'string' ? r : r.slot)).filter(Boolean)
}

// All bookings for an admin, with the employee's name resolved.
export async function getAdminBookings(adminId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, employee_id, meet_date, slot, created_at')
    .eq('admin_id', adminId)
    .order('meet_date', { ascending: true })
  if (error) { console.error('Load bookings failed:', error.message); return [] }

  const rows = data || []
  const ids = [...new Set(rows.map(r => r.employee_id))]
  let names = {}
  if (ids.length) {
    const { data: profs } = await supabase.from('profiles').select('id, name').in('id', ids)
    names = Object.fromEntries((profs || []).map(p => [p.id, p.name]))
  }
  return rows.map(r => ({ ...r, employeeName: names[r.employee_id] || 'Unknown' }))
}
