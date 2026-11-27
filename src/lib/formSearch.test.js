import { describe, it, expect } from 'vitest'
import { EXERCISES } from '../data/exercises.js'
import { SKILLS } from '../data/skills.js'
import { formSearchQuery, formSearchUrl } from './formSearch.js'

const q = (id) => formSearchQuery({ id })

describe('form search', () => {
  it('lifts search "X form"', () => {
    expect(q('back_squat')).toBe('back squat form')
    expect(q('pullup')).toBe('pull-up form')
  })
  it('stretches search "X stretch", never doubled', () => {
    expect(q('couch_stretch')).toBe('couch stretch')
    expect(q('wall_frog')).toBe('wall frog stretch')
    expect(q('open_book')).toBe('open book stretch')
  })
  it('timed holds search "X hold", never doubled', () => {
    expect(q('l_sit')).toBe('l-sit hold')
    expect(q('hollow_body_hold')).toBe('hollow body hold')
    expect(q('copenhagen_hold')).toBe('copenhagen plank hold')
  })
  it('uses "pose" where the yoga name is what people search', () => {
    expect(q('cat_cow_segmental')).toBe('cat cow pose')
  })
  it('carries and cardio are technique, not holds', () => {
    expect(q('farmer_carry')).toBe("farmer's carry form")
    expect(q('rowing_machine')).toBe('rowing machine form')
  })
  it('drops brackets and plus signs from our names', () => {
    expect(q('hack_squat')).toBe('machine hack squat form')
    expect(q('lunge_calf_raise')).toBe('lunge calf raise form')
  })
  it('never uses the old "how to" wording, and every query is clean', () => {
    for (const ex of EXERCISES) {
      const s = formSearchQuery(ex)
      if (s === null) continue
      expect(s, ex.id).toMatch(/\b(form|stretch|hold|holds|pose|exercise|exercises|explained|density)\b/)
      expect(s, ex.id).not.toMatch(/how to|[()+’]|\s{2}/)
      expect(s, ex.id).toBe(s.toLowerCase())
    }
  })
  it('every skill step gets a sensible search', () => {
    for (const sk of SKILLS) for (const l of sk.levels) {
      const s = formSearchQuery({ name: l.name })
      expect(s, l.name).toMatch(/ (form|hold|stretch)$/)
    }
    expect(formSearchQuery({ name: 'Advanced Tuck' })).toBe('advanced tuck front lever hold')
  })
  it('custom exercises fall back to the typed name', () => {
    expect(formSearchQuery({ id: 'custom_x', name: 'Sled Push' })).toBe('sled push form')
  })
  it('no button for a catch-all cardio entry', () => {
    expect(formSearchUrl({ id: 'cardio_machine', name: 'Cardio (any machine)' })).toBeNull()
    expect(formSearchUrl({ id: 'deadlift', name: 'Deadlift' })).toBe('https://www.youtube.com/results?search_query=deadlift%20form')
  })
})
