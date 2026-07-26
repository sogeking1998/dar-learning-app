import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Clock, Check, CalendarDays } from 'lucide-react'
import { getBookedSlots, endOf, GRID } from '../calendarStore'

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function BookingModal({ conversation, onClose, onConfirm }) {
  const today = startOfDay(new Date())
  const defaultSlots = conversation.slots || []
  const dateSlots = conversation.dateSlots || {}
  const availableDays = conversation.availableDays || []

  // A day is bookable if it's today or later AND falls on one of the admin's
  // available weekdays (0=Sun … 6=Sat).
  const isBookable = date =>
    !!date && date >= today && availableDays.includes(date.getDay())

  const [view, setView]     = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selDate, setSelDate] = useState(null)
  const [selStart, setSelStart] = useState(null) // slot index
  const [selEnd, setSelEnd]     = useState(null) // slot index (meeting ends AT this time)
  const [booked, setBooked] = useState([])       // slots/ranges already reserved on selDate

  const clearRange = () => { setSelStart(null); setSelEnd(null) }

  // Load which slots are already taken whenever the selected day changes.
  useEffect(() => {
    if (!selDate) { setBooked([]); return }
    let active = true
    getBookedSlots(conversation.id, iso(selDate)).then(s => { if (active) setBooked(s) })
    return () => { active = false }
  }, [selDate, conversation.id])

  // Open hours for the chosen date: its per-date override if the admin set one,
  // otherwise the default template. An empty override means no hours that day.
  // Each entry is a 30-min block START time → the row [t, endOf(t)].
  const slots = selDate ? (dateSlots[iso(selDate)] ?? defaultSlots) : defaultSlots
  const blocks = slots.map(t => ({ start: t, end: endOf(t), gi: GRID.indexOf(t) }))

  // Mark which blocks are already booked. A booking "9:00 AM – 10:30 AM" (or a
  // legacy single "9:00 AM") covers the grid range [A, B); any open block whose
  // start falls inside that range is occupied.
  const occupied = new Set()
  booked.forEach(b => {
    const parts = String(b).split('–').map(x => x.trim())
    const a = GRID.indexOf(parts[0])
    if (a < 0) return
    const z = parts[1] ? GRID.indexOf(parts[1]) : a + 1
    blocks.forEach((bl, idx) => { if (bl.gi >= a && bl.gi < z) occupied.add(idx) })
  })

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
    setSelDate(null); clearRange()
  }

  const fmtFull = d =>
    d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  // selStart/selEnd are indices into `blocks`, both inclusive: a single click
  // books one 30-min block; clicking a later block extends the meeting to cover
  // every block from start to end.
  const pickSlot = i => {
    if (occupied.has(i)) return                                   // can't book a reserved block
    if (selStart === null || selEnd !== null) { setSelStart(i); setSelEnd(null); return }
    if (i === selStart) { clearRange(); return }                  // tapping it again clears
    if (i < selStart) { setSelStart(i); setSelEnd(null); return } // earlier block → new start
    // Later block → extend, but only across blocks that are free AND back-to-back
    // in time (no gap, e.g. can't span a lunch break).
    for (let k = selStart + 1; k <= i; k++)
      if (occupied.has(k) || blocks[k].gi !== blocks[k - 1].gi + 1) { setSelStart(i); setSelEnd(null); return }
    setSelEnd(i)
  }

  // The meeting runs from the start block's start time to the end block's end time.
  const endBlock = selEnd !== null ? selEnd : selStart
  const rangeLabel = selStart !== null ? `${blocks[selStart].start} – ${blocks[endBlock].end}` : null

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
                    onClick={() => { setSelDate(date); clearRange() }}
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

          {/* Slots — 30-min blocks; click one, or click a later one to extend */}
          <div className="bk-slots">
            {!selDate ? (
              <div className="bk-slots-empty">
                <Clock size={26} />
                <p>Select an available day to choose a meeting time.</p>
              </div>
            ) : (
              blocks.length === 0 ? (
                <div className="bk-slots-empty">
                  <Clock size={26} />
                  <p>No open times on this day. Please pick another date.</p>
                </div>
              ) : (
              <>
                <p className="bk-slots-date">{fmtFull(selDate)}</p>
                <p className="bk-slots-label">
                  {selStart === null
                    ? 'Tap a time slot'
                    : selEnd === null
                      ? 'Slot selected — tap a later slot to extend, or confirm'
                      : 'Meeting time selected'}
                </p>
                <div className="bk-slot-list">
                  {blocks.map((bl, i) => {
                    const taken = occupied.has(i)
                    const isStart = i === selStart
                    const isEnd = selEnd !== null && i === selEnd
                    const single = isStart && selEnd === null
                    const inRange = selEnd !== null && i > selStart && i < selEnd
                    return (
                      <button
                        key={bl.start}
                        className={`bk-slot${isStart || isEnd ? ' selected' : ''}${inRange ? ' inrange' : ''}${taken ? ' taken' : ''}`}
                        onClick={() => pickSlot(i)}
                        disabled={taken}
                      >
                        <Clock size={13} /> {bl.start} – {bl.end}
                        {single && <span className="bk-slot-tag bk-tag-se">Selected</span>}
                        {isStart && selEnd !== null && <span className="bk-slot-tag bk-tag-se">Start</span>}
                        {isEnd && <span className="bk-slot-tag bk-tag-se">End</span>}
                        {taken && <span className="bk-slot-tag">Reserved</span>}
                      </button>
                    )
                  })}
                </div>
              </>
              )
            )}
          </div>
        </div>

        <footer className="bk-foot">
          <div className="bk-summary">
            {selDate && rangeLabel
              ? <span><strong>{fmtFull(selDate)}</strong> · <strong>{rangeLabel}</strong></span>
              : <span className="bk-summary-hint">Pick a day, then a time slot</span>}
          </div>
          <div className="bk-foot-btns">
            <button className="bk-btn bk-btn-cancel" onClick={onClose}>Cancel</button>
            <button
              className="bk-btn bk-btn-confirm"
              disabled={!selDate || !rangeLabel}
              onClick={() => onConfirm(selDate, rangeLabel)}
            >
              <Check size={15} /> Confirm Booking
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
