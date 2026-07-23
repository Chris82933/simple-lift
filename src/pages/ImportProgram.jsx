import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addProgram, loadPrograms } from '../lib/storage.js'
import {
  decodeProgramCode, buildImportedProgram, summarizeProgram, IMPORT_DEFAULTS,
} from '../lib/programShare.js'

const SCHEME_LABEL = {
  t1: 'GZCLP', t2: 'GZCLP', t3: 'GZCLP', 531: '5/3/1', lp: 'Linear', gslp: 'Greyskull',
}

// A three-way import screen: paste → preview + choices → add. Always creates a
// brand-new program, so nothing the recipient already has can be touched.
export default function ImportProgram() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [shared, setShared] = useState(null) // decoded program
  const [error, setError] = useState(null)
  const [opts, setOpts] = useState(IMPORT_DEFAULTS)

  const summary = shared ? summarizeProgram(shared) : null

  const preview = async () => {
    setError(null)
    try {
      setShared(await decodeProgramCode(text))
    } catch (e) {
      setShared(null)
      setError(e?.message || 'That code could not be read.')
    }
  }

  const doImport = () => {
    const existingNames = loadPrograms().map((p) => p.name)
    const program = buildImportedProgram(shared, opts, existingNames)
    addProgram(program) // appends + becomes active; never overwrites
    navigate('/program')
  }

  const set = (patch) => setOpts((o) => ({ ...o, ...patch }))

  const Seg = ({ value, options, onChange }) => (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={'seg-item' + (value === o.id ? ' is-selected' : '')}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )

  return (
    <section className="page full-flow">
      <header className="page-header">
        <div className="onb-head-row">
          <p className="eyebrow">Import a program</p>
          <button type="button" className="skip-link" onClick={() => navigate('/program')}>Cancel →</button>
        </div>
      </header>

      <div className="step-body">
        {!shared ? (
          <>
            <h1>Paste a program code</h1>
            <p className="muted">
              Someone shared a program with you? Paste their code below. It adds a new program —
              nothing you already have is changed.
            </p>
            <textarea
              className="text-input code-box"
              rows={4}
              placeholder="Paste a program code here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error && <p className="muted small import-error">⚠️ {error}</p>}
            <button type="button" className="btn btn-primary" onClick={preview} disabled={!text.trim()}>
              Preview program
            </button>
          </>
        ) : (
          <>
            <h1>{summary.name}</h1>
            <p className="muted">
              {summary.days} day{summary.days === 1 ? '' : 's'} · {summary.exercises} exercise{summary.exercises === 1 ? '' : 's'}
              {summary.schemes.length ? ` · ${[...new Set(summary.schemes.map((s) => SCHEME_LABEL[s] || s))].join(', ')}` : ''}
            </p>

            {summary.unknown > 0 && (
              <div className="card notice">
                <p className="muted small">
                  ⚠️ {summary.unknown} exercise{summary.unknown === 1 ? '' : 's'} in this program{summary.unknown === 1 ? ' isn’t' : ' aren’t'} in
                  your version of the app and will be skipped. You can add replacements in the builder afterwards.
                </p>
              </div>
            )}

            <div className="card">
              <p className="group-label">Starting weights</p>
              <p className="muted small">Their weights are set for their body — start blank and enter your own as you go.</p>
              <Seg
                value={opts.weights}
                onChange={(v) => set({ weights: v })}
                options={[
                  { id: 'blank', label: 'Start blank' },
                  { id: 'theirs', label: 'Use their weights' },
                ]}
              />
            </div>

            {summary.schemes.length > 0 && (
              <div className="card">
                <p className="group-label">Progress</p>
                <p className="muted small">
                  This program tracks progression (stages, cycles, or a training max). Start fresh, or
                  pick up exactly where they were.
                </p>
                <Seg
                  value={opts.progress}
                  onChange={(v) => set({ progress: v })}
                  options={[
                    { id: 'fresh', label: 'Start fresh' },
                    { id: 'keep', label: 'Keep their progress' },
                  ]}
                />
              </div>
            )}

            <div className="card">
              <p className="group-label">Weekly schedule</p>
              <p className="muted small">Keep the training days they set, or lay it out to fit your week.</p>
              <Seg
                value={opts.schedule}
                onChange={(v) => set({ schedule: v })}
                options={[
                  { id: 'theirs', label: 'Their days' },
                  { id: 'mine', label: 'I’ll set my own' },
                ]}
              />
            </div>

            <p className="muted small">
              Sets, reps and rest come across as written — that&apos;s the program. You can tweak
              anything in the builder once it&apos;s added.
            </p>
          </>
        )}
      </div>

      <div className="flow-actions">
        {shared ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => { setShared(null); setError(null) }}>Back</button>
            <button type="button" className="btn btn-primary" onClick={doImport}>Add as new program</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/program')}>Cancel</button>
        )}
      </div>
    </section>
  )
}
