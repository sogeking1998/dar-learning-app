import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Clock, Check, CalendarDays } from 'lucide-react'
import { getBookedSlots } from '../calendarStore'

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function BookingModal({ conversation, onClose, onConfirm }) {
  const today = startOfDay(new Date())
  const slots = conversation.slots || []
  const availableDays = conversation.availableDays || []

  // A day is bookable if it's today or later AND falls on one of the admin's
  // available weekdays (0=Sun … 6=Sat).
  const isBookable = date =>
    !!date && date >= today && availableDays.includes(date.getDay())

  const [view, setView]     = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selDate, setSelDate] = useState(null)
  const [selSlot, setSelSlot] = useState(null)
  const [booked, setBooked] = useState([])   // slots already reserved on selDate

  // Load which slots are already taken whenever the selected day changes.
  useEffect(() => {
    if (!selDate) { setBooked([]); return }
    let active = true
    getBookedSlots(conversation.id, iso(selDate)).then(s => { if (active) setBooked(s) })
    return () => { active = false }
  }, [selDate, conversation.id])

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(startOfDay(new Date(year, month, d)))

  const availCount = cells.filter(isBookable).length
  const sameDay = (a, b) => a && b && a.getTime() === b.getTime()

  const canPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())

  const stepMonth = delta => {
    setView(new Date(year, month + delta, 1))
    setSelDate(null); setSelSlot(null)
  }

  const fmtFull = d =>
    d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="bk-overlay" onClick={onClose}>
      <div className="bk-modal" onClick={e => e.stopPropagation()}>
        <header className="bk-head">
          <div className="bk-head-info">
            <h3 className="bk-title">Book a Meeting</h3>
            <p className="bk-sub">with <strong>{conversation.name}</strong> · {conversation.role}</p>
          </div>
          <button className="bk-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="bk-avail">
          <CalendarDays size={14} />
          <span><strong>{availCount}</strong> open {availCount === 1 ? 'day' : 'days'} available in {MONTHS[month]}</span>
        </div>

        <div className="bk-body">
          {/* Calendar */}
          <div className="bk-cal">
            <div className="bk-cal-nav">
              <button onClick={() => stepMonth(-1)} disabled={!canPrev} aria-label="Previous month">
                <ChevronLeft size={18} />
              </button>
              <span className="bk-cal-month">{MONTHS[month]} {year}</span>
              <button onClick={() => stepMonth(1)} aria-label="Next month">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="bk-cal-grid bk-cal-weekdays">
              {WD_SHORT.map(d => <span key={d} className="bk-wd">{d}</span>)}
            </div>
            <div className="bk-cal-grid">
              {cells.map((date, i) => {
                if (!date) return <span key={`b${i}`} className="bk-day empty" />
                const bookable = isBookable(date)
                const selected = sameDay(date, selDate)
                const isToday = sameDay(date, today)
                return (
                  <button
                    key={date.getTime()}
                    className={`bk-day${bookable ? ' bookable' : ''}${selected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                    disabled={!bookable}
                    onClick={() => { setSelDate(date); setSelSlot(null) }}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <div className="bk-legend">
              <span><span className="bk-dot bookable" /> Available</span>
              <span><span className="bk-dot" /> Unavailable</span>
            </div>
          </div>

          {/* Slots */}
          <div className="bk-slots">
            {!selDate ? (
              <div className="bk-slots-empty">
                <Clock size={26} />
                <p>Select an available day to see open time slots.</p>
              </div>
            ) : (
              <>
                <p className="bk-slots-date">{fmtFull(selDate)}</p>
                <p className="bk-slots-label">Choose a time</p>
                <div className="bk-slot-list">
                  {slots.map(s => {
                    const taken = booked.includes(s)
                    return (
                      <button
                        key={s}
                        className={`bk-slot${selSlot === s ? ' selected' : ''}${taken ? ' taken' : ''}`}
                        onClick={() => !taken && setSelSlot(s)}
                        disabled={taken}
                      >
                        <Clock size={13} /> {s}
                        {taken && <span className="bk-slot-tag">Reserved</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="bk-foot">
          <div className="bk-summary">
            {selDate && selSlot
              ? <span><strong>{fmtFull(selDate)}</strong> at <strong>{selSlot}</strong></span>
              : <span className="bk-summary-hint">Pick a day and time to continue</span>}
          </div>
          <div className="bk-foot-btns">
            <button className="bk-btn bk-btn-cancel" onClick={onClose}>Cancel</button>
            <button
              className="bk-btn bk-btn-confirm"
              disabled={!selDate || !selSlot}
              onClick={() => onConfirm(selDate, selSlot)}
            >
              <Check size={15} /> Confirm Booking
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
