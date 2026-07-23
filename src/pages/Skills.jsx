import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadSkills, updateSkill, isSkillTreeAdded, setSkillTreeAdded } from '../lib/storage.js'
import {
  SKILLS, computeStats, powerLevel, rankFor, calibrateLevel, readyToAdvance, maxIndex,
  planLabel, advanceLabel,
} from '../data/skills.js'
import SkillRadar from '../components/SkillRadar.jsx'
import SkillFigure from '../components/SkillFigure.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'
import FocusTiles from '../components/FocusTiles.jsx'

export default function Skills() {
  const navigate = useNavigate()
  const [skills, setSkills] = useState(() => loadSkills())
  const [drafts, setDrafts] = useState({}) // per-skill log input
  const [flash, setFlash] = useState(null) // { id, best } — transient "saved" feedback
  const flashTimer = useRef()
  const [calOpen, setCalOpen] = useState(false)
  const [answers, setAnswers] = useState({})
  // Whether the user has added the skill tree to their programs (it's opt-in).
  const [added, setAdded] = useState(() => isSkillTreeAdded())

  const addTree = () => { setSkillTreeAdded(true); setAdded(true) }
  const removeTree = () => { setSkillTreeAdded(false); navigate('/today') }

  // Quick +/- on the log input (step by 1 rep, or 5 seconds for holds).
  const bump = (sk, dir) => setDrafts((d) => {
    const step = sk.type === 'hold' ? 5 : 1
    const next = Math.max(0, (Number(d[sk.id]) || 0) + dir * step)
    return { ...d, [sk.id]: String(next) }
  })

  const stats = computeStats(skills)
  const baseline = computeStats(skills, 'baseline')
  const power = powerLevel(stats)
  const rank = rankFor(power)
  const started = Object.keys(skills).length > 0
  const grown = stats.some((s, i) => s.value > baseline[i].value)

  const logSkill = (sk) => {
    const v = Number(drafts[sk.id]) || 0
    if (v <= 0) return
    const cur = skills[sk.id] || { level: 0, best: 0, log: [] }
    const isBest = v > (cur.best || 0)
    const best = Math.max(cur.best || 0, v)
    setSkills(updateSkill(sk.id, {
      level: cur.level || 0,
      best,
      log: [...(cur.log || []).slice(-24), { date: new Date().toISOString(), value: v }],
    }))
    setDrafts((d) => ({ ...d, [sk.id]: '' }))
    setFlash({ id: sk.id, best: isBest })
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 1800)
  }

  const advance = (sk) => {
    const cur = skills[sk.id] || { level: 0 }
    setSkills(updateSkill(sk.id, { level: Math.min(maxIndex(sk), (cur.level || 0) + 1), best: 0 }))
  }
  const stepDown = (sk) => {
    const cur = skills[sk.id] || { level: 0 }
    setSkills(updateSkill(sk.id, { level: Math.max(0, (cur.level || 0) - 1), best: 0 }))
  }

  const applyCalibration = () => {
    let next = skills
    for (const sk of SKILLS) {
      const raw = answers[sk.id]
      if (raw === undefined || raw === '') continue
      // Record the calibrated level as the baseline too — the radar's grey shape
      // is your starting point; progress pushes the accent shape past it.
      const lvl = calibrateLevel(sk, raw)
      next = updateSkill(sk.id, { level: lvl, baseline: lvl, best: 0, log: skills[sk.id]?.log || [] })
    }
    setSkills(next)
    setCalOpen(false)
    setAnswers({})
  }

  return (
    <section className="page full-flow">
      <header className="page-header">
        <div className="workout-head-row">
          <p className="eyebrow">🤸 Calisthenics</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/today')}>Done</button>
        </div>
        <h1>Skill tree</h1>
      </header>

      <div className="step-body">
        <FocusTiles current="skills" />

        {!added && (
          <div className="card notice">
            <p className="placeholder-title">🤸 Add this to your programs</p>
            <p className="muted small">
              The skill tree is a fun extra, not a full workout program. Add it and it&apos;ll appear
              alongside your programs; you can remove it anytime and your progress is kept.
            </p>
            <button type="button" className="btn btn-primary" onClick={addTree}>➕ Add skill tree</button>
          </div>
        )}

        {/* ---- Character sheet ---- */}
        <div className="card char-sheet">
          <SkillRadar stats={stats} baseline={baseline} />
          <div className="char-meta">
            <p className="power-level">{power}</p>
            <p className="power-label">Power level</p>
            <p className="rank-badge">{rank}</p>
          </div>
          {started && (
            <p className="radar-legend">
              <span className="swatch now" /> now
              <span className="swatch start" /> start{grown ? ' · look how far you’ve come 💪' : ''}
            </p>
          )}
        </div>

        <button type="button" className="btn btn-primary" onClick={() => { setAnswers({}); setCalOpen(true) }}>
          🎯 {started ? 'Re-check my levels' : 'Find my levels'}
        </button>
        {!started && (
          <p className="muted small">Answer a few quick questions and we&apos;ll set each skill to the right starting level.</p>
        )}

        {/* ---- Skills ---- */}
        {SKILLS.map((sk) => {
          const cur = skills[sk.id] || { level: 0, best: 0 }
          // Clamp so stale/overflow data can never index past the last level.
          const idx = Math.min(Math.max(0, cur.level || 0), maxIndex(sk))
          const level = sk.levels[idx]
          const best = cur.best || 0
          const ready = readyToAdvance(sk, idx, best)
          const atTop = idx >= maxIndex(sk)
          const mastered = atTop && best >= level.hi
          const pct = Math.min(100, Math.round((100 * best) / level.hi))
          const fl = flash && flash.id === sk.id
          return (
            <div className={'card skill-card' + (ready ? ' is-ready' : '')} key={sk.id}>
              <div className="skill-head">
                <SkillFigure pose={sk.id} size={52} />
                <div className="skill-headings">
                  <p className="ex-name big">{level.name}</p>
                  <p className="muted small">{sk.name} · Level {idx + 1}/{sk.levels.length}</p>
                </div>
                <FormCheckButton name={level.name} />
              </div>

              <div className="level-dots" aria-hidden="true">
                {sk.levels.map((_, i) => <span key={i} className={'level-dot' + (i <= idx ? ' on' : '')} />)}
              </div>

              <p className="cue">💡 {level.cues}</p>
              <p className="plan-line">📋 Do <strong>{planLabel(sk, level)}</strong></p>
              {mastered ? (
                <p className="suggestion">🏆 Skill mastered — you own the hardest level.</p>
              ) : atTop ? (
                <p className="suggestion">🎯 Top level. Hit <strong>{advanceLabel(sk, level)}</strong> to master it.</p>
              ) : (
                <p className="suggestion">🎯 Advance when you hit <strong>{advanceLabel(sk, level)}</strong> → {sk.levels[idx + 1].name}</p>
              )}

              <div className="skill-log">
                <span className="skill-log-label">Best {sk.type === 'hold' ? 'hold' : 'set'} today</span>
                <div className="rep-stepper">
                  <button type="button" onClick={() => bump(sk, -1)} aria-label={`less ${sk.unit}`}>−</button>
                  <input
                    className="set-input"
                    type="number"
                    inputMode="numeric"
                    placeholder={sk.unit}
                    value={drafts[sk.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [sk.id]: e.target.value }))}
                  />
                  <button type="button" onClick={() => bump(sk, 1)} aria-label={`more ${sk.unit}`}>+</button>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => logSkill(sk)}>Save</button>
                {fl && <span className="save-flash">{flash.best ? 'New best! 🎉' : 'Saved ✓'}</span>}
              </div>

              <div className="skill-progress">
                <div className="progress-track" aria-hidden="true">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="muted small">Best {best}/{level.hi}{sk.type === 'hold' ? 's' : ''} · goal {advanceLabel(sk, level)}</span>
              </div>

              {ready && (
                <button type="button" className="btn btn-primary btn-sm advance-btn" onClick={() => advance(sk)}>
                  🎉 You hit the goal — advance to {sk.levels[idx + 1].name} →
                </button>
              )}
              {idx > 0 && (
                <button type="button" className="link-btn" onClick={() => stepDown(sk)}>← too hard? drop a level</button>
              )}
            </div>
          )
        })}
      </div>

      {added && (
        <button type="button" className="link-btn skill-remove" onClick={removeTree}>
          Remove skill tree from my programs
        </button>
      )}

      <div className="flow-actions">
        <button className="btn btn-primary" onClick={() => navigate('/today')}>Done</button>
      </div>

      {/* ---- Calibration quiz ---- */}
      {calOpen && (
        <div className="picker-overlay" role="dialog" aria-label="Find my levels">
          <div className="picker-sheet">
            <div className="picker-head">
              <p className="ex-name big" style={{ flex: 1 }}>🎯 Find my levels</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCalOpen(false)}>Cancel</button>
            </div>
            <div className="picker-list">
              <p className="muted small">Answer what you can — leave the rest blank. We&apos;ll set each skill to the right level.</p>
              {SKILLS.map((sk) => (
                <div className="cal-row" key={sk.id}>
                  <label className="cal-q">
                    <span className="cal-label"><SkillFigure pose={sk.id} size={30} /> {sk.benchmark}</span>
                    <input
                      className="set-input"
                      type="number"
                      inputMode="numeric"
                      placeholder={sk.unit}
                      value={answers[sk.id] ?? ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [sk.id]: e.target.value }))}
                    />
                  </label>
                </div>
              ))}
              <button type="button" className="btn btn-primary" onClick={applyCalibration}>Set my levels</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
