import { PROGRESSION_METHODS, DEFAULT_METHOD } from '../../lib/progressionMethods.js'
import { GOALS } from '../../data/options.js'
import { toggle } from './draftLogic.js'

// Left pane: everything that is true of the program as a whole rather than of
// one session. It stays on screen while you edit days, because the goal you
// picked is what the sets/reps defaults are derived from — on the phone that
// connection is two screens of scrolling away.
export default function DesktopProgramPane({ d }) {
  const method = PROGRESSION_METHODS.find((x) => x.id === (d.draft.progressionMethod || DEFAULT_METHOD))

  return (
    <div className="dtb-program">
      <label className="dtb-field">
        <span className="group-label">Program name</span>
        <input
          className="text-input"
          placeholder="e.g. Chris’ Strength Block"
          value={d.draft.name}
          onChange={(e) => d.update({ name: e.target.value })}
        />
      </label>

      <p className="group-label">Goal (drives growth suggestions)</p>
      <div className="check-grid">
        {GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={'check-pill' + (d.draft.goals.includes(g.id) ? ' is-selected' : '')}
            onClick={() => d.update({ goals: toggle(d.draft.goals, g.id) })}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p className="muted small">
        Sets, reps &amp; rest auto-fill per move — heavy compounds get low reps and long rest, isolation and core get higher reps. Starting weights fill from your saved 1RMs.{' '}
        <button type="button" className="link-btn" onClick={() => d.navigate('/one-rep-max')}>Find your maxes</button>
      </p>

      <p className="group-label">How do you want to progress?</p>
      <div className="choice-list">
        {PROGRESSION_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={'choice-row' + ((d.draft.progressionMethod || DEFAULT_METHOD) === m.id ? ' is-selected' : '')}
            onClick={() => d.update({ progressionMethod: m.id })}
          >
            <span className="choice-title">
              {m.name}{m.recommended && <span className="rec-badge">Recommended</span>}
            </span>
            <span className="muted small">{m.tagline}</span>
          </button>
        ))}
      </div>
      <div className="method-detail">
        <p className="muted small">{method.how}</p>
        <div className="proscons">
          <ul className="pros">{method.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
          <ul className="cons">{method.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      </div>
      <p className="muted small deload-tip">
        <strong>Deload tip:</strong> every 4–6 weeks, take one lighter week — cut your working weight ~10% (or drop a set or two) and keep reps well short of failure. It clears fatigue so you come back stronger.
      </p>
    </div>
  )
}
