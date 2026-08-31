// The muscle map must light up the right regions and never crash on an unknown
// or muscle-less exercise.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import MuscleMap, { highlightRegions, heatRegions, MUSCLE_MAP } from './MuscleMap.jsx'

describe('highlightRegions', () => {
  it('maps primary and secondary muscles to front/back regions', () => {
    const { front, back } = highlightRegions({ primary: ['chest'], secondary: ['shoulders'] })
    expect(front.get('chest')).toBe('primary')
    expect(front.get('delts')).toBe('secondary') // shoulders → front + back delts
    expect(back.get('delts')).toBe('secondary')
  })

  it('primary wins when a muscle is both primary and secondary', () => {
    const { front } = highlightRegions({ primary: ['shoulders'], secondary: ['shoulders'] })
    expect(front.get('delts')).toBe('primary')
  })

  it('back-only muscles never touch the front map', () => {
    const { front, back } = highlightRegions({ primary: ['lats'], secondary: [] })
    expect(back.get('lats')).toBe('primary')
    expect(front.size).toBe(0)
  })

  it('every muscle id in the map points at a real body region', () => {
    const regionKeys = { front: null, back: null }
    for (const targets of Object.values(MUSCLE_MAP)) {
      for (const [side, key] of targets) {
        expect(['front', 'back']).toContain(side)
        expect(typeof key).toBe('string')
        regionKeys[side] = key
      }
    }
    expect(regionKeys.front || regionKeys.back).toBeTruthy()
  })
})

describe('MuscleMap render', () => {
  const svg = (props) => renderToStaticMarkup(createElement(MuscleMap, props))

  it('renders an svg and highlights a primary muscle for a known lift', () => {
    const out = svg({ exId: 'bench_press' })
    expect(out).toContain('<svg')
    expect(out).toContain('mm-primary')  // chest lit
    expect(out).toContain('mm-fill')     // body drawn
  })

  it('renders a plain body (no highlights) for a muscle-less move', () => {
    const out = svg({ muscles: { primary: [], secondary: [] } })
    expect(out).toContain('mm-fill')
    expect(out).not.toContain('mm-primary')
  })

  it('does not crash on an unknown exercise id', () => {
    expect(() => svg({ exId: 'nope_not_real' })).not.toThrow()
  })

  it('compact mode renders a single dominant body, still highlighted', () => {
    const out = svg({ exId: 'bench_press', compact: true })
    expect(out).toContain('muscle-map-compact')
    // One body group, not the front+back pair (no second translate(96,...))
    expect(out).not.toContain('translate(96')
    expect(out).toContain('mm-primary')
  })

  it('renders a heat gradient when given a heat map', () => {
    const out = svg({ heat: { chest: 1, shoulders: 0.4 } })
    expect(out).toContain('mm-heat')
    expect(out).toContain('color-mix') // ramp fill via inline style
    expect(out).not.toContain('mm-primary')
  })
})

describe('heatRegions', () => {
  it('maps muscle intensities onto body regions, taking the max per region', () => {
    const { front, back } = heatRegions({ chest: 1, shoulders: 0.4 })
    expect(front.get('chest')).toBe(1)
    expect(front.get('delts')).toBe(0.4) // shoulders → front + back delts
    expect(back.get('delts')).toBe(0.4)
  })

  it('keeps the strongest signal when two muscles share a region', () => {
    // core and abs both light the front abs region.
    const { front } = heatRegions({ abs: 0.3, core: 0.9 })
    expect(front.get('abs')).toBe(0.9)
  })
})
