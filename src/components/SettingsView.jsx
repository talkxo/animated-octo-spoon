import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  Copy,
  Check,
  HelpCircle,
  FileSpreadsheet,
  RefreshCw,
  Sliders,
  Trash,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Upload,
  Download,
  Link2,
} from 'lucide-react';
import { Users, UserMinus, UserPlus, Mail, X } from 'lucide-react';
import appsScriptCode from '../../google-apps-script.js?raw';
import { isConfigured } from '../firebase';
import { useSettings } from '../contexts/SettingsContext';
import { useCrm } from '../contexts/CrmContext';
import { useAuth } from '../hooks/useAuth';

export default function SettingsView({
  sheetUrl,
  setSheetUrl,
  syncStatus,
  onSyncClick,
  lastSyncTime,
  onOpenWizard,
  exportToSheet,
  importFromSheet,
  sheetExportStatus = 'idle',
}) {
  const { theme, toggleTheme, currency, updateCurrency, syncMode, updateSyncMode, whatsappTemplates, updateWhatsappTemplates } = useSettings();
  const { pipelines, updatePipelines, workspace } = useCrm();
  const { user } = useAuth();
  const [urlInput, setUrlInput] = useState(sheetUrl);
  const [copied, setCopied] = useState(false);
  const [showSecurityFaq, setShowSecurityFaq] = useState(false);
  const [showSheetsSetup, setShowSheetsSetup] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);
  const [qrKey, setQrKey] = useState(0);
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [leavingWorkspace, setLeavingWorkspace] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [emailAdding, setEmailAdding] = useState(false);

  const [inviteToken, setInviteToken] = useState(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(null);

  const generateInvite = useCallback(async () => {
    if (!workspace?.createInviteToken) return;
    const result = await workspace.createInviteToken();
    if (result) {
      setInviteToken(result.token);
      setInviteExpiresAt(result.expiresAt);
      setTimeLeft(900);
      setQrKey(k => k + 1);
    }
  }, [workspace]);

  useEffect(() => {
    if (isConfigured && workspace?.isOwner) generateInvite();
  }, [isConfigured, workspace?.isOwner]);

  useEffect(() => {
    if (!isConfigured || !workspace?.isOwner) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { generateInvite(); return 900; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isConfigured, workspace?.isOwner, generateInvite]);

  const [editingPipelineId, setEditingPipelineId] = useState(null);
  const [pipeName, setPipeName] = useState('');
  const [pipeStages, setPipeStages] = useState('');
  const [isNewPipeline, setIsNewPipeline] = useState(false);

  const [editingTempId, setEditingTempId] = useState(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempText, setTempText] = useState('');
  const [isNewTemplate, setIsNewTemplate] = useState(false);

  const startEditingTemplate = (temp) => {
    setEditingTempId(temp.id);
    setTempTitle(temp.title);
    setTempText(temp.text);
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectSheet = (e) => {
    e.preventDefault();
    setSheetUrl(urlInput.trim());
  };

  const handleDisconnectSheet = () => {
    setUrlInput('');
    setSheetUrl('');
  };

  const handleAddPipeline = () => {
    const newPipe = {
      id: `pipe-${Date.now()}`,
      name: 'New Custom Sales Funnel',
      stages: ['Lead', 'Contacted', 'Proposal Sent', 'Won', 'Lost']
    };
    updatePipelines([...pipelines, newPipe]);
    startEditingPipeline(newPipe);
    setIsNewPipeline(true);
  };

  const startEditingPipeline = (p) => {
    setEditingPipelineId(p.id);
    setPipeName(p.name);
    setPipeStages(p.stages.join(', '));
  };

  const handleSavePipeline = (id) => {
    const stagesList = pipeStages.split(',').map(s => s.trim()).filter(Boolean);
    if (!pipeName.trim() || stagesList.length < 2) {
      alert('Pipeline name is required and you must have at least 2 stages!');
      return;
    }
    updatePipelines(pipelines.map(p => p.id === id ? { ...p, name: pipeName, stages: stagesList } : p));
    setEditingPipelineId(null);
    setIsNewPipeline(false);
  };

  const handleCancelPipeline = (id) => {
    if (isNewPipeline) {
      updatePipelines(pipelines.filter(p => p.id !== id));
      setIsNewPipeline(false);
    }
    setEditingPipelineId(null);
  };

  const handleDeletePipeline = (id) => {
    if (pipelines.length <= 1) { alert('You must keep at least one pipeline!'); return; }
    if (confirm('Delete this pipeline and all its stages?')) {
      updatePipelines(pipelines.filter(p => p.id !== id));
    }
  };

  const saveTemplates = useCallback((updated) => {
    updateWhatsappTemplates(updated);
  }, [updateWhatsappTemplates]);

  const handleDeleteTemplate = (id) => {
    if (confirm('Delete this WhatsApp template?')) saveTemplates(whatsappTemplates.filter(t => t.id !== id));
  };

  const handleSaveTemplate = (id) => {
    if (!tempTitle.trim() || !tempText.trim()) { alert('Template title and text are required!'); return; }
    saveTemplates(whatsappTemplates.map(t => t.id === id ? { ...t, title: tempTitle, text: tempText } : t));
    setEditingTempId(null);
    setIsNewTemplate(false);
  };

  const handleCancelTemplate = (id) => {
    if (isNewTemplate) { saveTemplates(whatsappTemplates.filter(t => t.id !== id)); setIsNewTemplate(false); }
    setEditingTempId(null);
  };

  const handleAddTemplate = () => {
    const newTemp = { id: `temp-${Date.now()}`, title: '👋 New Outreach Template', text: 'Hey {{name}}! Hope you are doing great. Looking forward to our call!' };
    saveTemplates([...whatsappTemplates, newTemp]);
    startEditingTemplate(newTemp);
    setIsNewTemplate(true);
  };

  const handleResetData = async () => {
    if (resetConfirmText !== 'RESET') return;
    localStorage.removeItem('crm_leads');
    localStorage.removeItem('crm_notes');
    localStorage.removeItem('crm_pipelines');
    localStorage.removeItem('crm_wa_templates');
    localStorage.removeItem('crm_has_seen_wizard');
    window.location.reload();
  };

  const cardHeadingStyle = { fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' };
  const subsectionStyle = { borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' };

  return (
    <div className="settings-container">
      <div className="settings-layout-grid">

        {/* ════════════════════════════════════════════════════════════════
            LEFT COLUMN — Workspace & Team
            ════════════════════════════════════════════════════════════════ */}
        <div className="settings-layout-column">

          {/* ── 1. Workspace Preferences ──────────────────────────────── */}
          <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
            <h3 style={cardHeadingStyle}>
              <Settings size={16} style={{ color: 'var(--primary)' }} />
              Workspace
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Currency</label>
                <select className="form-select" value={currency} onChange={(e) => updateCurrency(e.target.value)}>
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="SGD">SGD (S$)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Theme</label>
                <button type="button" onClick={toggleTheme}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--text-body)', fontWeight: 600 }}>
                    {theme === 'dark' ? <Moon size={14} style={{ color: 'var(--primary)' }} /> : <Sun size={14} style={{ color: '#f59e0b' }} />}
                    <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                  </div>
                  <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: theme === 'dark' ? 'var(--primary)' : 'rgba(245,158,11,0.7)', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '2.5px', left: theme === 'dark' ? '18px' : '2.5px', width: '15px', height: '15px', borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  </div>
                </button>
              </div>
            </div>

            {!sheetUrl && (
              <button type="button" className="btn btn-secondary" onClick={onOpenWizard}
                style={{ width: '100%', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: 'var(--text-xs)' }}>
                <HelpCircle size={14} style={{ color: 'var(--primary)' }} />
                <span>Setup Wizard</span>
              </button>
            )}
          </div>

          {/* ── 2. Team Management (consolidated) ─────────────────────── */}
          {isConfigured && (
            <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
              <h3 style={cardHeadingStyle}>
                <Users size={16} style={{ color: 'var(--primary)' }} />
                Team ({workspace?.members?.length || 0})
              </h3>

              {/* Members list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {!workspace?.members && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', padding: '0.5rem 0', textAlign: 'center' }}>Loading…</div>
                )}
                {workspace?.members?.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', padding: '0.5rem 0', textAlign: 'center' }}>No teammates yet.</div>
                )}

                {(workspace?.members || []).map((member) => {
                  const isMe = member.uid === user?.uid;
                  const isConfirm = removingMemberId === member.uid;
                  return (
                    <div key={member.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '8px', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                        {member.photoURL ? (
                          <img src={member.photoURL} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-2xs)', flexShrink: 0 }}>
                            {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.displayName || member.email.split('@')[0]}
                            {isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--text-2xs)', marginLeft: '0.3rem' }}>(you)</span>}
                          </span>
                          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: 'var(--text-2xs)', padding: '0.1rem 0.4rem', borderRadius: '5px', fontWeight: 700, background: member.role === 'owner' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', color: member.role === 'owner' ? '#f59e0b' : '#3b82f6', border: member.role === 'owner' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(59,130,246,0.2)' }}>
                          {member.role === 'owner' ? 'Owner' : 'Member'}
                        </span>
                        {workspace?.isOwner && !isMe && (
                          isConfirm ? (
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button type="button" className="outcome-btn" style={{ padding: '0.2rem 0.4rem', fontSize: 'var(--text-2xs)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                onClick={async () => { await workspace.removeMember(member.uid); setRemovingMemberId(null); }}>Remove</button>
                              <button type="button" className="outcome-btn" style={{ padding: '0.2rem 0.4rem', fontSize: 'var(--text-2xs)' }} onClick={() => setRemovingMemberId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                              title="Remove" onClick={() => setRemovingMemberId(member.uid)}>
                              <UserMinus size={12} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}

                {!workspace?.isOwner && (
                  <div style={{ paddingTop: '0.35rem' }}>
                    {leavingWorkspace ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                        <span style={{ color: 'var(--text-muted)', flex: 1 }}>Leave? You'll lose access.</span>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: 'var(--text-2xs)', padding: '0.25rem 0.5rem', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                          onClick={async () => { await workspace.leaveWorkspace(); setLeavingWorkspace(false); }}>Confirm</button>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: 'var(--text-2xs)', padding: '0.25rem 0.5rem' }} onClick={() => setLeavingWorkspace(false)}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 'var(--text-2xs)', padding: '0.3rem 0.6rem', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => setLeavingWorkspace(true)}>
                        <UserMinus size={11} /> Leave Workspace
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Add by email (owner only) */}
              {workspace?.isOwner && (
                <div style={subsectionStyle}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <UserPlus size={13} style={{ color: 'var(--primary)' }} />
                    Add by Email
                  </div>
                  <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    Enter a Google email — they'll auto-join when they sign in.
                  </p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!emailInput.trim() || emailAdding) return;
                    setEmailAdding(true);
                    await workspace.addAllowedEmail(emailInput);
                    setEmailInput('');
                    setEmailAdding(false);
                  }} style={{ display: 'flex', gap: '0.4rem' }}>
                    <input type="email" className="form-input" placeholder="name@gmail.com" value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)} style={{ flex: 1, fontSize: 'var(--text-xs)', padding: '0.4rem 0.55rem' }} required />
                    <button type="submit" className="btn btn-primary" disabled={emailAdding}
                      style={{ padding: '0 0.7rem', fontSize: 'var(--text-2xs)', height: '32px', display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
                      <Plus size={12} />
                      <span>{emailAdding ? '...' : 'Add'}</span>
                    </button>
                  </form>

                  {workspace.allowedEmails?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {workspace.allowedEmails.map((email) => {
                        const joined = workspace.members?.some(m => m.email?.toLowerCase() === email.toLowerCase());
                        return (
                          <div key={email} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-light)', borderRadius: '20px', fontSize: 'var(--text-2xs)',
                          }}>
                            <Mail size={10} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ color: 'var(--text-main)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                            <span style={{ color: joined ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{joined ? 'Joined' : 'Pending'}</span>
                            <button type="button" onClick={() => workspace.removeAllowedEmail(email)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', color: 'var(--text-muted)', marginLeft: '0.1rem' }}>
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Invite link & QR (owner, collapsible) */}
              {workspace?.isOwner && (
                <div style={subsectionStyle}>
                  <button type="button" onClick={() => setShowInviteLink(!showInviteLink)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: 'var(--text-xs)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left' }}>
                    <Link2 size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>Invite Link & QR Code</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                      {showInviteLink ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  </button>

                  {showInviteLink && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.15rem' }}>
                      <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Share this single-use link or scan the QR. Expires in 15 min.
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ background: '#fff', padding: '5px', borderRadius: '6px', flexShrink: 0 }}>
                          {inviteToken ? (
                            <img key={qrKey}
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                window.location.origin + window.location.pathname + '?invite=' + encodeURIComponent(inviteToken) + '&expiresAt=' + inviteExpiresAt
                              )}`}
                              alt="QR" style={{ width: '64px', height: '64px', display: 'block' }} />
                          ) : (
                            <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '10px' }}>...</div>
                          )}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <input type="text" readOnly className="form-input"
                              style={{ flex: 1, fontSize: '10px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', color: 'var(--text-muted)', borderRadius: '6px', border: '1px solid var(--border-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              value={inviteToken ? window.location.origin + window.location.pathname + '?invite=' + inviteToken + '&expiresAt=' + inviteExpiresAt : 'Generating...'}
                              onClick={(e) => e.target.select()} />
                            <button type="button" className="btn btn-secondary"
                              style={{ padding: '0 0.6rem', fontSize: 'var(--text-2xs)', height: '28px', display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}
                              onClick={() => {
                                if (!inviteToken) return;
                                navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?invite=' + encodeURIComponent(inviteToken) + '&expiresAt=' + inviteExpiresAt);
                                alert('Invite link copied!');
                              }}>
                              <Copy size={10} /> Copy
                            </button>
                          </div>
                          <div style={{ fontSize: '10px', color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }} />
                            Expires in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!workspace?.isOwner && (
                <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, borderTop: '1px solid var(--border-light)', paddingTop: '0.6rem' }}>
                  Only the workspace owner can invite teammates.
                </p>
              )}
            </div>
          )}

          {/* ── 3. Danger Zone ────────────────────────────────────────── */}
          <div className="glass-card" style={{ borderColor: 'rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.02)', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, color: '#ef4444', fontSize: 'var(--text-sm)' }}>
                <AlertTriangle size={14} /> Danger Zone
              </h3>
              <button className="btn btn-secondary" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.3rem 0.65rem', fontSize: 'var(--text-2xs)' }}
                onClick={() => { setIsDangerZoneExpanded(!isDangerZoneExpanded); setResetConfirmText(''); }}>
                {isDangerZoneExpanded ? 'Hide' : 'Expand'}
              </button>
            </div>
            {isDangerZoneExpanded && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(239,68,68,0.1)' }}>
                <p style={{ margin: '0 0 0.6rem', fontSize: 'var(--text-2xs)', color: '#f87171', lineHeight: 1.4 }}>
                  Clears local browser cache. Firestore and Sheet data are preserved.
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                      Type <strong style={{ color: '#ef4444' }}>RESET</strong> to confirm:
                    </label>
                    <input type="text" className="form-input" placeholder="RESET"
                      style={{ borderColor: resetConfirmText === 'RESET' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.2)', fontSize: 'var(--text-xs)' }}
                      value={resetConfirmText} onChange={(e) => setResetConfirmText(e.target.value)} />
                  </div>
                  <button className="btn btn-danger" disabled={resetConfirmText !== 'RESET'}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 1rem', opacity: resetConfirmText === 'RESET' ? 1 : 0.5, cursor: resetConfirmText === 'RESET' ? 'pointer' : 'not-allowed' }}
                    onClick={handleResetData}>
                    <Trash size={13} /> Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT COLUMN — CRM & Data
            ════════════════════════════════════════════════════════════════ */}
        <div className="settings-layout-column">

          {/* ── 4. Sales Pipelines ────────────────────────────────────── */}
          <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Sliders size={16} style={{ color: 'var(--primary)' }} />
                Sales Pipelines
              </h3>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: 'var(--text-2xs)', height: '28px' }} onClick={handleAddPipeline}>
                <Plus size={12} /> Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {pipelines.map(pipe => (
                <div key={pipe.id} className="pipeline-item-box">
                  {editingPipelineId === pipe.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 'var(--text-2xs)' }}>Name</label>
                        <input type="text" className="form-input" style={{ padding: '0.4rem', fontSize: 'var(--text-xs)' }} value={pipeName} onChange={(e) => setPipeName(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 'var(--text-2xs)' }}>Stages (comma-separated)</label>
                        <input type="text" className="form-input" style={{ padding: '0.4rem', fontSize: 'var(--text-xs)' }} value={pipeStages} onChange={(e) => setPipeStages(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignSelf: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--text-2xs)' }} onClick={() => handleCancelPipeline(pipe.id)}>Cancel</button>
                        <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--text-2xs)' }} onClick={() => handleSavePipeline(pipe.id)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{pipe.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                          {pipe.stages.map((stage, idx) => (
                            <span key={idx} className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)', fontSize: 'var(--text-2xs)' }}>
                              {stage}{idx < pipe.stages.length - 1 && <span style={{ color: 'var(--primary)', marginLeft: '0.3rem' }}>→</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="outcome-btn" style={{ padding: '0.25rem 0.45rem', fontSize: 'var(--text-2xs)' }} onClick={() => startEditingPipeline(pipe)}>Edit</button>
                        <button className="outcome-btn" style={{ padding: '0.25rem', color: '#ef4444' }} onClick={() => handleDeletePipeline(pipe.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── 5. WhatsApp Templates ─────────────────────────────────── */}
          <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <MessageSquare size={16} style={{ color: '#10b981' }} />
                WhatsApp Templates
              </h3>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: 'var(--text-2xs)', height: '28px', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }} onClick={handleAddTemplate}>
                <Plus size={12} /> Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {whatsappTemplates.map(temp => (
                <div key={temp.id} className="whatsapp-temp-box">
                  {editingTempId === temp.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 'var(--text-2xs)' }}>Title</label>
                        <input type="text" className="form-input" style={{ padding: '0.4rem', fontSize: 'var(--text-xs)' }} value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 'var(--text-2xs)' }}>Message (tags: {"{{name}}"}, {"{{company}}"}, {"{{value}}"})</label>
                        <textarea className="form-input" rows={3} style={{ padding: '0.4rem', fontSize: 'var(--text-xs)', resize: 'none' }} value={tempText} onChange={(e) => setTempText(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignSelf: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--text-2xs)' }} onClick={() => handleCancelTemplate(temp.id)}>Cancel</button>
                        <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--text-2xs)', background: '#10b981' }} onClick={() => handleSaveTemplate(temp.id)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#10b981' }}>{temp.title}</div>
                        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginTop: '0.25rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{temp.text}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="outcome-btn" style={{ padding: '0.25rem 0.45rem', fontSize: 'var(--text-2xs)' }} onClick={() => startEditingTemplate(temp)}>Edit</button>
                        <button className="outcome-btn" style={{ padding: '0.25rem', color: '#ef4444' }} onClick={() => handleDeleteTemplate(temp.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── 6. Google Sheets (consolidated) ───────────────────────── */}
          <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
            <h3 style={cardHeadingStyle}>
              <Database size={16} style={{ color: 'var(--primary)' }} />
              Google Sheets
              {sheetUrl && (
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-2xs)', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Connected
                </span>
              )}
            </h3>

            <form onSubmit={handleConnectSheet} style={{ display: 'flex', gap: '0.4rem' }}>
              <input type="url" className="form-input" placeholder="Apps Script Web App URL"
                required style={{ flex: 1, fontSize: 'var(--text-xs)', padding: '0.4rem 0.55rem' }}
                value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
              {sheetUrl ? (
                <button type="button" className="btn btn-secondary" style={{ fontSize: 'var(--text-2xs)', padding: '0 0.65rem', height: '32px' }} onClick={handleDisconnectSheet}>Disconnect</button>
              ) : (
                <button type="submit" className="btn btn-primary" style={{ fontSize: 'var(--text-2xs)', padding: '0 0.8rem', height: '32px' }}>Connect</button>
              )}
            </form>

            {sheetUrl && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary"
                  style={{ flex: 1, minWidth: '110px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: 'var(--text-2xs)' }}
                  onClick={exportToSheet} disabled={sheetExportStatus === 'exporting'}>
                  <Upload size={12} />
                  {sheetExportStatus === 'exporting' ? 'Exporting...' : sheetExportStatus === 'done' ? 'Exported!' : 'Export to Sheet'}
                </button>
                <button type="button" className="btn btn-secondary"
                  style={{ flex: 1, minWidth: '110px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: 'var(--text-2xs)' }}
                  onClick={() => { if (confirm('Overwrite Firestore with sheet data?')) importFromSheet(); }}
                  disabled={sheetExportStatus === 'exporting'}>
                  <Download size={12} /> Import from Sheet
                </button>
              </div>
            )}
            {sheetUrl && lastSyncTime && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Last sync: {lastSyncTime}</div>
            )}

            <div style={subsectionStyle}>
              <button type="button" onClick={() => setShowSheetsSetup(!showSheetsSetup)}
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: 'var(--text-xs)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left' }}>
                <FileSpreadsheet size={13} style={{ color: 'var(--text-muted)' }} />
                <span>Setup Guide</span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                  {showSheetsSetup ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </span>
              </button>

              {showSheetsSetup && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.15rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <div>1. Open a blank Google Sheet (<code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.25rem', borderRadius: '3px', fontSize: '10px' }}>sheets.new</code>)</div>
                    <div>2. <strong>Extensions → Apps Script</strong></div>
                    <div>3. Delete default code, paste the script below</div>
                    <div>4. Save (Cmd+S), then <strong>Deploy → New deployment</strong></div>
                    <div>5. Type: <strong>Web app</strong>, Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong></div>
                    <div>6. Deploy, authorize, copy the <strong>Web App URL</strong></div>
                  </div>
                  <button className="btn btn-secondary" style={{ width: '100%', padding: '0.35rem', fontSize: 'var(--text-2xs)' }} onClick={handleCopyScriptCode}>
                    {copied ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                    <span>{copied ? 'Copied!' : 'Copy Apps Script Code'}</span>
                  </button>

                  <button type="button" onClick={() => setShowSecurityFaq(!showSecurityFaq)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--text-2xs)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.25rem 0 0', width: '100%', textAlign: 'left' }}>
                    <Shield size={11} /> Security & Privacy FAQ
                    <span style={{ marginLeft: 'auto' }}>{showSecurityFaq ? <ChevronUp size={11} /> : <ChevronDown size={11} />}</span>
                  </button>
                  {showSecurityFaq && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', lineHeight: 1.4, background: 'rgba(255,255,255,0.01)', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <div><strong style={{ color: 'var(--text-main)' }}>Is the "unverified app" warning safe?</strong><br />Yes — Google shows this for any personal Apps Script. The code is open-source and runs in your own account.</div>
                      <div><strong style={{ color: 'var(--text-main)' }}>Why "Anyone" access?</strong><br />Lets Pluto sync directly to your Sheet without a middleman server or OAuth.</div>
                      <div><strong style={{ color: 'var(--text-main)' }}>Can anyone see my data?</strong><br />Your Web App URL is a private key. It's stored only in your browser, never sent to third parties.</div>
                      <div><strong style={{ color: 'var(--text-main)' }}>What can the script access?</strong><br />Only the specific spreadsheet you created it in. No Drive, Gmail, or other Google services.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
