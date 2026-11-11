// Dates for logged and in-progress sessions.
//
// A history entry's `date` (an ISO timestamp) doubles as its id — see
// deleteWorkout / updateWorkout in storage.js — so a moved or back-dated
// session must never land on exactly the same timestamp as another one.

const pad = (n) => String(n).padStart(2, '0')

// ISO timestamp → the "YYYY-MM-DDTHH:mm" value a <input type="datetime-local">
// shows, in LOCAL time. '' for anything unparseable.
export function toLocalInput(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// A datetime-local value (local time) → ISO timestamp, or null when empty or
// invalid. The browser parses "YYYY-MM-DDTHH:mm" without a zone as local time.
export function fromLocalInput(value) {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// Same calendar day in LOCAL time.
export function sameLocalDay(a, b) {
  const x = new Date(a)
  const y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

// Never in the future: a session can't have happened later than now.
export function clampToNow(iso, now = Date.now()) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return new Date(now).toISOString()
  return new Date(Math.min(t, now)).toISOString()
}

// Nudge `iso` forward a millisecond at a time until no other session uses it
// (and back, if that would pass `now`). `taken` is an iterable of dates.
export function uniqueDate(iso, taken, now = Date.now()) {
  const used = new Set(taken)
  const t = new Date(iso).getTime()
  if (!used.has(iso)) return iso // free: keep it exactly as given
  if (Number.isNaN(t)) return iso
  const start = t
  for (let i = 1; i < 10000; i++) {
    const up = start + i
    if (up <= now && !used.has(new Date(up).toISOString())) return new Date(up).toISOString()
    const down = start - i
    if (!used.has(new Date(down).toISOString())) return new Date(down).toISOString()
  }
  return new Date(t).toISOString()
}

// "Today, 2:30 PM" / "Yesterday, 7:05 AM" / "Mon, Nov 9, 6:00 PM".
export function describeSessionDate(iso, now = Date.now()) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameLocalDay(d, now)) return `Today, ${time}`
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (sameLocalDay(d, y)) return `Yesterday, ${time}`
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
  return `${day}, ${time}`
}
