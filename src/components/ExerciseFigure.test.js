// The figures are decorative, but wrong ones are actively confusing — a
// push-up drawn with its arms pointing away from the floor, or a bar through
// the mascot's face. These checks encode the drawing conventions so the poses
// can't quietly regress.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import ExerciseFigure, { figureFor, FIGURE_NAMES } from './ExerciseFigure.jsx'
import { EXERCISES } from '../data/exercises.js'

const svgFor = (props) => renderToStaticMarkup(createElement(ExerciseFigure, props))
const parse = (markup) => new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement

const FLOOR_Y = 86

describe('coverage', () => {
  it('draws something sensible for every pattern in the library', () => {
    for (const ex of EXERCISES) {
      const name = figureFor(ex.pattern, ex.id)
      expect(FIGURE_NAMES, `${ex.id} (${ex.pattern}) has no figure`).toContain(name)
    }
  })

  it('never falls back to the plank for a movement that has its own figure', () => {
    expect(figureFor('biceps')).toBe('curl')       // was drawn as a pull-up
    expect(figureFor('shoulder_iso')).toBe('lateral') // was drawn as an overhead press
    expect(figureFor('calf')).toBe('calf')         // was drawn as a barbell squat
    expect(figureFor('horiz_pull')).toBe('row')    // was drawn as a pull-up
    expect(figureFor('lunge')).toBe('lunge')       // was drawn as a squat
  })

  it('gives carries and kettlebell ballistics their own figures', () => {
    expect(figureFor('core', 'farmer_carry')).toBe('carry')
    expect(figureFor('core', 'kb_suitcase_carry')).toBe('carry')
    expect(figureFor('hinge', 'kb_swing')).toBe('swing')
    expect(figureFor('core', 'kb_turkish_getup')).toBe('getup')
  })

  it('still resolves an unknown pattern to something', () => {
    expect(FIGURE_NAMES).toContain(figureFor('nonsense'))
  })
})

describe('the face is never swallowed by the limb stroke', () => {
  // Nesting <Face> inside the 5px-stroked group made the 1.3px eyes render as
  // blobs. Every pose must keep the face outside it.
  it.each(FIGURE_NAMES)('%s keeps two clean eyes', (name) => {
    const pattern = Object.entries({
      squat: 'squat', lunge: 'lunge', calf: 'calf', hinge: 'hinge', push: 'horiz_push',
      overhead: 'vert_push', lateral: 'shoulder_iso', row: 'horiz_pull', pull: 'vert_pull',
      curl: 'biceps', core: 'core', jump: 'conditioning',
    }).find(([fig]) => fig === name)?.[1]
    const props = pattern ? { pattern } : { pattern: 'core', exId: { carry: 'farmer_carry', swing: 'kb_swing', getup: 'kb_turkish_getup', hang: 'hanging_leg_raise' }[name] }
    const svg = parse(svgFor(props))
    const eyes = [...svg.querySelectorAll('circle')].filter((c) => c.getAttribute('r') === '1.3')
    expect(eyes).toHaveLength(2)
    for (const eye of eyes) {
      expect(eye.closest('g[stroke-width="5"]'), `${name}: eye inherits the limb stroke`).toBeNull()
    }
  })
})

describe('things that touch the ground actually reach it', () => {
  // Pull every y coordinate out of a path, honouring the fact that V/v take a
  // lone y and H/h a lone x — a naive "every second number" parse misses the
  // vertical limbs entirely, which are exactly the ones that reach the floor.
  const yValues = (d) => {
    const tokens = d.match(/[A-Za-z]|-?[\d.]+/g) || []
    const out = []
    let cmd = null
    let buf = []
    for (const t of tokens) {
      if (/[A-Za-z]/.test(t)) { cmd = t; buf = []; continue }
      buf.push(Number(t))
      if (cmd === 'V' || cmd === 'v') { out.push(buf[0]); buf = [] }
      else if (cmd === 'H' || cmd === 'h') { buf = [] }
      else if (buf.length === 2) { out.push(buf[1]); buf = [] }
    }
    return out
  }

  const endsAtFloor = (svg) => {
    const ys = [...svg.querySelectorAll('path')].flatMap((p) => yValues(p.getAttribute('d')))
    return ys.some((y) => Math.abs(y - FLOOR_Y) < 3)
  }

  it('the push-up puts its hands on the floor, not in the air', () => {
    const svg = parse(svgFor({ pattern: 'horiz_push' }))
    expect(endsAtFloor(svg)).toBe(true)
  })

  it('the plank rests on its forearms', () => {
    const svg = parse(svgFor({ pattern: 'core' }))
    expect(endsAtFloor(svg)).toBe(true)
  })

  it('standing figures stand on the floor', () => {
    for (const pattern of ['squat', 'vert_push', 'biceps', 'shoulder_iso']) {
      expect(endsAtFloor(parse(svgFor({ pattern }))), pattern).toBe(true)
    }
  })
})

describe('equipment does not overlap the head', () => {
  it('the squat bar sits below the face, not across it', () => {
    const svg = parse(svgFor({ pattern: 'squat' }))
    const head = [...svg.querySelectorAll('circle')].find((c) => c.getAttribute('r') === '9')
    const headBottom = Number(head.getAttribute('cy')) + 9
    const barY = Number(svg.querySelector('line').getAttribute('y1'))
    expect(barY).toBeGreaterThan(headBottom)
  })

  it('the overhead bar sits above the face', () => {
    const svg = parse(svgFor({ pattern: 'vert_push' }))
    const head = [...svg.querySelectorAll('circle')].find((c) => c.getAttribute('r') === '9')
    const headTop = Number(head.getAttribute('cy')) - 9
    const barY = Number(svg.querySelector('line').getAttribute('y1'))
    expect(barY).toBeLessThan(headTop)
  })
})

describe('limbs come in pairs', () => {
  // A single leg reads as a glitch. Count the stroked limb paths.
  it.each([['squat', 2], ['hinge', 2], ['vert_push', 2], ['vert_pull', 2], ['shoulder_iso', 2]])(
    '%s draws both legs',
    (pattern) => {
      const svg = parse(svgFor({ pattern }))
      const paths = [...svg.querySelectorAll('g[stroke-width="5"] path')]
      expect(paths.length).toBeGreaterThanOrEqual(4) // torso + arms + two legs
    },
  )
})
