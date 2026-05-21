import React, { useState } from 'react';
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
  Trash
} from 'lucide-react';
import appsScriptCode from '../../google-apps-script.js?raw';

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
  flushSyncQueue
}) {
  const [urlInput, setUrlInput] = useState(sheetUrl);
  const [copied, setCopied] = useState(false);

  // Pipeline editing states
  const [editingPipelineId, setEditingPipelineId] = useState(null);
  const [pipeName, setPipeName] = useState('');
  const [pipeStages, setPipeStages] = useState('');
  
  // WhatsApp editing states
  const [editingTempId, setEditingTempId] = useState(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempText, setTempText] = useState('');

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

  // Add / Edit WhatsApp Templates
  const handleAddTemplate = () => {
    const newTemp = {
      id: `temp-${Date.now()}`,
      title: '👋 New Outreach Template',
      text: 'Hey {{name}}! Hope you are doing great. Looking forward to our call!'
    };
    const updated = [...whatsappTemplates, newTemp];
    setWhatsappTemplates(updated);
    startEditingTemplate(newTemp);
  };

  const startEditingTemplate = (t) => {
    setEditingTempId(t.id);
    setTempTitle(t.title);
    setTempText(t.text);
  };

  const handleSaveTemplate = (id) => {
    if (!tempTitle.trim() || !tempText.trim()) {
      alert('Template title and text are required!');
      return;
    }

    const updated = whatsappTemplates.map(t => {
      if (t.id === id) {
        return {
          ...t,
          title: tempTitle,
          text: tempText
        };
      }
      return t;
    });

    setWhatsappTemplates(updated);
    setEditingTempId(null);
  };

  const handleDeleteTemplate = (id) => {
    if (confirm('Delete this WhatsApp message template?')) {
      const updated = whatsappTemplates.filter(t => t.id !== id);
      setWhatsappTemplates(updated);
    }
  };

  // Clear / Reset local storage to mockup presets
  const handleResetData = () => {
    if (confirm('WARNING: This will reset all your locally saved leads and timeline notes back to the standard demo presets. Continue?')) {
      localStorage.removeItem('crm_leads');
      localStorage.removeItem('crm_notes');
      localStorage.removeItem('crm_pipelines');
      localStorage.removeItem('crm_wa_templates');
      localStorage.removeItem('crm_sheet_url');
      window.location.reload();
    }
  };

  return (
    <div className="settings-container">
      
      {/* 0. LOCAL PREFERENCES & CONFIGURATION */}
      <div className="glass-card settings-card-body">
        <h3 className="settings-section-title">
          <Settings size={18} style={{ color: 'var(--primary)' }} />
          Local Preferences & Configuration
        </h3>
        <div className="settings-grid">
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
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
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
        </div>
      </div>

      {/* 1. GOOGLE SHEETS BINDER PANEL */}
      <div className="glass-card settings-card-body">
        <h3 className="settings-section-title">
          <Database size={18} style={{ color: 'var(--primary)' }} />
          Google Sheets Database Configuration
        </h3>

        <form onSubmit={handleConnectSheet} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Google Apps Script Web App Endpoint URL</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="url" 
                className="form-input" 
                placeholder="e.g. https://script.google.com/macros/s/.../exec"
                required
                style={{ flex: 1, fontSize: '0.85rem' }}
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
          <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '10px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>✓ CONNECTED: </span>
              <span style={{ color: 'var(--text-muted)' }}>Sheet sync active (GET / POST rows ready).</span>
              {lastSyncTime && <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)', marginTop: '0.15rem' }}>Last synced: {lastSyncTime}</div>}
            </div>
            <button className="outcome-btn" style={{ padding: '0.35rem 0.65rem' }} onClick={onSyncClick}>
              <RefreshCw size={12} />
              <span>Fetch Now</span>
            </button>
          </div>
        )}

        {/* SHEETS BACKEND INSTALL TUTORIAL */}
        <div className="settings-tutorial-box">
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileSpreadsheet size={15} style={{ color: 'var(--primary)' }} />
            HOW TO SETUP GOOGLE SHEET IN 3 MINUTES
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            <div>1. Open a blank Google Sheet.</div>
            <div>2. Open <strong>Extensions ➔ Apps Script</strong> inside the sheet header menu.</div>
            <div>3. Copy the Apps Script code using the button below (or open the <strong>google-apps-script.js</strong> file in the project).</div>
            <div>4. Paste this code block into the Apps Script editor, replacing any default lines, and click Save.</div>
            <div>5. Click <strong>Deploy ➔ New deployment</strong>. Select type <strong>Web app</strong>.</div>
            <div>6. Configure: <strong>Execute as: "Me"</strong> and <strong>Who has access: "Anyone"</strong> (crucial for lightweight webhook fetch). Click Deploy.</div>
            <div>7. Authorize access, copy the generated <strong>Web App URL</strong>, and paste it into the input field above!</div>
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', marginTop: '0.25rem' }}
            onClick={handleCopyScriptCode}
          >
            {copied ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
            <span>{copied ? 'Code copied!' : 'Copy Apps Script Code'}</span>
          </button>
        </div>
      </div>

      {/* 1.5 LOCAL-FIRST SYNC MANAGER */}
      {sheetUrl && (
        <div className="glass-card settings-card-body">
          <h3 className="settings-section-title">
            <RefreshCw size={18} style={{ color: 'var(--primary)' }} />
            Sync & Queue Configuration
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
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
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: syncMode === 'auto' ? 'var(--primary)' : 'var(--text-main)' }}>
                    ⚡ Auto background sync
                  </span>
                  <input 
                    type="radio" 
                    name="syncMode" 
                    checked={syncMode === 'auto'} 
                    onChange={() => {}} 
                    style={{ accentColor: 'var(--primary)' }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35, margin: 0 }}>
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
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: syncMode === 'manual' ? 'var(--primary)' : 'var(--text-main)' }}>
                    🎯 Manual batch sync
                  </span>
                  <input 
                    type="radio" 
                    name="syncMode" 
                    checked={syncMode === 'manual'} 
                    onChange={() => {}} 
                    style={{ accentColor: 'var(--primary)' }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35, margin: 0 }}>
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
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></span>
                    {syncQueue.length} PENDING LOCAL EDITS
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Edits are buffered locally and have not been pushed to Google Sheets yet.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="outcome-btn" 
                    style={{ padding: '0.4rem 0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.75rem' }} 
                    onClick={clearSyncQueue}
                  >
                    Discard Edits
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', height: '32px', fontSize: '0.75rem' }} 
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
                  
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }}>
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

      {/* 2. SALES PIPELINES / FUNNELS EDITOR */}
      <div className="glass-card settings-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="settings-section-title">
            <Sliders size={18} style={{ color: 'var(--primary)' }} />
            Pipeline Campaigns & Stages Manager
          </h3>
          
          <button className="outcome-btn" style={{ padding: '0.4rem 0.65rem' }} onClick={handleAddPipeline}>
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
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Campaign Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                      value={pipeName}
                      onChange={(e) => setPipeName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Pipeline Stages (comma-separated, in order)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                      value={pipeStages}
                      onChange={(e) => setPipeStages(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setEditingPipelineId(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleSavePipeline(pipe.id)}>
                      Save Funnel
                    </button>
                  </div>
                </div>
              ) : (
                // View layout
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{pipe.name}</div>
                    
                    {/* Stages horizontal pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                      {pipe.stages.map((stage, idx) => (
                        <span key={idx} className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)', fontSize: '0.65rem' }}>
                          {stage}
                          {idx < pipe.stages.length - 1 && <span style={{ color: 'var(--primary)', marginLeft: '0.35rem' }}>➔</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="outcome-btn" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} onClick={() => startEditingPipeline(pipe)}>
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

      {/* 3. WHATSAPP TEMPLATES PANEL */}
      <div className="glass-card settings-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="settings-section-title" style={{ color: '#10b981' }}>
            <MessageSquare size={18} />
            WhatsApp Outreach Slugs Templates
          </h3>
          
          <button className="outcome-btn" style={{ padding: '0.4rem 0.65rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)', background: 'rgba(16,185,129,0.05)' }} onClick={handleAddTemplate}>
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
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Template Title / Emoji</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Message Text (Support tags: {"{{name}}"}, {"{{company}}"}, {"{{value}}"})</label>
                    <textarea 
                      className="form-input" 
                      rows={3}
                      style={{ padding: '0.5rem', fontSize: '0.85rem', resize: 'none' }}
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setEditingTempId(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#10b981' }} onClick={() => handleSaveTemplate(temp.id)}>
                      Save Template
                    </button>
                  </div>
                </div>
              ) : (
                // View template
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981' }}>{temp.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {temp.text}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="outcome-btn" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} onClick={() => startEditingTemplate(temp)}>
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

      {/* 4. DANGER RESET SYSTEM ACTIONS */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239,68,68,0.03)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h4 style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 700 }}>Dangerous Area</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', margin: 0 }}>Reset all records, cached sync URLs, pipelines and templates.</p>
        </div>
        
        <button className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem' }} onClick={handleResetData}>
          <Trash size={14} />
          <span>Reset CRM Database</span>
        </button>
      </div>

    </div>
  );
}
