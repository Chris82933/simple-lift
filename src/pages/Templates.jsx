import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TEMPLATE_BY_ID } from '../data/templates.js'
import { PROGRAM_GROUPS, PROGRAM_SUBTITLES, EQUIP_FILTERS, matchesFilter, matchesSearch } from '../data/programCatalog.js'
import { sessionLengthLabel } from '../lib/duration.js'
import { REGIONS } from '../data/options.js'
import SkillTreeCard from '../components/SkillTreeCard.jsx'
import ProgramSetupSheet from '../components/ProgramSetupSheet.jsx'
import { useToast } from '../components/Toast.jsx'

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
  const subtitle = PROGRAM_SUBTITLES[t.templateId]
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
        {subtitle && <p className="muted small template-subtitle">{subtitle}</p>}
        <div className="template-facts">
          {t.level && <span className="level-chip">{t.level}</span>}
          <span className="fact">{sessionLengthLabel(t)}</span>
          <span className="fact">{daysPerWeek(t)}×/wk</span>
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
              <strong>How you progress:</strong> {t.progressionInfo}
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
              <button type="button" className="btn btn-primary" onClick={() => onUse(t)}>
                {t.setupLabel || 'Set this up'}
              </button>
              <p className="muted small">Answers a few questions first, then works out every starting weight for you.</p>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => onUse(t)}>
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
  const toast = useToast()
  // Collapsed by default — fifteen fully expanded programs is a very long scroll.
  const [openId, setOpenId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [setupId, setSetupId] = useState(null)

  const visible = (t) => matchesFilter(t, filter) && matchesSearch(t, query)
  const groups = PROGRAM_GROUPS
    .map((g) => ({ ...g, programs: g.ids.map((id) => TEMPLATE_BY_ID[id]).filter((t) => t && visible(t)) }))
    .filter((g) => g.programs.length > 0 || (g.skillTree && (filter === 'all' || filter === 'bodyweight') && !query))
  const narrowed = filter !== 'all' || query.trim() !== ''

  const use = (t) => {
    if (t.setupPath) { navigate(t.setupPath); return }
    setSetupId(t.templateId)
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Find a program</h1>
        <p className="muted">
          Proven programs, grouped by what they&apos;re for. Tap one for the details — you can change anything after.
        </p>
      </header>

      <div className="card notice help-choose">
        <div>
          <p className="choice-title">Not sure which?</p>
          <p className="muted small">Answer five quick questions and we&apos;ll pick one for you.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/onboarding')}>Help me choose</button>
      </div>

      <div className="program-search">
        <input
          type="search"
          className="text-input"
          placeholder="Search by name — e.g. 5/3/1, StrongLifts"
          aria-label="Search programs"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpenId(null) }}
        />
      </div>

      <div className="filter-chips" role="group" aria-label="Filter by equipment">
        {EQUIP_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={'chip' + (filter === f.id ? ' is-selected' : '')}
            aria-pressed={filter === f.id}
            onClick={() => { setFilter(f.id); setOpenId(null) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.map((g) => [
        <div className="program-group-head" key={`h-${g.id}`}>
          <h2 className="group-label">{g.label}</h2>
          {!narrowed && <p className="muted small">{g.blurb}</p>}
        </div>,
        ...g.programs.map((t) => (
          <TemplateCard
            key={t.templateId}
            t={t}
            open={openId === t.templateId}
            // One open at a time keeps the page scannable.
            onToggle={() => setOpenId((id) => (id === t.templateId ? null : t.templateId))}
            onUse={use}
          />
        )),
        g.skillTree && (filter === 'all' || filter === 'bodyweight') && !query ? <SkillTreeCard key="skill-tree" /> : null,
      ])}

      {groups.length === 0 && (
        <p className="muted small">Nothing matches that. Try another search, or “All”.</p>
      )}

      <div className="program-group-head">
        <h2 className="group-label">Make your own</h2>
        <p className="muted small">
          <button type="button" className="link-btn" onClick={() => navigate('/builder')}>Build a program from scratch</button>
          {' · '}
          <button type="button" className="link-btn" onClick={() => navigate('/import-program')}>Import one (share code or pasted text)</button>
        </p>
      </div>

      {setupId && (
        <ProgramSetupSheet
          templateId={setupId}
          onCancel={() => setSetupId(null)}
          onStarted={(p) => {
            setSetupId(null)
            toast.show(`${p.name} is ready — it’s your active program`)
            navigate('/today')
          }}
        />
      )}
    </section>
  )
}
