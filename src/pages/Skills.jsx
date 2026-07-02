import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadSkills, updateSkill } from '../lib/storage.js'
import {
  SKILLS, computeStats, powerLevel, rankFor, calibrateLevel, readyToAdvance, maxIndex,
} from '../data/skills.js'
import SkillRadar from '../components/SkillRadar.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'

export default function Skills() {
  const navigate = useNavigate()
  const [skills, setSkills] = useState(() => loadSkills())
  const [drafts, setDrafts] = useState({}) // per-skill log input
  const [calOpen, setCalOpen] = useState(false)
  const [answers, setAnswers] = useState({})

  const stats = computeStats(skills)
  const power = powerLevel(stats)
  const rank = rankFor(power)
  const started = Object.keys(skills).length > 0

  const logSkill = (sk) => {
    const v = Number(drafts[sk.id]) || 0
    if (v <= 0) return
    const cur = skills[sk.id] || { level: 0, best: 0, log: [] }
    const best = Math.max(cur.best || 0, v)
    setSkills(updateSkill(sk.id, {
      level: cur.level || 0,
      best,
      log: [...(cur.log || []).slice(-24), { date: new Date().toISOString(), value: v }],
    }))
    setDrafts((d) => ({ ...d, [sk.id]: '' }))
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
      next = updateSkill(sk.id, { level: calibrateLevel(sk, raw), best: 0, log: skills[sk.id]?.log || [] })
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
        {/* ---- Character sheet ---- */}
        <div className="card char-sheet">
          <SkillRadar stats={stats} />
          <div className="char-meta">
            <p className="power-level">{power}</p>
            <p className="power-label">Power level</p>
            <p className="rank-badge">{rank}</p>
          </div>
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
          const idx = cur.level || 0
          const level = sk.levels[idx]
          const best = cur.best || 0
          const ready = readyToAdvance(sk, idx, best)
          const atTop = idx >= maxIndex(sk)
          const mastered = atTop && best >= level.target
          return (
            <div className={'card skill-card' + (ready ? ' is-ready' : '')} key={sk.id}>
              <div className="skill-head">
                <span className="skill-emoji" aria-hidden="true">{sk.emoji}</span>
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
              {mastered
                ? <p className="suggestion">🏆 Skill mastered — you own the hardest level.</p>
                : <p className="suggestion">🎯 Advance goal: {level.goalLabel}</p>}

              <div className="skill-log">
                <input
                  className="set-input"
                  type="number"
                  inputMode="numeric"
                  placeholder={sk.unit}
                  value={drafts[sk.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [sk.id]: e.target.value }))}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => logSkill(sk)}>
                  Log best {sk.unit}
                </button>
                <span className="muted small">Best: {best} {sk.unit}</span>
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
                    <span>{sk.emoji} {sk.benchmark}</span>
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
