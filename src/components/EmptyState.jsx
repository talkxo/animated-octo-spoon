import React from 'react';

/**
 * EmptyState — reusable Linear-style empty state component.
 *
 * Props:
 *   icon      — Lucide icon element, e.g. <History size={20} />
 *   heading   — bold headline, e.g. "No sprints yet"
 *   sub       — muted sub-line describing what to do next
 *   cta       — optional React node (button/link) for primary action
 *   style     — optional extra inline styles on the root wrapper
 */
export default function EmptyState({ icon, heading, sub, cta, style }) {
  return (
    <div className="empty-state" style={style}>
      {icon && (
        <div className="empty-state-icon">
          {icon}
        </div>
      )}
      {heading && <div className="empty-state-heading">{heading}</div>}
      {sub && <div className="empty-state-sub">{sub}</div>}
      {cta && <div style={{ marginTop: '0.75rem' }}>{cta}</div>}
    </div>
  );
}
