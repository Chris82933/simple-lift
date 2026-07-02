import { useState } from 'react'
import { PLATE_WEIGHTS, BAR_PRESETS, getPlateConfig, savePlateConfig } from '../lib/plates.js'

// Configure which plates are on hand (not every gym stocks 5s or fractional
// plates) and the bar weight, per unit — lbs and kg gyms often differ.
export default function PlateSettings({ initialUnits = 'lbs', onClose }) {
  const [unit, setUnit] = useState(initialUnits)
  const [config, setConfig] = useState(() => getPlateConfig())

  const togglePlate = (w) => {
    const next = {
      ...config,
      available: {
        ...config.available,
        [unit]: { ...config.available[unit], [w]: !config.available[unit][w] },
      },
    }
    setConfig(next)
    savePlateConfig(next)
  }

  const setBarWeight = (value) => {
    const next = { ...config, barWeight: { ...config.barWeight, [unit]: Number(value) } }
    setConfig(next)
    savePlateConfig(next)
  }

  const setAll = (on) => {
    const next = {
      ...config,
      available: {
        ...config.available,
        [unit]: Object.fromEntries(PLATE_WEIGHTS[unit].map((w) => [w, on])),
      },
    }
    setConfig(next)
    savePlateConfig(next)
  }

  const isPreset = BAR_PRESETS[unit].some((p) => p.value === config.barWeight[unit])

  return (
    <div className="picker-overlay" role="dialog" aria-label="Plate settings">
      <div className="picker-sheet">
        <div className="picker-head">
          <p className="ex-name big" style={{ flex: 1 }}>🔩 Plate settings</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
        </div>
        <div className="picker-list">
          <p className="muted small">
            Tell us what your gym has so plate math only suggests plates you can actually load.
          </p>

          <div className="seg" style={{ margin: '4px 0 12px' }}>
            {['lbs', 'kg'].map((u) => (
              <button key={u} type="button" className={'seg-item' + (unit === u ? ' is-selected' : '')} onClick={() => setUnit(u)}>
                {u}
              </button>
            ))}
          </div>

          <p className="group-label">Bar weight</p>
          <div className="check-grid">
            {BAR_PRESETS[unit].map((p) => (
              <button
                key={p.value}
                type="button"
                className={'check-pill' + (config.barWeight[unit] === p.value ? ' is-selected' : '')}
                onClick={() => setBarWeight(p.value)}
              >
                {p.label} · {p.value}{unit}
              </button>
            ))}
          </div>
          <label className="bar-custom">
            <span className="muted small">{isPreset ? 'Or enter a custom bar weight' : 'Custom bar weight'}</span>
            <input
              className="text-input"
              type="number"
              inputMode="decimal"
              value={config.barWeight[unit]}
              onChange={(e) => setBarWeight(e.target.value)}
            />
          </label>

          <div className="plate-head-row">
            <p className="group-label" style={{ margin: 0 }}>Plates available ({unit})</p>
            <div className="plate-quick-btns">
              <button type="button" className="link-btn" onClick={() => setAll(true)}>All</button>
              <button type="button" className="link-btn" onClick={() => setAll(false)}>None</button>
            </div>
          </div>
          <div className="check-grid">
            {PLATE_WEIGHTS[unit].map((w) => (
              <button
                key={w}
                type="button"
                className={'check-pill' + (config.available[unit][w] ? ' is-selected' : '')}
                onClick={() => togglePlate(w)}
              >
                {w} {unit}
              </button>
            ))}
          </div>
          <p className="muted small">Unchecked plates are never suggested — the calculator will use the closest combo you actually have.</p>
        </div>
      </div>
    </div>
  )
}
