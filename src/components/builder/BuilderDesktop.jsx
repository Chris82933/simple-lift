import { useEffect, useState } from 'react'
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
  const [selected, setSelected] = useState(0)
  // Days can be removed (or undone) from under us; a stale index would render
  // an empty editor next to a week strip that clearly has days in it.
  const di = Math.min(selected, Math.max(0, d.draft.days.length - 1))

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

      <div className="dtb-grid">
        <aside className="dtb-pane dtb-pane-left" aria-label="Program settings">
          <DesktopProgramPane d={d} />
        </aside>

        <main className="dtb-pane dtb-pane-center" aria-label="Training days">
          <DesktopWeekStrip
            d={d}
            selected={di}
            onSelect={setSelected}
            // Land on the day you just made — otherwise the library pane is
            // still pointed at whatever was selected before.
            onAddDay={() => { d.addDay(); setSelected(d.draft.days.length) }}
          />
          <DesktopDayEditor d={d} di={d.draft.days[di] ? di : null} info={info} />
        </main>

        <aside className="dtb-pane dtb-pane-right" aria-label="Exercise library">
          <DesktopLibraryPane d={d} di={d.draft.days[di] ? di : null} />
        </aside>
      </div>

      <div className="dtb-actions">
        <span className={'dtb-status' + (reasons.length ? ' is-blocked' : '')}>
          {reasons.length
            ? <>Before saving: {reasons.join('; ')}.</>
            : <>Ready to save · {d.draft.days.length} day(s), {d.totalExercises} exercise(s)</>}
        </span>
        <button type="button" className="btn btn-ghost" onClick={() => d.navigate(-1)}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={d.save} disabled={!d.canSave} title="Ctrl/Cmd + S">
          {d.editId ? 'Save changes' : 'Save program'}
        </button>
      </div>

      {info.dialogs}
    </section>
  )
}
