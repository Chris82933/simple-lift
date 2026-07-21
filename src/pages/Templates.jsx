import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TEMPLATES, instantiateTemplate } from '../data/templates.js'
import { addProgram, getMax, loadSettings } from '../lib/storage.js'
import { weightForReps, incrementForUnits } from '../lib/oneRepMax.js'
import { sessionLengthLabel } from '../lib/duration.js'
import { trainingMaxFrom } from '../lib/fiveThreeOne.js'
import { REGIONS } from '../data/options.js'

// Conservative starting reps per GZCLP tier (heavier T1, lighter accessory).
const TIER_START_REPS = { t1: 5, t2: 10, t3: 15 }

const REGION_LABEL = Object.fromEntries(REGIONS.map((r) => [r.id, r.label]))

// Which parts of the body a program actually trains, most-covered first, so the
// collapsed card can answer "what does this hit?" without opening it.
function targetSummary(t) {
  // Coverage counts every region an exercise touches; emphasis counts only the
  // PRIMARY mover. Weighting them equally made a bench press vote for "arms" as
  // loudly as for "chest", which had Starting Strength reading as core-focused.
  const covered = new Set()
  const primary = {}
  let total = 0
  for (const day of t.days) {
    for (const ex of day.exercises) {
      for (const r of ex.regions || []) covered.add(r)
      const main = (ex.regions || [])[0]
      if (main) { primary[main] = (primary[main] || 0) + 1; total++ }
    }
  }
  const label = (id) => REGION_LABEL[id] || id
  const ranked = Object.entries(primary).sort((a, b) => b[1] - a[1])
  if (covered.size < 5) return ranked.slice(0, 3).map(([id]) => label(id)).join(' · ')
  const [topId, topCount] = ranked[0] || []
  return topId && topCount / total >= 0.4
    ? `Full body · ${label(topId).toLowerCase()} focus`
    : 'Full body'
}

const daysPerWeek = (t) => t.schedule?.trainingDays?.length || t.days.length

function TemplateCard({ t, open, onToggle, onUse }) {
  return (
    <div className={'card template-card' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="template-summary"
        onClick={onToggle}
        aria-expanded={open}
      >
        <div className="template-head">
          <p className="day-title">{t.name}</p>
          <span className={'collapse-chevron' + (open ? ' is-open' : '')} aria-hidden="true">▾</span>
        </div>
        <div className="template-facts">
          {t.level && <span className="level-chip">{t.level}</span>}
          <span className="fact">🕒 {sessionLengthLabel(t)}</span>
          <span className="fact">📅 {daysPerWeek(t)}×/wk</span>
        </div>
        <p className="muted small template-gist">
          <strong>{t.bestFor}</strong> · {targetSummary(t)}
        </p>
      </button>

      {open && (
        <div className="template-detail">
          <div className="tag-row">
            {t.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
          <p className="muted small">{t.description}</p>
          <p className="muted small"><strong>Needs:</strong> {t.equipment}</p>
          <p className="muted small">
            <strong>Workouts:</strong> {t.days.map((d) => d.title).join(', ')}
          </p>
          {t.progressionInfo && (
            <p className="muted small progression-info">
              📈 <strong>How you progress:</strong> {t.progressionInfo}
            </p>
          )}

          {(t.pros || t.cons) && (
            <div className="proscons">
              {t.pros && <ul className="pros">{t.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>}
              {t.cons && <ul className="cons">{t.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>}
            </div>
          )}

          {t.setupPath ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => onUse(t, true)}>
                {t.setupLabel || 'Set this up'}
              </button>
              <p className="muted small">A few questions and we&apos;ll work out every starting weight for you.</p>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => onUse(t, false)}>
              Use this program
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Templates() {
  const navigate = useNavigate()
  // Collapsed by default — eleven fully expanded programs was a very long scroll.
  const [openId, setOpenId] = useState(null)

  const use = (t, isWizard) => {
    if (isWizard) { navigate(t.setupPath); return }
    const program = instantiateTemplate(t.templateId)
    if (!program) return

    // Prefill scheme-based starting weights from any saved 1RMs.
    const inc = incrementForUnits(loadSettings().units)
    for (const day of program.days) {
      for (const ex of day.exercises) {
        if (!ex.progression) continue
        const max = getMax(ex.id)
        if (!max) continue
        if (ex.progression.scheme === '531') {
          // 5/3/1 runs off a training max — deliberately 90% of a true 1RM, not
          // the 1RM itself. Everything else is a percentage of that.
          ex.progression.tm = trainingMaxFrom(max.oneRM, loadSettings().units)
        } else {
          const repsTarget = TIER_START_REPS[ex.progression.scheme] || ex.repHigh
          ex.progression.weight = weightForReps(max.oneRM, repsTarget, inc)
          ex.startWeight = ex.progression.weight
        }
      }
    }

    addProgram(program) // becomes active
    navigate('/schedule') // let them set their training days
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Templates</h1>
        <p className="muted">
          Proven programs, ready to load. Tap one to see the full details — you can tweak everything after.
        </p>
      </header>

      {TEMPLATES.map((t) => (
        <TemplateCard
          key={t.templateId}
          t={t}
          open={openId === t.templateId}
          // One open at a time keeps the page scannable.
          onToggle={() => setOpenId((id) => (id === t.templateId ? null : t.templateId))}
          onUse={use}
        />
      ))}
    </section>
  )
}
