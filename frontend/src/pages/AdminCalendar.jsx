import { useState, useEffect } from 'react'
import {
  CalendarDays, Clock, Check, ChevronLeft, ChevronRight, CalendarClock,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { getAvailability, saveAvailability, getAdminBookings, buildTimes } from '../calendarStore'

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_CIRCLES = [
  { i: 0, l: 'Su' }, { i: 1, l: 'Mo' }, { i: 2, l: 'Tu' }, { i: 3, l: 'We' },
  { i: 4, l: 'Th' }, { i: 5, l: 'Fr' }, { i: 6, l: 'Sa' },
]

const TIME_OPTIONS = buildTimes(8, 17)   // 8:00 AM – 5:00 PM, 30-min

const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const sameDay = (a, b) => a && b && a.getTime() === b.getTime()

export default function AdminCalendar() {
  const { session } = useAuth()
  const me = session?.user?.id
  const today = startOfDay(new Date())

  const [weekdays, setWeekdays] = useState([])
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selDate, setSelDate] = useState(today)

  useEffect(() => {
    if (!me) return
    let active = true
    Promise.all([getAvailability(me), getAdminBookings(me)]).then(([avail, books]) => {
      if (!active) return
      setWeekdays(avail.weekdays)
      setSlots(avail.slots)
      setBookings(books)
      setLoading(false)
    })
    return () => { active = false }
  }, [me])

  // Group bookings by date string.
  const byDate = {}
  for (const b of bookings) (byDate[b.meet_date] ||= []).push(b)

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(startOfDay(new Date(year, month, d)))

  const canPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())
  const stepMonth = delta => setView(new Date(year, month + delta, 1))
  const goToday = () => { setView(new Date(today.getFullYear(), today.getMonth(), 1)); setSelDate(today) }

  const toggleDay = i => setWeekdays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])
  const toggleSlot = t => setSlots(prev =>
    prev.includes(t)
      ? prev.filter(x => x !== t)
      : [...prev, t].sort((a, b) => TIME_OPTIONS.indexOf(a) - TIME_OPTIONS.indexOf(b)))
  const save = async () => {
    setSaving(true); setSaved(false)
    const { error } = await saveAvailability(me, weekdays, slots)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  const selBookings = byDate[iso(selDate)] || []
  const bookedSel = Object.fromEntries(selBookings.map(b => [b.slot, b.employeeName]))
  const selAvailable = weekdays.includes(selDate.getDay())
  const fmtSel = selDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const selShort = selDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

  if (loading) {
    return <div className="ax-wrap"><div className="admin-head"><h1 className="admin-title">My Calendar</h1></div><p className="cal-muted">Loading…</p></div>
  }

  return (
    <div className="ax-wrap">
      <div className="admin-head">
        <h1 className="admin-title">My Calendar</h1>
        <p className="admin-sub">Navigate the calendar to see your availability and booked meetings</p>
      </div>

      <div className="cal-top">
        {/* Calendar */}
        <div className="cal-card">
          <div className="cal-cal-nav">
            <button onClick={() => stepMonth(-1)} disabled={!canPrev} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <div className="cal-cal-title">
              <CalendarDays size={16} /> <span>{MONTHS[month]} {year}</span>
            </div>
            <button onClick={() => stepMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>

          <button className="cal-today-btn" onClick={goToday}>Today</button>

          <div className="cal-cal-grid cal-cal-weekdays">
            {WD_SHORT.map(d => <span key={d} className="cal-wd">{d}</span>)}
          </div>
          <div className="cal-cal-grid">
            {cells.map((date, i) => {
              if (!date) return <span key={`b${i}`} className="cal-cell empty" />
              const off = !weekdays.includes(date.getDay())
              const count = (byDate[iso(date)] || []).length
              const isToday = sameDay(date, today)
              const selected = sameDay(date, selDate)
              const past = date < today
              return (
                <button
                  key={date.getTime()}
                  className={`cal-cell${off ? ' off' : ''}${selected ? ' selected' : ''}${isToday ? ' today' : ''}${past ? ' past' : ''}`}
                  onClick={() => setSelDate(date)}
                >
                  <span className="cal-cell-num">{date.getDate()}</span>
                  {count > 0 && <span className="cal-cell-count">{count}</span>}
                </button>
              )
            })}
          </div>

          <div className="cal-legend">
            <span><span className="cal-dot booked" /> Has bookings</span>
            <span><span className="cal-dot today" /> Today</span>
            <span><span className="cal-dot off" /> Unavailable</span>
          </div>
        </div>

        {/* Selected day */}
        <div className="cal-card">
          <div className="cal-card-hd"><CalendarClock size={18} /><h3>{fmtSel}</h3></div>
          <span className={`cal-avail-pill${selAvailable ? ' on' : ''}`}>
            {selAvailable ? 'Available for bookings' : 'Not an available day'}
          </span>

          {selBookings.length === 0 ? (
            <div className="cal-empty">
              <CalendarClock size={26} />
              <p>No meetings this day</p>
              <span>Bookings from employees will show here.</span>
            </div>
          ) : (
            <ul className="cal-booking-list">
              {selBookings.map(b => (
                <li key={b.id} className="cal-booking">
                  <span className="cal-booking-time"><Clock size={12} /> {b.slot}</span>
                  <span className="cal-booking-who">{b.employeeName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Availability settings — full width */}
      <div className="cal-card cal-avail-card">
        <div className="cal-card-hd">
          <CalendarDays size={18} />
          <div>
            <h3>Availability</h3>
            <p className="cal-avail-desc">Choose the days and times employees can request meetings with you.</p>
          </div>
        </div>

        <div className="cal-avail-row">
          {/* Days — circular picker */}
          <div className="cal-avail-col">
            <div className="cal-label-row">
              <p className="cal-label">Days</p>
              <div className="cal-quick">
                <button type="button" onClick={() => setWeekdays([1, 2, 3, 4, 5])}>Weekdays</button>
                <button type="button" onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}>All</button>
                <button type="button" onClick={() => setWeekdays([])}>Clear</button>
              </div>
            </div>
            <div className="av-days">
              {DAY_CIRCLES.map(d => (
                <button
                  key={d.i}
                  type="button"
                  className={`av-day-circle${weekdays.includes(d.i) ? ' on' : ''}`}
                  onClick={() => toggleDay(d.i)}
                >
                  {d.l}
                </button>
              ))}
            </div>
            <p className="cal-avail-summary">
              {weekdays.length === 0
                ? 'No days selected — employees can’t book you.'
                : `Open ${weekdays.length} day${weekdays.length === 1 ? '' : 's'} a week`}
            </p>
          </div>

          {/* Times — switch list grouped by part of day */}
          <div className="cal-avail-col cal-avail-slots">
            <div className="cal-label-row">
              <p className="cal-label">Hours <span className="cal-count">{slots.length}</span></p>
              <div className="cal-quick">
                <button type="button" onClick={() => setSlots([...TIME_OPTIONS])}>All</button>
                <button type="button" onClick={() => setSlots([])}>Clear</button>
              </div>
            </div>
            <div className="av-times">
              {TIME_OPTIONS.map(t => {
                const on = slots.includes(t)
                const bookedBy = bookedSel[t]
                return (
                  <button
                    key={t}
                    type="button"
                    className={`av-time-row${on ? ' on' : ''}${bookedBy ? ' booked' : ''}`}
                    onClick={() => { if (!bookedBy) toggleSlot(t) }}
                    title={bookedBy ? `Reserved by ${bookedBy} on ${selShort}` : ''}
                  >
                    <span className="av-time-label"><Clock size={12} /> {t}</span>
                    {bookedBy
                      ? <span className="av-time-booked">Booked</span>
                      : <span className={`av-switch${on ? ' on' : ''}`}><span className="av-switch-knob" /></span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <button className="cal-save" onClick={save} disabled={saving}>
          {saved ? <><Check size={16} /> Saved</> : saving ? 'Saving…' : 'Save Availability'}
        </button>
      </div>
    </div>
  )
}
