// The data-loss guards. A user lost their programs on iOS, and while the cause
// was iOS's 7-day eviction rather than a bug, these tests pin down the rule that
// makes a repeat impossible from our side: a read that FAILED must never be
// treated as "empty" and written over.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadPrograms, savePrograms, addProgram, updateProgram, deleteProgram,
  loadSettings, saveSettings, loadHistory, appendWorkout, insertWorkoutAt,
  exportData, importData, exportCode, importCode, clearAll, restoreProgram,
  loadBodyweight, logBodyweight, currentBodyweight,
} from './storage.js'

const PROGRAMS = 'simple-lift:programs'
const raw = (k) => window.localStorage.getItem(k)

const program = (over = {}) => ({
  id: 'p1', name: 'Test Program', days: [{ title: 'Day 1', exercises: [] }], ...over,
})

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
afterEach(() => vi.restoreAllMocks())

describe('programs round-trip', () => {
  it('saves and loads', () => {
    savePrograms([program()])
    expect(loadPrograms()).toHaveLength(1)
    expect(loadPrograms()[0].name).toBe('Test Program')
  })

  it('addProgram assigns an id and makes it active', () => {
    const p = addProgram({ name: 'Fresh', days: [] })
    expect(p.id).toBeTruthy()
    expect(loadPrograms().map((x) => x.id)).toContain(p.id)
  })

  it('updateProgram edits in place', () => {
    savePrograms([program()])
    updateProgram({ ...program(), name: 'Renamed' })
    expect(loadPrograms()[0].name).toBe('Renamed')
  })

  it('deleteProgram removes only the target', () => {
    savePrograms([program(), program({ id: 'p2', name: 'Second' })])
    deleteProgram('p1')
    expect(loadPrograms().map((p) => p.id)).toEqual(['p2'])
  })
})

// ---- The core guard ----
describe('never clobbers on a failed read', () => {
  it('keeps programs when localStorage.getItem throws', () => {
    savePrograms([program()])
    const good = raw(PROGRAMS)

    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    // Every mutating path must decline to write rather than write a degraded value.
    updateProgram({ ...program(), name: 'should not persist' })
    deleteProgram('p1')
    spy.mockRestore()

    expect(raw(PROGRAMS)).toBe(good)
    expect(loadPrograms()[0].name).toBe('Test Program')
  })

  it('keeps programs when the stored JSON is corrupt', () => {
    window.localStorage.setItem(PROGRAMS, '{ this is not json')
    updateProgram({ ...program(), name: 'nope' })
    deleteProgram('p1')
    // Corrupt data is preserved rather than replaced — recoverable by hand.
    expect(raw(PROGRAMS)).toBe('{ this is not json')
  })

  it('treats a genuinely absent key as empty, not as a failure', () => {
    expect(loadPrograms()).toEqual([])
    const p = addProgram({ name: 'First ever', days: [] })
    expect(loadPrograms().map((x) => x.id)).toEqual([p.id])
  })

  it('a failed write reports false instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => saveSettings({ units: 'kg' })).not.toThrow()
    expect(saveSettings({ units: 'kg' })).toBe(false)
  })
})

describe('history', () => {
  it('saveWorkout prepends newest-first', () => {
    appendWorkout({ date: '2026-01-01', sessionTitle: 'A' })
    appendWorkout({ date: '2026-01-02', sessionTitle: 'B' })
    expect(loadHistory().map((w) => w.sessionTitle)).toEqual(['B', 'A'])
  })

  it('insertWorkoutAt restores a deleted session to its original slot (undo)', () => {
    appendWorkout({ date: '3', sessionTitle: 'C' })
    appendWorkout({ date: '2', sessionTitle: 'B' })
    appendWorkout({ date: '1', sessionTitle: 'A' })
    const removed = loadHistory()[1] // 'B', in the middle
    const without = loadHistory().filter((w) => w.date !== removed.date)
    window.localStorage.setItem('simple-lift:history', JSON.stringify(without))
    insertWorkoutAt(removed, 1)
    expect(loadHistory().map((w) => w.sessionTitle)).toEqual(['A', 'B', 'C'])
  })

  it('restoreProgram is a no-op when the program is already back', () => {
    savePrograms([program()])
    restoreProgram(program())
    expect(loadPrograms()).toHaveLength(1)
  })
})

describe('bodyweight log', () => {
  it('starts empty and reports 0', () => {
    expect(loadBodyweight()).toEqual([])
    expect(currentBodyweight()).toBe(0)
  })

  it('records a weigh-in and reports the latest', () => {
    logBodyweight(180, '2026-01-01T08:00:00.000Z')
    logBodyweight(178, '2026-02-01T08:00:00.000Z')
    expect(currentBodyweight()).toBe(178)
    expect(loadBodyweight()).toHaveLength(2)
  })

  it('replaces rather than stacks when re-weighing the same day', () => {
    logBodyweight(180, '2026-01-01T08:00:00.000Z')
    logBodyweight(181, '2026-01-01T20:00:00.000Z')
    expect(loadBodyweight()).toHaveLength(1)
    expect(currentBodyweight()).toBe(181)
  })

  it('ignores a zero or junk weight', () => {
    logBodyweight(0)
    logBodyweight('not a number')
    expect(loadBodyweight()).toEqual([])
  })

  it('travels in the backup snapshot', async () => {
    logBodyweight(180, '2026-01-01T08:00:00.000Z')
    const code = await exportCode()
    clearAll()
    expect(currentBodyweight()).toBe(0)
    await importCode(code)
    expect(currentBodyweight()).toBe(180)
  })
})

describe('settings', () => {
  it('defaults to lbs before anything is saved', () => {
    expect(loadSettings().units).toBe('lbs')
  })

  it('fires sl-saved so the UI can flash "Saved"', () => {
    const onSaved = vi.fn()
    window.addEventListener('sl-saved', onSaved)
    saveSettings({ units: 'kg' })
    window.removeEventListener('sl-saved', onSaved)
    expect(onSaved).toHaveBeenCalledTimes(1)
  })
})

describe('export / import', () => {
  it('round-trips a full snapshot', () => {
    savePrograms([program()])
    appendWorkout({ date: '2026-01-01', sessionTitle: 'A' })
    saveSettings({ units: 'kg' })
    const blob = exportData()

    clearAll()
    expect(loadPrograms()).toEqual([])

    importData(blob)
    expect(loadPrograms()[0].name).toBe('Test Program')
    expect(loadHistory()).toHaveLength(1)
    expect(loadSettings().units).toBe('kg')
  })

  it('backup codes round-trip', async () => {
    savePrograms([program()])
    appendWorkout({ date: '2026-01-01', sessionTitle: 'A' })
    const code = await exportCode()

    clearAll()
    await importCode(code)
    expect(loadPrograms()[0].name).toBe('Test Program')
    expect(loadHistory()).toHaveLength(1)
  })

  it('rejects a code that is not ours without touching saved data', async () => {
    savePrograms([program()])
    // Tolerates a sync throw or a rejected promise.
    await expect(Promise.resolve().then(() => importCode('total nonsense'))).rejects.toThrow()
    expect(loadPrograms()[0].name).toBe('Test Program')
  })

  it('emits a compressed v2 code', async () => {
    savePrograms([program()])
    expect(await exportCode()).toMatch(/^SLIFT2:/)
  })

  it('still imports an old uncompressed v1 code', async () => {
    // Exactly what the previous version produced: SLIFT1 + plain base64 JSON.
    const blob = { programs: [program({ name: 'From v1' })], history: [] }
    const v1 = 'SLIFT1:' + btoa(unescape(encodeURIComponent(JSON.stringify(blob))))
    await importCode(v1)
    expect(loadPrograms()[0].name).toBe('From v1')
  })

  it('compresses a realistic history to a fraction of the v1 size', async () => {
    // 60 sessions of repetitive JSON — the case that made codes unusably long.
    const history = Array.from({ length: 60 }, (_, i) => ({
      date: `2026-01-${(i % 28) + 1}`,
      sessionTitle: 'A1 · Back Squat',
      entries: [
        { exerciseId: 'back_squat', name: 'Back Squat', sets: Array.from({ length: 5 }, () => ({ weight: 225, reps: 3, done: true })) },
        { exerciseId: 'bench_press', name: 'Bench Press', sets: Array.from({ length: 3 }, () => ({ weight: 150, reps: 10, done: true })) },
      ],
    }))
    importData({ programs: [program()], history })

    const v2 = await exportCode()
    const v1Length = 'SLIFT1:'.length + btoa(unescape(encodeURIComponent(JSON.stringify(exportData())))).length
    expect(v2.length).toBeLessThan(v1Length / 10)
  })

  it('accepts a code with stray whitespace from a wrapped paste', async () => {
    savePrograms([program()])
    const code = await exportCode()
    clearAll()
    const wrapped = code.slice(0, 20) + '\n  ' + code.slice(20)
    await importCode(wrapped)
    expect(loadPrograms()[0].name).toBe('Test Program')
  })

  it('importData leaves untouched keys alone', () => {
    savePrograms([program()])
    saveSettings({ units: 'kg' })
    importData({ history: [{ date: '2026-01-01', sessionTitle: 'A' }] })
    expect(loadPrograms()).toHaveLength(1)
    expect(loadSettings().units).toBe('kg')
  })
})
