import { useState } from 'react'
import { getPlateConfig, calculatePlates } from '../lib/plates.js'
import PlateSettings from './PlateSettings.jsx'

// Inline "which plates go on the bar" readout for a barbell lift's working
// weight, with a gear button to open the plate-availability settings.
export default function PlateBreakdown({ weight, units, setNumber }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const target = Number(weight) || 0
  if (target <= 0) return null

  const config = getPlateConfig()
  const bar = config.barWeight[units] ?? (units === 'kg' ? 20 : 45)
  const available = Object.entries(config.available[units] || {})
    .filter(([, on]) => on)
    .map(([w]) => Number(w))
  const result = calculatePlates(target, bar, available)

  return (
    <div className="plate-line">
      {setNumber ? <span className="plate-set">▸ Loading set {setNumber}</span> : <span className="plate-label">Load</span>}
      {result.barOnly ? (
        <span className="plate-text">Just the bar ({bar}{units})</span>
      ) : result.perSide.length === 0 ? (
        <span className="plate-text muted small">No plates in your set add up — check plate settings.</span>
      ) : (
        <span className="plate-text">
          <strong>{result.perSide.join(' + ')}</strong> {units} per side
          {!result.exact && (
            <span className="plate-approx"> (≈{result.total}{units} — {result.leftover}{units}/side short)</span>
          )}
        </span>
      )}
      <button
        type="button"
        className="plate-gear"
        aria-label="Plate settings"
        onClick={() => setSettingsOpen(true)}
      >
        Edit
      </button>
      {settingsOpen && <PlateSettings initialUnits={units} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
