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

export const DEFAULT_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]       // every day by default
export const DEFAULT_SLOTS = buildTimes(8, 17)              // 8:00 AM – 5:00 PM, 30-min

// An admin's availability (weekdays + time slots). Falls back to sensible defaults.
export async function getAvailability(userId) {
  if (!userId) return { weekdays: DEFAULT_WEEKDAYS, slots: DEFAULT_SLOTS }
  const { data, error } = await supabase
    .from('meeting_availability')
    .select('weekdays, slots')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) { console.error('Load availability failed:', error.message) }
  return {
    weekdays: data?.weekdays?.length ? data.weekdays : DEFAULT_WEEKDAYS,
    slots: data?.slots?.length ? data.slots : DEFAULT_SLOTS,
  }
}

export async function saveAvailability(userId, weekdays, slots) {
  const { error } = await supabase.from('meeting_availability').upsert(
    { user_id: userId, weekdays, slots, updated_at: new Date().toISOString() },
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
