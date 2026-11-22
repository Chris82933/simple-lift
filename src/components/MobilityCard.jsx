import { useNavigate } from 'react-router-dom'
import { loadMobility, loadMobilityActive } from '../lib/storage.js'
import { buildSession, blockInfo, sessionsThisWeek, BLOCK_WEEKS } from '../lib/mobility.js'
import { AREA_BY_ID } from '../data/mobility.js'
import { activeEquipmentIds } from '../lib/equipment.js'

// The Mobility card on Today (only once it's added). On a rest day it's the
// thing to do, and says so.
export default function MobilityCard({ restDay = false }) {
  const navigate = useNavigate()
  const mob = loadMobility()
  if (!mob?.added || !(mob.goals?.length || mob.areas?.length)) return null
  const session = buildSession(mob, { state: mob.moves || {}, equipment: new Set(activeEquipmentIds()) })
  const done = sessionsThisWeek(mob.log || [])
  const target = mob.perWeek || 3
  const block = blockInfo(mob.startedAt)
  const resuming = !!loadMobilityActive()
  return (
    <div className={'card mobility-card' + (restDay ? ' is-rest' : '')}>
      <div className="mob-next-head">
        <div>
          <p className="group-label" style={{ margin: 0 }}>Mobility{restDay ? ' · good for a rest day' : ''}</p>
          <p className="day-title">{session.areas.map((a) => AREA_BY_ID[a]?.label).join(' · ') || 'Your plan'}</p>
        </div>
        <span className="muted small">~{session.minutes} min</span>
      </div>
      <p className="muted small">
        {done} of {target} this week · {block.easy ? 'easy week' : `week ${block.week} of ${BLOCK_WEEKS}`}
      </p>
      <div className="mob-sore-row">
        <button type="button" className={'btn btn-sm ' + (restDay || resuming ? 'btn-primary' : 'btn-ghost')} onClick={() => navigate('/mobility/session')} disabled={!session.items.length}>
          {resuming ? 'Continue' : 'Start'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/mobility')}>Open</button>
      </div>
    </div>
  )
}
