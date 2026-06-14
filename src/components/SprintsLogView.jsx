import React, { useState } from 'react';
import { 
  History, 
  Trash2, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Activity, 
  Award,
  ListCollapse
} from 'lucide-react';
import EmptyState from './EmptyState';

const getCurrencySymbol = (currencyCode) => {
  switch (currencyCode) {
    case 'INR': return '₹';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'USD':
    default: return '$';
  }
};

const formatDateSafe = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
};

export default function SprintsLogView({
  sprints = [],
  deleteSprintFromSheet,
  currency,
  activeSprintId,
  saveActiveSprintIdToStorage,
  onResumeSprint,
  onSelectLead
}) {
  const [selectedSprintId, setSelectedSprintId] = useState(() => {
    if (activeSprintId) return activeSprintId;
    return sprints.length > 0 ? sprints[0].id : null;
  });

  // Calculate outreach metrics for the dashboard
  const totalSprints = sprints.length;
  
  const totalDials = sprints.reduce((acc, s) => acc + (s.currentIdx || 0), 0);
  
  const totalConnections = sprints.reduce((acc, s) => {
    if (!s.logs) return acc;
    const connectedLogsCount = s.logs.filter(l => 
      l.outcome === 'Connected' || 
      l.outcome === 'Demo Booked' || 
      l.outcome === 'Deal Won' || 
      l.outcome === 'Share Details' || 
      l.outcome === 'Call Later'
    ).length;
    return acc + connectedLogsCount;
  }, 0);

  const totalSuccesses = sprints.reduce((acc, s) => {
    if (!s.logs) return acc;
    const successLogsCount = s.logs.filter(l => 
      l.outcome === 'Deal Won' || 
      l.outcome === 'Share Details' ||
      l.outcome === 'Demo Booked'
    ).length;
    return acc + successLogsCount;
  }, 0);

  const connectionRate = totalDials > 0 ? Math.round((totalConnections / totalDials) * 100) : 0;
  const conversionRate = totalConnections > 0 ? Math.round((totalSuccesses / totalConnections) * 100) : 0;

  // Selected Sprint Details
  const selectedSprint = sprints.find(s => String(s.id) === String(selectedSprintId));

  const handleDelete = (sprintId, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this sprint log? This will remove it permanently.')) return;
    
    deleteSprintFromSheet(sprintId);
    
    if (String(activeSprintId) === String(sprintId)) {
      saveActiveSprintIdToStorage(null);
    }

    if (String(selectedSprintId) === String(sprintId)) {
      setSelectedSprintId(updatedSprints.length > 0 ? updatedSprints[0].id : null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. OUTREACH ANALYTICS DASHBOARD */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
          <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
          Outreach Performance Analytics
        </h3>

        {/* Single unified stats box with internal dividers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          
          {/* Sprints Run */}
          <div style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.45rem', borderRadius: '8px', flexShrink: 0, display: 'flex' }}>
              <Activity size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-title-1)', fontWeight: 800, lineHeight: 1.1 }}>{totalSprints}</div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem', whiteSpace: 'nowrap' }}>SPRINTS RUN</div>
            </div>
          </div>

          {/* Total Dials */}
          <div style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '0.45rem', borderRadius: '8px', flexShrink: 0, display: 'flex' }}>
              <PhoneCall size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-title-1)', fontWeight: 800, lineHeight: 1.1 }}>{totalDials}</div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem', whiteSpace: 'nowrap' }}>TOTAL DIALS</div>
            </div>
          </div>

          {/* Connection Rate */}
          <div style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.45rem', borderRadius: '8px', flexShrink: 0, display: 'flex' }}>
              <CheckCircle2 size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-title-1)', fontWeight: 800, lineHeight: 1.1 }}>{connectionRate}%</div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem', whiteSpace: 'nowrap' }}>CONNECTION RATE</div>
            </div>
          </div>

          {/* Conversion Rate — no right border (last cell) */}
          <div style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(219,39,119,0.1)', color: '#db2777', padding: '0.45rem', borderRadius: '8px', flexShrink: 0, display: 'flex' }}>
              <Award size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-title-1)', fontWeight: 800, lineHeight: 1.1 }}>{conversionRate}%</div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem', whiteSpace: 'nowrap' }}>CONVERSION RATE</div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. SPLIT SCREEN LOG VIEWER */}
      <div style={{ display: 'flex', gap: '1.25rem', flexDirection: 'row', flexWrap: 'wrap' }}>
        
        {/* Left Side: Sprint Selector List */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="glass-card" style={{ padding: '1rem', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <History size={16} style={{ color: 'var(--primary)' }} />
              Sprint Selection
            </h3>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, maxHeight: '500px' }}>
              {sprints.map(s => {
                const isActive = String(s.id) === String(selectedSprintId);
                const pct = s.queue && s.queue.length > 0 ? Math.round((s.currentIdx / s.queue.length) * 100) : 0;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSprintId(s.id)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: isActive ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)',
                      border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{s.name}</span>
                      <span className={`lane-badge ${s.status}`} style={{
                        fontSize: 'var(--text-2xs)',
                        padding: '0.05rem 0.3rem',
                        background: s.status === 'active' ? 'var(--primary-glow)' : s.status === 'suspended' ? 'var(--accent-glow)' : 'rgba(16,185,129,0.1)',
                        color: s.status === 'active' ? 'var(--primary)' : s.status === 'suspended' ? 'var(--accent)' : '#10b981'
                      }}>
                        {s.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                      {s.type === 'pipeline' ? 'Pipeline' : 'Custom List'} • {s.queue?.length || 0} Contacts ({pct}%)
                    </div>
                  </div>
                );
              })}

              {sprints.length === 0 && (
                <EmptyState
                  icon={<AlertCircle size={20} />}
                  heading="No sprints yet"
                  sub="Run your first calling sprint to see reports here."
                  style={{ margin: 'auto 0' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Tabular Details Canvas */}
        <div style={{ flex: '2 1 500px', minWidth: '320px' }}>
          <div className="glass-card" style={{ padding: '1rem', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <ListCollapse size={16} style={{ color: 'var(--primary)' }} />
              Sprint Details
            </h3>
            {selectedSprint ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Sprint Details Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontWeight: 800 }}>{selectedSprint.name}</h2>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <span>Source: <strong style={{ color: 'var(--text-main)' }}>{selectedSprint.type === 'pipeline' ? 'Pipeline' : 'Custom List'}</strong> ({selectedSprint.sourceName})</span>
                      <span>Created: {formatDateSafe(selectedSprint.createdAt)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {selectedSprint.status === 'suspended' && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => onResumeSprint(selectedSprint.id)}
                      >
                        <Play size={11} fill="white" />
                        Resume
                      </button>
                    )}
                    
                    <button 
                      className="outcome-btn lost" 
                      style={{ padding: '0.35rem', borderRadius: '6px' }}
                      onClick={(e) => handleDelete(selectedSprint.id, e)}
                      title="Delete Sprint Report"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {(() => {
                  const pct = selectedSprint.queue && selectedSprint.queue.length > 0 
                    ? Math.round((selectedSprint.currentIdx / selectedSprint.queue.length) * 100) 
                    : 0;
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontWeight: 700, marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Sprint Completion Progress</span>
                        <span>{selectedSprint.currentIdx}/{selectedSprint.queue?.length || 0} Contacts ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: selectedSprint.status === 'active' ? 'var(--primary)' : selectedSprint.status === 'suspended' ? 'var(--accent)' : '#10b981',
                          borderRadius: '3px'
                        }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Sprint Stats Grid */}
                {(() => {
                  const won = selectedSprint.logs ? selectedSprint.logs.filter(l => l.outcome === 'Deal Won' || l.outcome === 'Share Details').length : 0;
                  const conn = selectedSprint.logs ? selectedSprint.logs.filter(l => l.outcome === 'Connected' || l.outcome === 'Demo Booked' || l.outcome === 'Call Later').length : 0;
                  const skip = selectedSprint.logs ? selectedSprint.logs.filter(l => l.action === 'skip' || l.outcome === 'Exit').length : 0;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.6rem 0.5rem' }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-title-3)', fontWeight: 800, color: 'var(--primary)' }}>{won}</div>
                        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>WON / INTERESTED</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--text-title-3)', fontWeight: 800, color: 'var(--accent)' }}>{conn}</div>
                        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>CONNECTED</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--text-title-3)', fontWeight: 800, color: 'var(--text-muted)' }}>{skip}</div>
                        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>SKIPPED / EXITED</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Contacts Queue Table Canvas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Detailed Logs Grid
                  </div>
                  
                  <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <th style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)', width: '30px' }}>#</th>
                          <th style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)' }}>Contact Details</th>
                          <th style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)' }}>Phone</th>
                          <th style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)', textAlign: 'right' }}>Budget Value</th>
                          <th style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)', textAlign: 'center', width: '110px' }}>Call Status</th>
                          <th style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)' }}>Outreach Logs & Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSprint.queue && selectedSprint.queue.map((contact, idx) => {
                          const contactLogs = selectedSprint.logs ? selectedSprint.logs.filter(l => 
                            (l.leadId && String(l.leadId) === String(contact.id)) || 
                            (!l.leadId && String(l.leadName) === String(contact.name))
                          ) : [];
                          
                          let statusLabel = 'Pending';
                          let statusColor = 'var(--text-dark)';
                          let statusBg = 'rgba(255,255,255,0.03)';
                          
                          const hasCallLog = contactLogs.some(l => l.action === 'call');
                          const hasSkipLog = contactLogs.some(l => l.action === 'skip');
                          const isCurrent = (selectedSprint.status === 'active' || selectedSprint.status === 'suspended') && idx === selectedSprint.currentIdx;
                          
                          if (isCurrent) {
                            statusLabel = 'Current Active';
                            statusColor = 'var(--primary)';
                            statusBg = 'var(--primary-glow)';
                          } else if (hasCallLog) {
                            statusLabel = 'Called';
                            statusColor = '#10b981';
                            statusBg = 'rgba(16,185,129,0.1)';
                          } else if (hasSkipLog) {
                            statusLabel = 'Skipped';
                            statusColor = 'var(--accent)';
                            statusBg = 'var(--accent-glow)';
                          } else if (selectedSprint.status !== 'completed' && idx < selectedSprint.currentIdx) {
                            statusLabel = 'Skipped';
                            statusColor = 'var(--accent)';
                            statusBg = 'var(--accent-glow)';
                          }
                          
                          const isClickable = selectedSprint.status === 'active' || selectedSprint.status === 'suspended';
                          
                          return (
                            <tr 
                              key={contact.id || idx} 
                              style={{ 
                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                background: isCurrent ? 'rgba(255,255,255,0.04)' : 'transparent',
                                cursor: isClickable ? 'pointer' : 'default'
                              }}
                              onClick={() => {
                                if (isClickable) {
                                  onResumeSprint(selectedSprint.id, idx);
                                }
                              }}
                              title={isClickable ? 'Click to jump to this contact in the dialer' : ''}
                            >
                              <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                              <td style={{ padding: '0.5rem 0.6rem' }}>
                                <div style={{ fontWeight: 600, color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)' }}>{contact.name}</div>
                                {contact.company && (
                                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dark)' }}>{contact.company}</div>
                                )}
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)' }}>{contact.phone || '-'}</td>
                              <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>
                                {contact.value > 0 ? `${getCurrencySymbol(currency)}${contact.value.toLocaleString()}` : '-'}
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                                <span style={{ 
                                  fontSize: 'var(--text-2xs)', 
                                  fontWeight: 700, 
                                  padding: '0.1rem 0.4rem', 
                                  borderRadius: '4px',
                                  color: statusColor,
                                  background: statusBg,
                                  display: 'inline-block',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {statusLabel.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem' }}>
                                {contactLogs.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    {contactLogs.map((log, lIdx) => (
                                      <div key={lIdx} style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                                        <span style={{ fontWeight: 500 }}>
                                          {log.action === 'whatsapp' ? '💬 WhatsApp' : log.action === 'skip' ? '🚫 Skipped' : `📞 ${log.outcome}`}
                                        </span>
                                        {log.notes && (
                                          <span style={{ fontStyle: 'italic', color: 'var(--text-dark)', marginLeft: '0.3rem' }}>
                                            - "{log.notes}"
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-dark)', fontStyle: 'italic' }}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {(!selectedSprint.queue || selectedSprint.queue.length === 0) && (
                          <tr>
                            <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dark)' }}>
                              No contacts in this sprint queue.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <EmptyState
                icon={<ListCollapse size={20} />}
                heading="No sprint selected"
                sub="Select a sprint from the left panel to inspect detailed logs and reports."
                style={{ margin: 'auto 0' }}
              />
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
