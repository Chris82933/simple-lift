import { useNavigate } from 'react-router-dom'
import { loadMobility, loadMobilityActive } from '../lib/storage.js'
import { buildSession, blockInfo, sessionsThisWeek, BLOCK_WEEKS, planSignature, mobilityEquipment, minutesText } from '../lib/mobility.js'
import { AREA_BY_ID, PROGRAM_BY_ID } from '../data/mobility.js'

// The Mobility card on Today (only once it's added). On a rest day it's the
// thing to do, and says so.
export default function MobilityCard({ restDay = false }) {
  const navigate = useNavigate()
  const mob = loadMobility()
  if (!mob?.added || !(mob.program || mob.goals?.length || mob.areas?.length)) return null
  const prog = PROGRAM_BY_ID[mob.program?.id]
  const climbing = prog?.id === 'climbing'
  const session = buildSession(mob, { state: mob.moves || {}, equipment: mobilityEquipment(mob) })
  const done = sessionsThisWeek(mob.log || [])
  const target = mob.perWeek || 3
  const block = blockInfo(mob.startedAt)
  const saved = loadMobilityActive()
  const savedMode = saved?.session?.mode && saved.session.mode !== 'full' ? saved.session.mode : undefined
  const resuming = !!(saved && saved.sig === planSignature(mob, savedMode) && Date.now() - (saved.startedAt || 0) < 12 * 3600e3)
  const go = (m) => navigate('/mobility/session' + (m ? `?mode=${m}` : ''))
  return (
    <div className={'card mobility-card' + (restDay ? ' is-rest' : '')}>
      <div className="mob-next-head">
        <div>
          <p className="group-label" style={{ margin: 0 }}>{prog ? prog.label : 'Mobility'}{restDay ? ' · good for a rest day' : ''}</p>
          <p className="day-title">{session.label || session.areas.map((a) => AREA_BY_ID[a]?.label).join(' · ') || 'Your plan'}</p>
        </div>
        <span className="muted small mob-min">~{minutesText(session.minutes)}</span>
      </div>
      <p className="muted small">
        {done} of {target} {climbing ? 'full sessions ' : ''}this week · {block.easy ? 'easy week' : `week ${block.week} of ${BLOCK_WEEKS}`}
      </p>
      {/* Climbing: on a training day the primer is the thing to do. */}
      {climbing && !resuming && !restDay && <button type="button" className="btn btn-primary" onClick={() => go('primer')}>Before I climb · 10 min</button>}
      <button type="button" className={'btn ' + ((restDay || resuming) ? 'btn-primary' : 'btn-ghost')} onClick={() => go(resuming ? savedMode : undefined)} disabled={!session.items.length}>
        {resuming ? 'Continue mobility' : climbing ? `Full session (~${minutesText(session.minutes)})` : `Start mobility (~${minutesText(session.minutes)})`}
      </button>
      <button type="button" className="link-btn" onClick={() => navigate('/mobility')}>See the plan and your progress</button>
    </div>
  )
}
