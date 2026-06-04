import React from 'react';

/**
 * ConflictToast — non-blocking per-field collision notification.
 *
 * Appears only in the extremely rare case where two teammates submitted
 * the exact same field of the exact same lead within the same Firestore
 * write window. In practice, real-time onSnapshot listeners will surface
 * the other person's change within ~200 ms, making this toast almost
 * never necessary.
 */
export default function ConflictToast({ conflicts = [], onDismiss, onForceWrite }) {
  if (!conflicts.length) return null;

  return (
    <div className="conflict-toast-stack" role="status" aria-live="polite">
      {conflicts.map((c) => (
        <div key={c.id} className="conflict-toast">
          <div className="conflict-toast-header">
            <span className="conflict-toast-icon">⚡</span>
            <span className="conflict-toast-lead">{c.leadName}</span>
            <button
              className="conflict-toast-close"
              onClick={() => onDismiss(c.id)}
              aria-label="Dismiss conflict"
            >
              ×
            </button>
          </div>
          <div className="conflict-toast-body">
            <span className="conflict-toast-field">
              <strong>{c.field}</strong> was changed by <strong>{c.by || 'a teammate'}</strong>
            </span>
            <div className="conflict-toast-values">
              <span className="conflict-value theirs">
                <label>Theirs</label>
                <strong>{String(c.serverValue ?? '—')}</strong>
              </span>
              <span className="conflict-value mine">
                <label>Yours</label>
                <strong>{String(c.clientValue ?? '—')}</strong>
              </span>
            </div>
          </div>
          <div className="conflict-toast-actions">
            <button className="btn btn-secondary" style={{ fontSize: 'var(--text-xs)', padding: '0.3rem 0.6rem' }} onClick={() => onDismiss(c.id)}>
              Keep theirs
            </button>
            <button className="btn btn-primary" style={{ fontSize: 'var(--text-xs)', padding: '0.3rem 0.6rem' }} onClick={() => onForceWrite(c)}>
              Keep mine
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
