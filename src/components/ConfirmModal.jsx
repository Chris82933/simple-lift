import { useRef } from 'react'
import useModalA11y from '../lib/useModalA11y.js'

// A small in-app confirm dialog (replaces window.confirm) for actions that
// throw work away. Reuses the picker-overlay/picker-sheet modal look and
// useModalA11y for the focus trap + Escape, matching the other overlays.
export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  const dialogRef = useRef(null)
  useModalA11y(dialogRef, onCancel)

  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef} tabIndex={-1}>
      <div className="picker-sheet">
        <div className="picker-head">
          <p className="ex-name big" style={{ flex: 1 }}>{title}</p>
        </div>
        <div className="picker-list">
          <p className="muted small">{message}</p>
        </div>
        <div className="picker-foot confirm-foot">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={'btn btn-primary' + (danger ? ' danger' : '')} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
