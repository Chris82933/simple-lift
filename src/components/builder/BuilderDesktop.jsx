import { useEffect, useRef, useState } from 'react'
import DesktopProgramPane from './DesktopProgramPane.jsx'
import DesktopWeekStrip from './DesktopWeekStrip.jsx'
import DesktopDayEditor from './DesktopDayEditor.jsx'
import DesktopLibraryPane from './DesktopLibraryPane.jsx'
import useInfoDialogs from './InfoDialogs.jsx'
import { exerciseErrors } from './draftLogic.js'

// Why Save is off, in words. The phone just greys the button out because there
// is no room for anything else; with a whole action bar to play with there is
// no excuse for making someone guess which of three things is wrong.
function blockers(draft) {
  const out = []
  if (!draft.name.trim()) out.push('give the program a name')
  if (!draft.days.some((d) => d.exercises.length > 0 || (d.cardio && d.cardio.length > 0))) {
    out.push('add at least one exercise or cardio block')
  }
  const bad = draft.days
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.exercises.some((e) => Object.keys(exerciseErrors(e)).length > 0))
  if (bad.length) out.push(`fix the highlighted numbers in ${bad.map(({ d, i }) => d.title.trim() || `day ${i + 1}`).join(', ')}`)
  return out
}

// The desktop program workspace: three panes that stay put. Program identity on
// the left, the week and the selected day's table in the middle, the exercise
// library on the right. Nothing here is a restyled phone card — the phone view
// is a separate component off the same draft hook (see useProgramDraft), so the
// two can be designed for their own screens without either constraining the
// other.
export default function BuilderDesktop({ d }) {
  const info = useInfoDialogs()
  // Selection is a day, not a slot: reordering the selected day must keep you
  // editing it, where an index would silently switch you to its neighbour.
  const [selectedUid, setSelectedUid] = useState(() => d.draft.days[0]?.uid)
  const found = d.draft.days.findIndex((x) => x.uid === selectedUid)
  const di = found >= 0 ? found : 0
  // The selected day can be removed (or a draft replaced) from under us; fall
  // to the day now sitting where it was rather than jumping back to day one.
  const lastIndex = useRef(0)
  useEffect(() => {
    if (found >= 0) { lastIndex.current = found; return }
    const days = d.draft.days
    if (days.length) setSelectedUid(days[Math.min(lastIndex.current, days.length - 1)].uid)
  }, [found, d.draft.days])

  useEffect(() => {
    // Ctrl/Cmd+S is muscle memory for anyone who builds anything on a computer,
    // and the browser's own "save this page" is never what they meant here.
    const onKey = (e) => {
      if (!(e.key === 's' && (e.metaKey || e.ctrlKey))) return
      e.preventDefault()
      d.save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [d])

  const reasons = blockers(d.draft)

  return (
    <section className="page full-flow dtb-page">
      <header className="dtb-head">
        <p className="eyebrow">{d.editId ? 'Edit program' : 'New custom program'}</p>
        <h1>{d.draft.name.trim() || 'Build your program'}</h1>
        <span className="muted small">{d.draft.days.length} day(s) · {d.totalExercises} exercise(s)</span>
      </header>

      {/* First in the DOM, last on screen (grid-row in the stylesheet). Tab order
          follows the DOM, and Save used to sit behind every button in the
          library — 300-odd tab stops away. */}
      <div className="dtb-actions">
        <span className={'dtb-status' + (reasons.length ? ' is-blocked' : '')}>
          {reasons.length
            ? <>Before saving: {reasons.join('; ')}.</>
            : <>Ready to save · {d.draft.days.length} day(s), {d.totalExercises} exercise(s)</>}
        </span>
        <button type="button" className="btn btn-ghost" onClick={d.cancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={d.save} disabled={!d.canSave} title="Ctrl/Cmd + S">
          {d.editId ? 'Save changes' : 'Save program'}
        </button>
      </div>

      <div className="dtb-grid">
        <aside className="dtb-pane dtb-pane-left" aria-label="Program settings">
          <DesktopProgramPane d={d} />
        </aside>

        <main className="dtb-pane dtb-pane-center" aria-label="Training days">
          <DesktopWeekStrip
            d={d}
            selected={di}
            onSelect={(i) => setSelectedUid(d.draft.days[i]?.uid)}
            // Land on the day you just made — otherwise the library pane is
            // still pointed at whatever was selected before.
            onAddDay={() => setSelectedUid(d.addDay())}
          />
          {/* The week stays put; only the day underneath it scrolls. */}
          <div className="dtb-day-scroll">
            <DesktopDayEditor d={d} di={d.draft.days[di] ? di : null} info={info} />
          </div>
        </main>

        <aside className="dtb-pane dtb-pane-right" aria-label="Exercise library">
          <DesktopLibraryPane d={d} di={d.draft.days[di] ? di : null} />
        </aside>
      </div>

      {info.dialogs}
    </section>
  )
}
