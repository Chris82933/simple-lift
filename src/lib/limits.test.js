import { describe, it, expect } from 'vitest'
import { acceptNumber, maxWeightFor } from './limits.js'

describe('acceptNumber', () => {
  it('keeps an ordinary value exactly as typed', () => {
    // As typed, not normalised: "102." must survive so "102.5" can be finished.
    expect(acceptNumber('102.5', '102', { max: 1500 })).toBe('102.5')
    expect(acceptNumber('0', '5')).toBe('0')
  })

  it('always allows clearing the box', () => {
    expect(acceptNumber('', '135', { max: 1500 })).toBe('')
  })

  it('refuses a negative by keeping the previous value', () => {
    expect(acceptNumber('-20', '20')).toBe('20')
    expect(acceptNumber('-50', '')).toBe('')
  })

  it('refuses a value past the ceiling', () => {
    expect(acceptNumber('99999', '9999', { max: 1500 })).toBe('9999')
    expect(acceptNumber('1500', '150', { max: 1500 })).toBe('1500')
  })

  it('honours a minimum', () => {
    expect(acceptNumber('0', '3', { min: 1 })).toBe('3')
  })

  it('has a lower ceiling in kg than in lb', () => {
    expect(maxWeightFor('kg')).toBeLessThan(maxWeightFor('lbs'))
  })
})
