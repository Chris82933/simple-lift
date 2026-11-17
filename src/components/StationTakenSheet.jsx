import { useRef, useState } from 'react'
import useModalA11y from '../lib/useModalA11y.js'
import { CONF_LABEL } from '../lib/swapTranslate.js'
import { equipmentLabel } from '../lib/equipment.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'

// What a stand-in's prescription will be, in one line: "5 × 5 @ ~245 lb",
// "4 × 8 @ ~70 lb per dumbbell", "3 × 12 (by feel)".
function prescriptionLine({ sets, reps, t, units, unitWord = 'reps' }) {
  const head = `${sets} × ${reps}${unitWord === 'reps' ? '' : ` ${unitWord}`}`
  if (t.weight == null) return `${head} · pick a weight that feels right`
  const each = t.perHand ? ` per ${t.per || 'dumbbell'}` : ''
  const cap = t.capped ? ' (your heaviest)' : ''
  return `${head} @ ~${t.weight} ${units}${each}${cap}`
}

// Short gear names: the setup list's "Selectorized machines (chest press, hip
// abduction, pec deck…)" is far too long for a row.
const SHORT = { machines: 'Machine', leg_press: 'Leg press', smith: 'Smith machine', cable: 'Cable', lat_pulldown: 'Pulldown', leg_curl_ext: 'Leg machine', rack: 'Rack', trap_bar: 'Trap bar', ez_bar: 'EZ bar' }
const gearText = (lib) => (lib.requires || []).filter((r) => !['flat_bench', 'adj_bench', 'plates'].includes(r)).map((r) => SHORT[r] || equipmentLabel(r)).join(', ') || 'Bodyweight'

// Station taken: do it later, swap to an equivalent with the weight
// translated, or mark the station busy for the rest of the session.
export default function StationTakenSheet({
  ex, station, rootName, planned, remaining, done, units, options,
  canLater, inSuperset, isBusy, busyOthers, onLater, onSwap, onToggleBusy, onSwapAll, onSkip, onClose,
}) {
  const ref = useRef(null)
  useModalA11y(ref, onClose)
  const [more, setMore] = useState(false)
  const shown = more ? options : options.slice(0, 4)
  const title = `${station?.label || 'Equipment'} taken?`
  const planLine = planned.weight > 0
    ? `${ex.name} · ${remaining} × ${planned.reps} @ ${planned.weight} ${units}`
    : `${ex.name} · ${remaining} × ${planned.reps}`
  const estimated = options.some((o) => o.t.weight != null && o.t.conf !== 'H')

  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
      <div className="picker-sheet taken-sheet">
        <div className="picker-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="ex-name big">{title}</p>
            <p className="muted small taken-sub">
              {planLine}
              {done > 0 && <><br />{done} set{done === 1 ? '' : 's'} done · swap the last {remaining}</>}
              {inSuperset && <><br />In a superset</>}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><span aria-hidden="true">✕</span></button>
        </div>

        <div className="picker-list taken-list">
          {canLater && (
            <button type="button" className="taken-row" onClick={onLater}>
              <span className="taken-row-main"><strong>Do it later</strong></span>
              <span className="muted small">Move it to the end of today&apos;s session</span>
            </button>
          )}

          {options.length > 0 ? (
            <>
              <p className="group-label taken-label">Swap for today</p>
              {shown.map((o) => (
                <button type="button" className="taken-row" key={o.lib.id} onClick={() => onSwap(o)}>
                  <span className="taken-row-main">
                    <strong>{o.lib.name}</strong>
                    <span className={'taken-conf is-' + o.t.conf}>{CONF_LABEL[o.t.conf]}</span>
                  </span>
                  <span className="muted small">{gearText(EXERCISE_BY_ID[o.lib.id] || o.lib)}</span>
                  <span className="taken-rx">{prescriptionLine({ sets: remaining, reps: o.t.reps || planned.reps, t: o.t, units })}</span>
                </button>
              ))}
              {!more && options.length > 4 && (
                <button type="button" className="link-btn taken-more" onClick={() => setMore(true)}>Show {options.length - 4} more</button>
              )}
              {estimated && <p className="muted small taken-foot">~ is an estimate from your {rootName}. Machines vary — the first set is a lighter feeler.</p>}
            </>
          ) : (
            <div className="taken-empty">
              <p className="muted small">No good stand-in with your gear here.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onSkip}>Skip it today</button>
            </div>
          )}

          {station && (
            <div className="taken-busy">
              <button type="button" className={'taken-row' + (isBusy ? ' is-on' : '')} aria-pressed={isBusy} onClick={onToggleBusy}>
                <span className="taken-row-main"><strong>{isBusy ? `${station.label} marked busy` : `Mark ${station.label.toLowerCase()} busy`}</strong></span>
                <span className="muted small">
                  {busyOthers.length
                    ? `Also needed for ${busyOthers.join(', ')} later today`
                    : 'Nothing else today needs it'}
                </span>
              </button>
              {isBusy && busyOthers.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onSwapAll}>
                  {busyOthers.length === 1 ? 'Swap both' : `Swap all ${busyOthers.length + 1}`} off the {station.label.toLowerCase()}
                </button>
              )}
            </div>
          )}
        </div>
        <p className="muted small taken-note">Swaps are for today only. Your program doesn&apos;t change.</p>
      </div>
    </div>
  )
}
