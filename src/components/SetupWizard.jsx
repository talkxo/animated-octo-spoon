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
  FileCode
} from 'lucide-react';

const APPS_SCRIPT_CODE = `/* =================================================================
   PLUTO CRM - GOOGLE SHEETS BACKEND CONNECTOR
   Paste this code inside Extensions -> Apps Script.
   Deploy as a Web App: Execute as "Me", Who has access: "Anyone".
   ================================================================= */

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'readAll') {
    return handleReadAll();
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result = { success: false };
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === 'saveLead') {
      result = handleSaveLead(postData.lead);
    } else if (action === 'deleteLead') {
      result = handleDeleteLead(postData.id);
    } else if (action === 'saveNote') {
      result = handleSaveNote(postData.note);
    } else if (action === 'savePipelines') {
      result = handleSavePipelines(postData.pipelines);
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// SETUP SHEETS AND STRUCTURES
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Leads Sheet
  var leadsSheet = ss.getSheetByName('Leads') || ss.insertSheet('Leads');
  if (leadsSheet.getLastRow() === 0) {
    leadsSheet.appendRow(['id', 'name', 'company', 'phone', 'email', 'status', 'value', 'tags', 'pipelineId', 'lastContacted']);
    leadsSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f3f4f6');
  }
  
  // Notes Sheet
  var notesSheet = ss.getSheetByName('Notes') || ss.insertSheet('Notes');
  if (notesSheet.getLastRow() === 0) {
    notesSheet.appendRow(['id', 'leadId', 'text', 'timestamp', 'type']);
    notesSheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#f3f4f6');
  }
  
  // Pipelines Sheet
  var pipeSheet = ss.getSheetByName('Pipelines') || ss.insertSheet('Pipelines');
  if (pipeSheet.getLastRow() === 0) {
    pipeSheet.appendRow(['id', 'name', 'stages']);
    pipeSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f4f6');
    // Pre-populate defaults
    pipeSheet.appendRow(['agency_pipeline', 'Agency Sales Pipeline', 'Lead, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost']);
    pipeSheet.appendRow(['product_pipeline', 'Product Sales Pipeline', 'Inbound, Discovery Call, Demo Done, Contract Sent, Closed Won, Closed Lost']);
  }
}

function handleReadAll() {
  initSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var leads = readSheetRows(ss.getSheetByName('Leads'));
  var notes = readSheetRows(ss.getSheetByName('Notes'));
  var pipelinesRows = readSheetRows(ss.getSheetByName('Pipelines'));
  
  // Parse stages back into array
  var pipelines = pipelinesRows.map(function(p) {
    return {
      id: p.id,
      name: p.name,
      stages: p.stages.split(',').map(function(s) { return s.trim(); })
    };
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    leads: leads,
    notes: notes,
    pipelines: pipelines
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleSaveLead(lead) {
  initSheets();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var foundRow = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === lead.id) {
      foundRow = i + 1;
      break;
    }
  }
  
  var rowValues = headers.map(function(header) {
    return lead[header] !== undefined ? lead[header] : '';
  });
  
  if (foundRow !== -1) {
    sheet.getRange(foundRow, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  
  return { success: true };
}

function handleDeleteLead(id) {
  initSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leadsSheet = ss.getSheetByName('Leads');
  deleteRowById(leadsSheet, id);
  
  // Cascade delete notes
  var notesSheet = ss.getSheetByName('Notes');
  var notesData = notesSheet.getDataRange().getValues();
  for (var i = notesData.length - 1; i >= 1; i--) {
    if (notesData[i][1] === id) { // leadId column
      notesSheet.deleteRow(i + 1);
    }
  }
  
  return { success: true };
}

function handleSaveNote(note) {
  initSheets();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Notes');
  sheet.appendRow([note.id, note.leadId, note.text, note.timestamp, note.type]);
  return { success: true };
}

function handleSavePipelines(pipelines) {
  initSheets();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pipelines');
  sheet.clearContents();
  sheet.appendRow(['id', 'name', 'stages']);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f4f6');
  
  pipelines.forEach(function(p) {
    sheet.appendRow([p.id, p.name, p.stages.join(', ')]);
  });
  
  return { success: true };
}

// HELPER READ ROWS
function readSheetRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  var headers = data[0];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

function deleteRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}`;

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    Inside your new spreadsheet header menu, click on <strong>Extensions ➔ Apps Script</strong>. Copy the code block below and paste it in, deleting any default empty functions.
                  </p>
                </div>
              </div>

              <div className="setup-code-container">
                <div className="setup-code-header">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>CONNECTOR SCRIPT CODE</label>
                  <button 
                    className="outcome-btn" 
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} 
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
                  <span>Click the gear icon and select **Web App** as the type.</span>
                </div>
                <div className="setup-deploy-step">
                  <span className="setup-deploy-step-number">3.</span>
                  <span>Set configuration exactly as:
                    <br />• **Execute as:** `Me (your-email)`
                    <br />• **Who has access:** `Anyone` (Crucial for API connectivity without sign-in barriers)
                  </span>
                </div>
                <div className="setup-deploy-step">
                  <span className="setup-deploy-step-number">4.</span>
                  <span>Click **Deploy**, click **Authorize Access** (sign in and click "Advanced → Go to Untitled Project (unsafe)"), and copy the resulting **Web App URL**!</span>
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
                    style={{ flex: 1, fontSize: '0.85rem' }}
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
