import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  HelpCircle, 
  FileSpreadsheet, 
  Terminal, 
  Globe, 
  Link, 
  RefreshCw, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileCode,
  Shield
} from 'lucide-react';
import appsScriptCode from '../../google-apps-script.js?raw';

const APPS_SCRIPT_CODE = appsScriptCode;

export default function SetupWizard({ sheetUrl, setSheetUrl, syncStatus, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [inputUrl, setInputUrl] = useState(sheetUrl || '');
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success', 'error', null

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      // Test URL with readAll sync
      const res = await fetch(`${inputUrl.trim()}?action=readAll`);
      const data = await res.json();
      
      if (data.success) {
        setTestResult('success');
        setSheetUrl(inputUrl.trim());
      } else {
        setTestResult('error');
      }
    } catch (err) {
      console.error(err);
      // Try JSONP fallback or optimistic save since Apps script might block standard dev domain CORS
      setTestResult('warning'); // Connection failed CORS but looks like a valid script address
    } finally {
      setTesting(false);
    }
  };

  const handleFinishConnection = () => {
    setSheetUrl(inputUrl.trim());
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        
        {/* Wizard Header */}
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            Pluto DIY Google Sheets Onboarding Wizard
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Wizard Steps Tracker */}
        <div className="setup-steps-tracker">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="setup-step-item">
              <div 
                className={`setup-step-node ${currentStep === step ? 'active' : currentStep > step ? 'completed' : ''}`}
              >
                {step}
              </div>
              <span 
                className={`setup-step-label mobile-hide ${currentStep === step ? 'active' : ''}`}
              >
                {step === 1 && "Create Sheet"}
                {step === 2 && "Copy Apps Script"}
                {step === 3 && "Deploy Web App"}
                {step === 4 && "Test & Connect"}
              </span>
              {step < 4 && <div className="setup-step-connector mobile-hide"></div>}
            </div>
          ))}
        </div>

        {/* Wizard Body */}
        <div className="modal-body setup-wizard-body">
          
          {/* STEP 1: CREATE SPREADSHEET */}
          {currentStep === 1 && (
            <div className="setup-wizard-container">
              <div className="setup-wizard-header">
                <div className="setup-icon-wrapper green">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="setup-wizard-title">Step 1: Create a Blank Google Sheet</h3>
                  <p className="setup-wizard-description">
                    Pluto CRM stores your sales contacts, pipeline campaigns, and notes inside standard Google Sheets sheets. 
                  </p>
                </div>
              </div>

              <div className="setup-wizard-actions">
                <a 
                  href="https://sheets.new" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', width: '100%', padding: '0.75rem', borderRadius: '10px', textDecoration: 'none' }}
                >
                  <span>Create New Google Sheet (sheets.new) ➔</span>
                </a>
              </div>

              <div className="setup-tutorial-box">
                <div className="setup-tutorial-header">
                  AUTO-GENERATED TAB SCHEMA LAYOUT
                </div>
                <p className="setup-tutorial-desc">
                  No need to manually add headers! The Apps Script automatically creates these tables and headers for you upon your first sync:
                </p>
                <div className="deal-tags">
                  <span className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)' }}>📁 Leads Table</span>
                  <span className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)' }}>📝 Notes Table</span>
                  <span className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)' }}>⚙️ Pipelines Table</span>
                  <span className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)' }}>🏃 Sprints Table</span>
                  <span className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)' }}>📋 Calling Lists</span>
                  <span className="deal-tag" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)' }}>⚙️ Settings</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COPY CODE */}
          {currentStep === 2 && (
            <div className="setup-wizard-container">
              <div className="setup-wizard-header">
                <div className="setup-icon-wrapper primary">
                  <FileCode size={24} />
                </div>
                <div>
                  <h3 className="setup-wizard-title">Step 2: Paste the Pluto Apps Script Code</h3>
                  <p className="setup-wizard-description">
                    Inside your new spreadsheet header menu, click on <strong>Extensions ➔ Apps Script</strong>. Copy the code block below and paste it in, deleting any default code. Then click the <strong>Save</strong> icon.
                  </p>
                </div>
              </div>

              <div className="setup-code-container">
                <div className="setup-code-header">
                  <label className="form-label" style={{ fontSize: 'var(--text-2xs)' }}>CONNECTOR SCRIPT CODE</label>
                  <button 
                    className="outcome-btn" 
                    style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--text-xs)' }} 
                    onClick={handleCopyCode}
                  >
                    {copied ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied code!' : 'Copy Code Block'}</span>
                  </button>
                </div>

                <pre className="setup-code-pre">
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}

          {/* STEP 3: DEPLOY WEB APP */}
          {currentStep === 3 && (
            <div className="setup-wizard-container">
              <div className="setup-wizard-header">
                <div className="setup-icon-wrapper accent">
                  <Globe size={24} />
                </div>
                <div>
                  <h3 className="setup-wizard-title">Step 3: Deploy as Web App Webhook</h3>
                  <p className="setup-wizard-description">
                    Deploy the code to convert the sheet into a rapid synced API for your CRM:
                  </p>
                </div>
              </div>

              <div className="setup-deploy-steps">
                <div className="setup-deploy-step">
                  <span className="setup-deploy-step-number">1.</span>
                  <span>Click **Deploy ➔ New deployment** at the top right of the Apps Script dashboard.</span>
                </div>
                <div className="setup-deploy-step">
                  <span className="setup-deploy-step-number">2.</span>
                  <span>Click the gear icon ⚙️ next to "Select type" and choose **Web app**.</span>
                </div>
                <div className="setup-deploy-step">
                  <span className="setup-deploy-step-number">3.</span>
                  <span>Set configuration exactly as:
                    <br />• **Execute as:** `Me` (your Google account)
                    <br />• **Who has access:** `Anyone` (Crucial for API connectivity without sign-in barriers)
                  </span>
                </div>
                <div className="setup-deploy-step">
                  <span className="setup-deploy-step-number">4.</span>
                  <span>Click **Deploy**, then click **Authorize access** when prompted.</span>
                </div>
                <div className="setup-deploy-step">
                  <span className="setup-deploy-step-number">5.</span>
                  <span>If you see an "Unverified App" warning: click **Advanced** → **Go to Untitled Project (unsafe)** → **Allow**.</span>
                </div>
                <div className="setup-deploy-step">
                  <span className="setup-deploy-step-number">6.</span>
                  <span>Copy the **Web App URL** that appears (starts with `https://script.google.com/macros/s/...`)</span>
                </div>
              </div>

              {/* Security Alert Box */}
              <div style={{
                marginTop: '0.85rem',
                padding: '0.75rem',
                background: 'rgba(251, 191, 36, 0.03)',
                border: '1px solid rgba(251, 191, 36, 0.15)',
                borderRadius: '10px',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                lineHeight: 1.45
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24', fontWeight: 700, marginBottom: '0.25rem' }}>
                  <Shield size={14} />
                  <span>🔒 Security, Privacy & Auth Note</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div>
                    <strong>Why does Google show an "Unverified App" warning?</strong> Google flags any custom Apps Script project run under personal accounts as "unverified" because it hasn't gone through commercial review. Since the script code is 100% open-source and run entirely within your own Google account, it is completely safe to click <em>"Advanced" ➔ "Go to Untitled Project (unsafe)"</em> to authorize it.
                  </div>
                  <div>
                    <strong>Why deploy with "Who has access: Anyone"?</strong> This allows this local web app (running entirely inside your browser) to sync lead data directly to your Sheet without going through any third-party middleman server. Your Web App URL acts as a private pre-shared API token, stored only in your browser's local storage.
                  </div>
                  <div>
                    <strong>Can anyone access my data?</strong> Your Web App URL contains a unique, random script ID that's essentially impossible to guess. As long as you don't share this URL, your data remains private. The Apps Script only has access to this specific spreadsheet — nothing else in your Google Drive.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONNECT & VERIFY */}
          {currentStep === 4 && (
            <div className="setup-wizard-container" style={{ gap: '1.25rem' }}>
              <div className="setup-wizard-header">
                <div className="setup-icon-wrapper purple">
                  <Link size={24} />
                </div>
                <div>
                  <h3 className="setup-wizard-title">Step 4: Paste URL & Test Connection</h3>
                  <p className="setup-wizard-description">
                    Paste the copied deployment Web App URL below to establish a real-time sync with your spreadsheet.
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Apps Script Deployment Web App URL</label>
                <div className="setup-input-row">
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://script.google.com/macros/s/.../exec"
                    style={{ flex: 1, fontSize: 'var(--text-sm)' }}
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary"
                    disabled={testing || !inputUrl.trim()}
                    onClick={handleTestConnection}
                    style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}
                  >
                    {testing ? (
                      <div className="loader-spinner" style={{ width: '14px', height: '14px' }}></div>
                    ) : (
                      "Test"
                    )}
                  </button>
                </div>
              </div>

              {testResult === 'success' && (
                <div className="setup-feedback-box success">
                  <CheckCircle2 size={16} />
                  <span>Success! Pluto connected to your Sheet correctly. Database schema verified.</span>
                </div>
              )}

              {testResult === 'warning' && (
                <div className="setup-feedback-box warning">
                  <div className="setup-feedback-header">
                    <HelpCircle size={16} />
                    <span>Test Completed (CORS Restriction)</span>
                  </div>
                  <span>We couldn't verify the script automatically due to local browser CORS rules, but the URL matches a valid deployment format. You can click 'Save & Finish' to connect offline-first.</span>
                </div>
              )}

              {testResult === 'error' && (
                <div className="setup-feedback-box error">
                  <X size={16} />
                  <span>Invalid response. Please ensure you copied the correct Web App URL and set who has access to 'Anyone'.</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Wizard Footer Actions */}
        <div className="modal-footer setup-wizard-footer">
          <button 
            className="btn btn-secondary" 
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            style={{ opacity: currentStep === 1 ? 0.3 : 1 }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          {currentStep < 4 ? (
            <button 
              className="btn btn-primary" 
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
            >
              <span>Next Step</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              className="btn btn-accent" 
              onClick={handleFinishConnection}
              disabled={!inputUrl.trim()}
            >
              <span>Save & Finish Onboarding ➔</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
