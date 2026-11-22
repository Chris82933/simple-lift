import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  loadPrograms, getActiveProgramId, setActiveProgramId, deleteProgram, restoreProgram, addProgram,
  isSkillTreeAdded, setSkillTreeAdded, loadSkills, loadMobility, removeMobility, updateMobility,
} from '../lib/storage.js'
import { sessionsThisWeek, blockInfo, BLOCK_WEEKS } from '../lib/mobility.js'
import { computeStats, powerLevel, rankFor } from '../data/skills.js'
import { useToast } from '../components/Toast.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

// What kind of program this is, in words people use. Templates used to be
// labelled "Generated" — only the Builder set a source anyone checked.
function sourceLabel(p) {
  if (p.boneDensity) return 'Bone Strength'
  if (p.recovery) return 'Recovery'
  switch (p.source) {
    case 'template': return 'Ready-made'
    case 'gzclp-wizard': return 'GZCLP'
    case 'generated': return 'Personalised'
    default: return 'Custom'
  }
}

export default function Programs() {
  const navigate = useNavigate()
  const toast = useToast()
  const [, force] = useState(0)
  const programs = loadPrograms()
  const activeId = getActiveProgramId()
  const skillTreeAdded = isSkillTreeAdded()
  const mob = loadMobility()

  const refresh = () => force((n) => n + 1)
  // Today's "Plans → More" link lands on that card, not the top of the page.
  const location = useLocation()
  useEffect(() => {
    const id = location.state?.scrollTo
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [location.state])
  const [confirmDelete, setConfirmDelete] = useState(null)

  // A copy to experiment on — the usual reason to duplicate is "same program,
  // but I want to try a different Thursday" without touching the one in use.
  const duplicate = (program) => {
    const copy = JSON.parse(JSON.stringify(program))
    delete copy.id
    delete copy.createdAt
    copy.name = `${program.name} (copy)`
    if (copy.schedule?.mode === 'rotation') copy.schedule.pointer = 0
    const made = addProgram(copy)
    // addProgram makes the new one active; a copy shouldn't take over Today.
    if (activeId) setActiveProgramId(activeId)
    refresh()
    toast.show(`Copied to "${made.name}"`, { actionLabel: 'Undo', onAction: () => { deleteProgram(made.id); if (activeId) setActiveProgramId(activeId); refresh() } })
  }

  const makeActive = (id) => { setActiveProgramId(id); refresh() }
  const remove = (program) => {
    const wasActive = program.id === activeId
    deleteProgram(program.id)
    refresh()
    toast.show(`Deleted "${program.name}"`, {
      actionLabel: 'Undo',
      onAction: () => { restoreProgram(program); if (wasActive) setActiveProgramId(program.id); refresh() },
    })
  }

  // Add the calisthenics skill tree without leaving this page.
  const addSkillTree = () => { setSkillTreeAdded(true); refresh() }
  // Remove it here too — no need to enter the tree just to drop it.
  const removeSkillTree = () => {
    setSkillTreeAdded(false)
    refresh()
    toast.show('Removed Calisthenics Skill Tree', {
      actionLabel: 'Undo',
      onAction: () => { setSkillTreeAdded(true); refresh() },
    })
  }

  // A one-line power-level summary of the radar chart for the card.
  const skillSummary = () => {
    const power = powerLevel(computeStats(loadSkills()))
    return `Power level ${power} · ${rankFor(power)}`
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Plans</h1>
        <p className="muted">Your programs, then ways to start a new one and a few extras.</p>
      </header>

      {programs.length === 0 && !skillTreeAdded && (
        <div className="card placeholder-card">
          <p className="placeholder-title">No programs yet</p>
          <p className="muted">Not sure where to start? “Help me choose” asks five quick questions and picks one for you.</p>
        </div>
      )}

      {mob?.added && (
        <div className="card program-card skill-tree-program">
          <div className="program-card-head">
            <div>
              <p className="day-title">Mobility</p>
              <p className="muted small">
                Strength through range · {sessionsThisWeek(mob.log || [])} of {mob.perWeek || 3} this week · {blockInfo(mob.startedAt).easy ? 'easy week' : `week ${blockInfo(mob.startedAt).week} of ${BLOCK_WEEKS}`}
              </p>
            </div>
            <span className="level-chip">Alongside</span>
          </div>
          <p className="muted small">Runs alongside your lifting plan — short sessions on rest days or after training.</p>
          <div className="program-card-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/mobility')}>Open</button>
            <button
              type="button"
              className="btn btn-ghost btn-sm danger"
              onClick={() => {
                removeMobility()
                refresh()
                toast.show('Removed Mobility — your check-ins are kept', { actionLabel: 'Undo', onAction: () => { updateMobility({ added: true }); refresh() } })
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {skillTreeAdded && (
        <div className="card program-card skill-tree-program">
          <div className="program-card-head">
            <div>
              <p className="day-title">Calisthenics Skill Tree</p>
              <p className="muted small">
                Special program · skill progressions + radar chart · {skillSummary()}
              </p>
            </div>
            <span className="level-chip">Skill tree</span>
          </div>
          <p className="muted small">
            Not a workout to schedule — a bodyweight-skills tracker (muscle-up, front lever, handstand…)
            with level-by-level progressions and a power-level radar chart that fills out as you get stronger.
          </p>
          <div className="program-card-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/skills')}>
              Open
            </button>
            <button type="button" className="btn btn-ghost btn-sm danger" onClick={removeSkillTree}>
              Remove
            </button>
          </div>
        </div>
      )}

      {programs.map((p) => {
        const isActive = p.id === activeId
        const exCount = p.days.reduce((n, d) => n + d.exercises.length, 0)
        return (
          <div className={'card program-card' + (isActive ? ' is-active' : '')} key={p.id}>
            <div className="program-card-head">
              <div>
                <p className="day-title">{p.name}</p>
                <p className="muted small">
                  {sourceLabel(p)} · {p.days.length} workout{p.days.length === 1 ? '' : 's'} · {exCount} exercises
                </p>
              </div>
              {isActive ? (
                <span className="active-badge">Active</span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => makeActive(p.id)}>
                  Set active
                </button>
              )}
            </div>
            <div className="program-card-actions">
              {/* Available for every program, not just the active one — so you can
                  glance at (or reschedule) an alternate program, like a hypertrophy
                  block you're not currently running, without switching to it. */}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/program', { state: { id: p.id } })}>
                View days
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/schedule', { state: { id: p.id } })}>
                Schedule
              </button>
              {/* Same fix as Program.jsx's "Edit this program": Builder opens any
                  program regardless of source, so this is no longer limited to
                  source === 'custom' (which locked out template/generated programs). */}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/builder', { state: { id: p.id } })}>
                Edit
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => duplicate(p)}>
                Duplicate
              </button>
              <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => setConfirmDelete(p)}>
                Delete
              </button>
            </div>
          </div>
        )
      })}
      <div className="card">
        <p className="group-label">Start a new plan</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/onboarding')}>
          Help me choose
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/templates')}>
          Browse all programs
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/builder')}>
          Build my own
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/import-program')}>
          Import a program (share code or pasted text)
        </button>
      </div>

      <div className="card" id="more">
        <p className="group-label">More</p>
        {!mob?.added && (
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/mobility')}>
            Mobility — strength through range
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/recovery')}>
          Recovery &amp; Strength — rehab a sore joint
        </button>
        {!skillTreeAdded && (
          <button type="button" className="btn btn-ghost" onClick={addSkillTree}>
            Add the Calisthenics Skill Tree
          </button>
        )}
        <Link className="btn btn-ghost" to="/one-rep-max">Find your starting weights (1RM)</Link>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/cardio')}>Log cardio</button>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.name}"?`}
          message={`${confirmDelete.days.length} day${confirmDelete.days.length === 1 ? '' : 's'} of programming will be removed${confirmDelete.id === activeId ? ', and it is your active program' : ''}. Your logged workouts are kept. You can undo this for a few seconds afterwards.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { const p = confirmDelete; setConfirmDelete(null); remove(p) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </section>
  )
}
