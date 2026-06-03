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
  Grid,
  RefreshCw,
  Sliders,
  Trash,
  Smartphone,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Sun,
  Moon
} from 'lucide-react';
import { Users, UserMinus, UserCheck, Mail } from 'lucide-react';
import appsScriptCode from '../../google-apps-script.js?raw';
import { isConfigured } from '../firebase';

export default function SettingsView({ 
  sheetUrl, 
  setSheetUrl, 
  syncStatus, 
  onSyncClick, 
  pipelines, 
  updatePipelines,
  whatsappTemplates, 
  setWhatsappTemplates,
  lastSyncTime,
  currency,
  setCurrency,
  onOpenWizard,
  syncMode,
  setSyncMode,
  syncQueue = [],
  clearSyncQueue,
  flushSyncQueue,
  theme,
  toggleTheme,
  // Firebase workspace props
  workspace,
  user,
}) {
  const [urlInput, setUrlInput] = useState(sheetUrl);
  const [copied, setCopied] = useState(false);
  const [showSecurityFaq, setShowSecurityFaq] = useState(false);
  const [showSheetsConfig, setShowSheetsConfig] = useState(!sheetUrl);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + 300000);
  const [qrKey, setQrKey] = useState(0);
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Invite-token QR state
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(null);

  // Generate first invite token when settings open and sheet is connected
  const generateInvite = useCallback(async () => {
    if (!workspace?.createInviteToken) return;
    const result = await workspace.createInviteToken();
    if (result) {
      setInviteToken(result.token);
      setInviteExpiresAt(result.expiresAt);
      setTimeLeft(300);
      setQrKey(k => k + 1);
    }
  }, [workspace]);

  useEffect(() => {
    if (sheetUrl && workspace?.isOwner) generateInvite();
  }, [sheetUrl, workspace?.isOwner]);

  // Countdown timer — auto-regenerate on expiry
  useEffect(() => {
    if (!sheetUrl || !workspace?.isOwner) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          generateInvite();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sheetUrl, workspace?.isOwner, generateInvite]);

  // Pipeline editing states
  const [editingPipelineId, setEditingPipelineId] = useState(null);
  const [pipeName, setPipeName] = useState('');
  const [pipeStages, setPipeStages] = useState('');
  const [isNewPipeline, setIsNewPipeline] = useState(false);
  
  // WhatsApp editing states
  const [editingTempId, setEditingTempId] = useState(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempText, setTempText] = useState('');
  const [isNewTemplate, setIsNewTemplate] = useState(false);

  // Apps Script Guide copy handler
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

  // Add / Edit Pipeline
  const handleAddPipeline = () => {
    const newPipe = {
      id: `pipe-${Date.now()}`,
      name: 'New Custom Sales Funnel',
      stages: ['Lead', 'Contacted', 'Proposal Sent', 'Won', 'Lost']
    };
    const updated = [...pipelines, newPipe];
    updatePipelines(updated);
    startEditingPipeline(newPipe);
    setIsNewPipeline(true);
  };

  const startEditingPipeline = (p) => {
    setEditingPipelineId(p.id);
    setPipeName(p.name);
    setPipeStages(p.stages.join(', '));
  };

  const handleSavePipeline = (id) => {
    const stagesList = pipeStages
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (!pipeName.trim() || stagesList.length < 2) {
      alert('Pipeline name is required and you must have at least 2 stages!');
      return;
    }

    const updated = pipelines.map(p => {
      if (p.id === id) {
        return {
          ...p,
          name: pipeName,
          stages: stagesList
        };
      }
      return p;
    });

    updatePipelines(updated);
    setEditingPipelineId(null);
    setIsNewPipeline(false);
  };

  const handleCancelPipeline = (id) => {
    if (isNewPipeline) {
      const updated = pipelines.filter(p => p.id !== id);
      updatePipelines(updated);
      setIsNewPipeline(false);
    }
    setEditingPipelineId(null);
  };

  const handleDeletePipeline = (id) => {
    if (pipelines.length <= 1) {
      alert('You must keep at least one pipeline configuration!');
      return;
    }
    if (confirm('Are you sure you want to delete this entire pipeline and all its stages?')) {
      const updated = pipelines.filter(p => p.id !== id);
      updatePipelines(updated);
    }
  };

  const handleDeleteTemplate = (id) => {
    if (confirm('Delete this WhatsApp message template?')) {
      const updated = whatsappTemplates.filter(t => t.id !== id);
      saveTemplates(updated);
    }
  };

  const handleSaveTemplate = (id) => {
    if (!tempTitle.trim() || !tempText.trim()) {
      alert('Template title and text are required!');
      return;
    }
    const updated = whatsappTemplates.map(t =>
      t.id === id ? { ...t, title: tempTitle, text: tempText } : t
    );
    saveTemplates(updated);
    setEditingTempId(null);
    setIsNewTemplate(false);
  };

  const handleCancelTemplate = (id) => {
    if (isNewTemplate) {
      const updated = whatsappTemplates.filter(t => t.id !== id);
      saveTemplates(updated);
      setIsNewTemplate(false);
    }
    setEditingTempId(null);
  };

  const handleAddTemplate = () => {
    const newTemp = {
      id: `temp-${Date.now()}`,
      title: '👋 New Outreach Template',
      text: 'Hey {{name}}! Hope you are doing great. Looking forward to our call!'
    };
    const updated = [...whatsappTemplates, newTemp];
    saveTemplates(updated);
    startEditingTemplate(newTemp);
    setIsNewTemplate(true);
  };

  // Clear / Reset — post-Firebase version disconnects from workspace
  const handleResetData = async () => {
    if (resetConfirmText !== 'RESET') return;
    localStorage.removeItem('crm_leads');
    localStorage.removeItem('crm_notes');
    localStorage.removeItem('crm_pipelines');
    localStorage.removeItem('crm_wa_templates');
    localStorage.removeItem('crm_has_seen_wizard');
    window.location.reload();
  };

  // Save WhatsApp templates to Firestore workspace or localStorage
  const saveTemplates = useCallback((updated) => {
    setWhatsappTemplates(updated);
    if (isConfigured && workspace?.saveWsSettings) {
      workspace.saveWsSettings({ whatsappTemplates: updated });
    } else {
      localStorage.setItem('crm_wa_templates', JSON.stringify(updated));
    }
  }, [workspace, setWhatsappTemplates, isConfigured]);

  return (
    <div className="settings-container">
      
      <div className="settings-layout-grid">
        
        {/* LEFT COLUMN: Preferences, Sync & Sheets Connection */}
        <div className="settings-layout-column">
          
          {/* Preferences & Sync to Mobile */}
          <div className={`settings-pref-row ${isConfigured && sheetUrl ? 'connected' : ''}`}>
            {/* Currency & Preferences */}
            <div className="glass-card settings-card-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <Settings size={16} style={{ color: 'var(--primary)' }} />
                Local Preferences
              </h3>

              <div className="form-group">
                <label className="form-label">Global Currency</label>
                <select 
                  className="form-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
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

              {/* Theme Toggle */}
              <div className="form-group" style={{ marginTop: '0.85rem' }}>
                <label className="form-label">Interface Theme</label>
                <button
                  type="button"
                  onClick={toggleTheme}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-body)', fontWeight: 600 }}>
                    {theme === 'dark'
                      ? <Moon size={15} style={{ color: 'var(--primary)' }} />
                      : <Sun size={15} style={{ color: '#f59e0b' }} />
                    }
                    <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  {/* Pill toggle */}
                  <div style={{
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: theme === 'dark' ? 'var(--primary)' : 'rgba(245,158,11,0.7)',
                    position: 'relative',
                    transition: 'background 0.25s',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '3px',
                      left: theme === 'dark' ? '20px' : '3px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.25s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </div>
                </button>
              </div>

              {!sheetUrl && (
                <div className="form-group" style={{ marginTop: '0.85rem' }}>
                  <label className="form-label">Onboarding Guide</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={onOpenWizard}
                    style={{ width: '100%', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <HelpCircle size={15} style={{ color: 'var(--primary)' }} />
                    <span>Launch DIY Setup Wizard</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sync & Invite Column */}
            {isConfigured && sheetUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. Sync to Mobile Card */}
                <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
                  <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <Smartphone size={16} style={{ color: '#f59e0b' }} />
                    Sync to Mobile
                  </h3>
                  <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                    Scan to open Pluto and sync this CRM workspace directly to your mobile phone or tablet browser:
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', display: 'inline-block', flexShrink: 0 }}>
                      {inviteToken ? (
                        <img
                          key={qrKey}
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                            window.location.origin + window.location.pathname +
                            '?invite=' + encodeURIComponent(inviteToken) +
                            '&expiresAt=' + inviteExpiresAt
                          )}`}
                          alt="Scan to open on mobile"
                          style={{ width: '80px', height: '80px', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '11px', textAlign: 'center' }}>
                          Generating…
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        Requires you to sign in with your Google account. Scan this code using your mobile device's camera.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Workspace Invite Link Card */}
                <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
                  <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                    <Users size={16} style={{ color: 'var(--primary)' }} />
                    Workspace Invite Link
                  </h3>
                  
                  {workspace?.isOwner ? (
                    <>
                      <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                        Copy and share this invite link to add teammates to your collaborative workspace:
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                        {/* URL Box and Copy Button */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            readOnly
                            className="form-input"
                            style={{
                              flex: 1,
                              fontSize: 'var(--text-2xs)',
                              fontFamily: 'monospace',
                              background: 'rgba(255,255,255,0.03)',
                              padding: '0.45rem 0.6rem',
                              color: 'var(--text-muted)',
                              borderRadius: '6px',
                              border: '1px solid var(--border-light)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            value={inviteToken ? (
                              window.location.origin + window.location.pathname +
                              '?invite=' + inviteToken +
                              '&expiresAt=' + inviteExpiresAt
                            ) : 'Generating invite link...'}
                            onClick={(e) => e.target.select()}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{
                              padding: '0 0.8rem',
                              fontSize: 'var(--text-xs)',
                              height: '32px',
                              display: 'flex',
                              gap: '0.3rem',
                              alignItems: 'center',
                              flexShrink: 0
                            }}
                            onClick={() => {
                              if (!inviteToken) return;
                              const link = window.location.origin + window.location.pathname +
                                '?invite=' + encodeURIComponent(inviteToken) +
                                '&expiresAt=' + inviteExpiresAt;
                              navigator.clipboard.writeText(link);
                              alert('Invite link copied! Send it to your teammate. Expires in 5 minutes.');
                            }}
                          >
                            <Copy size={12} />
                            <span>Copy Link</span>
                          </button>
                        </div>

                        {/* Expiry metadata and countdown */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.15rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: 'var(--text-2xs)',
                            color: '#f87171',
                            fontWeight: 700
                          }}>
                            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                            <span>Single-use link · Expires in 5m</span>
                          </div>

                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            fontSize: 'var(--text-2xs)', color: '#fbbf24',
                            background: 'rgba(251,191,36,0.04)', padding: '0.25rem 0.45rem',
                            borderRadius: '6px', border: '1px solid rgba(251,191,36,0.15)'
                          }}>
                            <RefreshCw size={10} style={{ animation: 'spin 10s linear infinite' }} />
                            <span>Refreshes in <strong>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</strong></span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                      You joined this workspace via invite. Only the workspace owner can generate new invite links.
                    </p>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* LOCAL-FIRST SYNC MANAGER */}
          {sheetUrl && (
            <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
              <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <RefreshCw size={16} style={{ color: 'var(--primary)' }} />
                Sync & Queue Configuration
              </h3>
              <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Pluto is designed local-first. All your edits are immediately written to your browser database and work completely offline. Select how changes sync to your Google Sheet:
              </p>

              <div className="settings-grid">
                {/* Auto Sync Selection */}
                <div 
                  onClick={() => setSyncMode('auto')}
                  className={`sync-mode-card ${syncMode === 'auto' ? 'sync-mode-card-active' : ''}`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: 'var(--text-title-3)', color: syncMode === 'auto' ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Zap size={14} style={{ color: 'var(--primary)' }} />
                        Auto background sync
                      </span>
                      <input 
                        type="radio" 
                        name="syncMode" 
                        checked={syncMode === 'auto'} 
                        onChange={() => {}} 
                        style={{ accentColor: 'var(--primary)' }}
                      />
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.35, margin: 0 }}>
                      Changes are automatically pushed to your sheet. If you lose connection, edits are queued and retried when online.
                    </p>
                  </div>
                </div>

                {/* Manual Sync Selection */}
                <div 
                  onClick={() => setSyncMode('manual')}
                  className={`sync-mode-card ${syncMode === 'manual' ? 'sync-mode-card-active' : ''}`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: 'var(--text-title-3)', color: syncMode === 'manual' ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Target size={14} style={{ color: 'var(--primary)' }} />
                        Manual batch sync
                      </span>
                      <input 
                        type="radio" 
                        name="syncMode" 
                        checked={syncMode === 'manual'} 
                        onChange={() => {}} 
                        style={{ accentColor: 'var(--primary)' }}
                      />
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.35, margin: 0 }}>
                      Buffer your modifications locally. Review, batch-verify, and push edits manually to Google Sheets when you are ready.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sync Queue Dashboard if there are pending items */}
              {syncQueue.length > 0 && (
                <div className="sync-queue-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-body)', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></span>
                        {syncQueue.length} PENDING LOCAL EDITS
                      </div>
                      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Edits are buffered locally and have not been pushed to Google Sheets yet.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 'var(--text-xs)', height: '32px' }} 
                        onClick={clearSyncQueue}
                      >
                        Discard Edits
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', height: '32px', fontSize: 'var(--text-xs)' }} 
                        onClick={() => flushSyncQueue()}
                      >
                        <RefreshCw size={12} />
                        <span>Push to Sheet</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible queue item preview */}
                  <div className="sync-queue-list">
                    {syncQueue.map((item, idx) => {
                      let desc = '';
                      if (item.action === 'saveLead') desc = `Update lead details for "${item.lead.name}"`;
                      if (item.action === 'deleteLead') desc = `Delete lead ID "${item.id}"`;
                      if (item.action === 'saveNote') desc = `Add timeline note for lead ID "${item.note.leadId}"`;
                      if (item.action === 'savePipelines') desc = `Save campaign pipelines configuration`;
                      if (item.action === 'saveCallingLists') desc = `Save call lists & queue state`;
                      if (item.action === 'saveSettings') desc = `Save global preferences & WhatsApp templates`;
                      
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{idx + 1}. {item.action}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GOOGLE SHEETS BINDER PANEL */}
          <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowSheetsConfig(!showSheetsConfig)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: 'var(--text-title-3)',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                padding: 0,
                width: '100%',
                textAlign: 'left'
              }}
            >
              <Database size={16} style={{ color: 'var(--primary)' }} />
              <span>Google Sheets Database</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                {showSheetsConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>

            {showSheetsConfig && (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <form onSubmit={handleConnectSheet} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Google Apps Script Web App Endpoint URL</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="e.g. https://script.google.com/macros/s/.../exec"
                        required
                        style={{ flex: 1, fontSize: 'var(--text-sm)' }}
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      
                      {sheetUrl ? (
                        <button type="button" className="btn btn-secondary" onClick={handleDisconnectSheet}>
                          Clear Url
                        </button>
                      ) : (
                        <button type="submit" className="btn btn-primary" style={{ padding: '0 1.25rem' }}>
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                {sheetUrl && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '10px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 'var(--text-xs)' }}>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>✓ CONNECTED: </span>
                        <span style={{ color: 'var(--text-muted)' }}>Sheet sync active.</span>
                        {lastSyncTime && <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dark)', marginTop: '0.15rem' }}>Last synced: {lastSyncTime}</div>}
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)', height: '32px' }} onClick={onSyncClick}>
                        <RefreshCw size={12} />
                        <span>Fetch Now</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SHEETS BACKEND INSTALL TUTORIAL */}
                <div className="settings-tutorial-box" style={{ marginTop: '0.75rem' }}>
                  <div className="section-label" style={{ marginBottom: '0.5rem' }}>
                    <FileSpreadsheet size={14} />
                    <span>Setup Google Sheet in 3 minutes</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--text-body)', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <div>1. Open a blank Google Sheet (create via <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: 'var(--text-xs)' }}>sheets.new</code>).</div>
                    <div>2. Click <strong>Extensions ➔ Apps Script</strong>.</div>
                    <div>3. Delete default code and paste the Apps Script code.</div>
                    <div>4. Save the project (Cmd+S).</div>
                    <div>5. Click <strong>Deploy ➔ New deployment</strong>.</div>
                    <div>6. Select <strong>Web app</strong> type.</div>
                    <div>7. Set: <strong>Execute as:</strong> <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: 'var(--text-xs)' }}>Me</code> and <strong>Who has access:</strong> <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: 'var(--text-xs)' }}>Anyone</code>.</div>
                    <div>8. Click <strong>Deploy</strong>, authorize permissions, and copy the <strong>Web App URL</strong>.</div>
                  </div>

                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '0.45rem', fontSize: 'var(--text-xs)', marginTop: '0.25rem' }}
                    onClick={handleCopyScriptCode}
                  >
                    {copied ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    <span>{copied ? 'Code copied!' : 'Copy Apps Script Code'}</span>
                  </button>
                </div>

                {/* Security FAQ Section */}
                <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowSecurityFaq(!showSecurityFaq)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-main)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      padding: 0,
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <Shield size={14} style={{ color: 'var(--primary)' }} />
                    <span>🔒 Security & Privacy FAQ</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                      {showSecurityFaq ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  
                  {showSecurityFaq && (
                    <div style={{ 
                      marginTop: '0.65rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.75rem', 
                      fontSize: 'var(--text-xs)', 
                      color: 'var(--text-muted)', 
                      lineHeight: 1.45,
                      background: 'rgba(255, 255, 255, 0.01)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.15rem' }}>
                          Is the Google "unverified app" screen safe?
                        </strong>
                        Yes. Google displays this standard warning for any custom Apps Script project hosted under your own personal Google Account. Since the script code is 100% open source and runs entirely within your own Google account, it is completely secure to authorize.
                      </div>
                      
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.15rem' }}>
                          Why is access set to "Anyone"?
                        </strong>
                        This setting allows Pluto (running locally in your browser) to sync data directly to your Sheet without a middleman server. It eliminates the need for OAuth flows or third-party authentication services.
                      </div>
                      
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.15rem' }}>
                          Can anyone else access my data?
                        </strong>
                        Your Web App URL acts as a private API Key. As long as you do not share this URL, your data remains secure. Pluto saves this URL only in your browser's local storage; it is never transmitted to any third-party server. The URL contains a unique, randomly-generated script ID that's essentially impossible to guess.
                      </div>
                      
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.15rem' }}>
                          What files can the script access?
                        </strong>
                        The script is restricted to the specific spreadsheet file you created it in. It has no access to any other files in your Google Drive, your Gmail, Contacts, Calendar, or any other Google service.
                      </div>
                      
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.15rem' }}>
                          What data gets stored in my sheet?
                        </strong>
                        The Apps Script automatically creates 6 tables: Leads (your contacts), Notes (conversation history), Pipelines (sales funnel config), Sprints (calling progress), CallingLists (custom uploads), and Settings (app preferences). All data is stored as plain text/JSON in your sheet — you can view and edit everything directly.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Pipelines & Customizations */}
        <div className="settings-layout-column">
          
          {/* SALES PIPELINES / FUNNELS EDITOR */}
          <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Sliders size={16} style={{ color: 'var(--primary)' }} />
                Pipeline Campaigns & Stages
              </h3>
              
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)', height: '32px' }} onClick={handleAddPipeline}>
                <Plus size={13} />
                <span>Add Pipeline</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pipelines.map(pipe => (
                <div 
                  key={pipe.id} 
                  className="pipeline-item-box"
                >
                  {editingPipelineId === pipe.id ? (
                    // Editing layout
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Campaign Name</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '0.5rem', fontSize: 'var(--text-sm)' }}
                          value={pipeName}
                          onChange={(e) => setPipeName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Pipeline Stages (comma-separated, in order)</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '0.5rem', fontSize: 'var(--text-sm)' }}
                          value={pipeStages}
                          onChange={(e) => setPipeStages(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)' }} onClick={() => handleCancelPipeline(pipe.id)}>
                          Cancel
                        </button>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)' }} onClick={() => handleSavePipeline(pipe.id)}>
                          Save Funnel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View layout
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-title-3)', color: 'var(--text-main)' }}>{pipe.name}</div>
                        
                        {/* Stages horizontal pills */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                          {pipe.stages.map((stage, idx) => (
                            <span key={idx} className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)', fontSize: 'var(--text-2xs)' }}>
                              {stage}
                              {idx < pipe.stages.length - 1 && <span style={{ color: 'var(--primary)', marginLeft: '0.35rem' }}>➔</span>}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="outcome-btn" style={{ padding: '0.3rem 0.5rem', fontSize: 'var(--text-xs)' }} onClick={() => startEditingPipeline(pipe)}>
                          Edit
                        </button>
                        <button className="outcome-btn" style={{ padding: '0.3rem', color: '#ef4444' }} onClick={() => handleDeletePipeline(pipe.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* WHATSAPP TEMPLATES PANEL */}
          <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <MessageSquare size={16} style={{ color: '#10b981' }} />
                WhatsApp Outreach Slugs Templates
              </h3>
              
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)', height: '32px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }} onClick={handleAddTemplate}>
                <Plus size={13} />
                <span>Add Template</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {whatsappTemplates.map(temp => (
                <div 
                  key={temp.id} 
                  className="whatsapp-temp-box"
                >
                  {editingTempId === temp.id ? (
                    // Editing template
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Template Title / Emoji</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '0.5rem', fontSize: 'var(--text-sm)' }}
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Message Text (Support tags: {"{{name}}"}, {"{{company}}"}, {"{{value}}"})</label>
                        <textarea 
                          className="form-input" 
                          rows={3}
                          style={{ padding: '0.5rem', fontSize: 'var(--text-sm)', resize: 'none' }}
                          value={tempText}
                          onChange={(e) => setTempText(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)' }} onClick={() => handleCancelTemplate(temp.id)}>
                          Cancel
                        </button>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)', background: '#10b981' }} onClick={() => handleSaveTemplate(temp.id)}>
                          Save Template
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View template
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-title-3)', color: '#10b981' }}>{temp.title}</div>
                        <div style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)', marginTop: '0.35rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                          {temp.text}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="outcome-btn" style={{ padding: '0.3rem 0.5rem', fontSize: 'var(--text-xs)' }} onClick={() => startEditingTemplate(temp)}>
                          Edit
                        </button>
                        <button className="outcome-btn" style={{ padding: '0.3rem', color: '#ef4444' }} onClick={() => handleDeleteTemplate(temp.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* TEAM MEMBERS PANEL */}
          {isConfigured && sheetUrl && (
            <div className="glass-card settings-card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <Users size={16} style={{ color: 'var(--primary)' }} />
                  Team Members ({workspace?.members?.length || 0})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(workspace?.members || []).map((member) => {
                  const isMe = member.uid === user?.uid;
                  return (
                    <div 
                      key={member.uid} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        {member.photoURL ? (
                          <img 
                            src={member.photoURL} 
                            alt={member.displayName || member.email} 
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            background: 'var(--primary-glow)', 
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 'var(--text-xs)'
                          }}>
                            {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.displayName || member.email.split('@')[0]}
                            {isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--text-2xs)', marginLeft: '0.35rem' }}>(you)</span>}
                          </span>
                          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.email}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Role badge */}
                        <span 
                          style={{ 
                            fontSize: 'var(--text-2xs)', 
                            padding: '0.15rem 0.45rem', 
                            borderRadius: '6px',
                            fontWeight: 700,
                            background: member.role === 'owner' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: member.role === 'owner' ? '#f59e0b' : '#3b82f6',
                            border: member.role === 'owner' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)'
                          }}
                        >
                          {member.role === 'owner' ? 'Owner' : 'Member'}
                        </span>

                        {/* Owner actions: can remove other members */}
                        {workspace?.isOwner && !isMe && (
                          <button 
                            type="button"
                            className="outcome-btn" 
                            style={{ padding: '0.3rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                            title="Remove from workspace"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${member.displayName || member.email} from the workspace? They will be disconnected.`)) {
                                workspace.removeMember(member.uid);
                              }
                            }}
                          >
                            <UserMinus size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* 5. DANGER RESET SYSTEM ACTIONS */}
        <div 
          className="glass-card" 
          style={{ 
            borderColor: 'rgba(239, 68, 68, 0.2)', 
            background: 'rgba(239, 68, 68, 0.02)', 
            padding: '1rem', 
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', color: '#ef4444' }}>
                <AlertTriangle size={16} />
                Danger Zone
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>Reset local CRM cache. Your Google Sheet data is never deleted.</p>
            </div>
            
            <button 
              className="btn btn-secondary" 
              style={{ 
                borderColor: 'rgba(239, 68, 68, 0.3)', 
                color: '#ef4444',
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                padding: '0.4rem 0.8rem',
                fontSize: 'var(--text-xs)'
              }} 
              onClick={() => {
                setIsDangerZoneExpanded(!isDangerZoneExpanded);
                setResetConfirmText('');
              }}
            >
              {isDangerZoneExpanded ? 'Hide actions' : 'Reveal actions'}
            </button>
          </div>

          {isDangerZoneExpanded && (
            <div 
              style={{ 
                marginTop: '1rem', 
                paddingTop: '1rem', 
                borderTop: '1px solid rgba(239, 68, 68, 0.1)'
              }}
            >
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: '#f87171', lineHeight: '1.4' }}>
                  <strong>WARNING:</strong> This clears your local browser cache (leads, notes, pipelines, templates). <strong>Your Google Sheet data is preserved</strong> and will re-sync on next load. You will remain signed in.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                    To confirm, type <strong style={{ color: '#ef4444' }}>RESET</strong> below:
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Type RESET to confirm"
                    style={{ 
                      borderColor: resetConfirmText === 'RESET' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.2)',
                      fontSize: 'var(--text-sm)'
                    }}
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                  />
                </div>

                <button 
                  className="btn btn-danger" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem', 
                    padding: '0.5rem 1.25rem',
                    opacity: resetConfirmText === 'RESET' ? 1 : 0.5,
                    cursor: resetConfirmText === 'RESET' ? 'pointer' : 'not-allowed'
                  }} 
                  disabled={resetConfirmText !== 'RESET'}
                  onClick={handleResetData}
                >
                  <Trash size={14} />
                  <span>Reset Local Cache</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
