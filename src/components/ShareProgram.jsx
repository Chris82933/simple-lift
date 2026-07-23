import { useState } from 'react'
import { encodeProgramCode } from '../lib/programShare.js'

// Generates a copy-paste share code for one program. The code carries the
// program's structure only — the recipient chooses whether to take the weights.
export default function ShareProgram({ program }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState(null) // { ok, msg }
  const [busy, setBusy] = useState(false)

  const generate = async () => {
    setBusy(true)
    try {
      const c = await encodeProgramCode(program)
      setCode(c)
      setStatus(null)
      try {
        await navigator.clipboard.writeText(c)
        setStatus({ ok: true, msg: 'Copied! Send it to whoever you like.' })
      } catch {
        setStatus({ ok: true, msg: 'Select the code below and copy it.' })
      }
    } catch (e) {
      setStatus({ ok: false, msg: e?.message || 'Could not build a code.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <p className="group-label">Share this program</p>
      <p className="muted small">
        Create a code and send it to a friend. When they import it, they pick whether to use your
        weights or start from their own — your saved maxes are never shared.
      </p>
      <button type="button" className="btn btn-ghost" onClick={generate} disabled={busy}>
        {busy ? 'Building…' : '🔗 Copy share code'}
      </button>
      {code && (
        <textarea
          className="text-input code-box"
          rows={3}
          readOnly
          value={code}
          onFocus={(e) => e.target.select()}
        />
      )}
      {status && <p className={'muted small' + (status.ok ? '' : ' import-error')}>{status.msg}</p>}
    </div>
  )
}
