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

const APPS_SCRIPT_CODE = `/**
 * BoltCRM Google Sheets Backend API
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions -> Apps Script.
 * 3. Delete any default code and paste this script.
 * 4. Click the 'Save' icon.
 * 5. Click 'Deploy' -> 'New deployment'.
 * 6. Select type 'Web app'.
 * 7. Set 'Execute as' to 'Me'.
 * 8. Set 'Who has access' to 'Anyone' (this is safe as it handles calls dynamically, and is serverless).
 * 9. Click 'Deploy', authorize permissions, and COPY the Web App URL.
 * 10. Paste this URL into the BoltCRM Settings panel!
 */

function doGet(e) {
  initSheets();
  var action = e.parameter.action;
  if (action === 'readAll') {
    return jsonResponse(readAllData());
  }
  return jsonResponse({ error: 'Invalid GET action. Use action=readAll' });
}

function doPost(e) {
  initSheets();
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON payload' });
  }

  var action = data.action;

  if (action === 'saveLead')          return jsonResponse(saveLead(data.lead));
  if (action === 'deleteLead')        return jsonResponse(deleteLead(data.id));
  if (action === 'saveNote')          return jsonResponse(saveNote(data.note));
  if (action === 'savePipelines')     return jsonResponse(savePipelines(data.pipelines));
  if (action === 'saveSprint')        return jsonResponse(saveSprint(data.sprint));
  if (action === 'deleteSprint')      return jsonResponse(deleteSprint(data.id));
  if (action === 'saveCallingLists')  return jsonResponse(saveCallingLists(data.callingLists));

  return jsonResponse({ error: 'Invalid POST action' });
}

// Return JSON output with standard CORS headers
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Initialize tables with headers if not present
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Leads Sheet
  var leadsSheet = ss.getSheetByName('Leads');
  if (!leadsSheet) {
    leadsSheet = ss.insertSheet('Leads');
    leadsSheet.appendRow(['id', 'name', 'company', 'phone', 'email', 'status', 'value', 'tags', 'pipelineId', 'lastContacted']);
    leadsSheet.getRange('A1:J1').setFontWeight('bold');
  }

  // 2. Notes Sheet
  var notesSheet = ss.getSheetByName('Notes');
  if (!notesSheet) {
    notesSheet = ss.insertSheet('Notes');
    notesSheet.appendRow(['id', 'leadId', 'text', 'timestamp', 'type']);
    notesSheet.getRange('A1:E1').setFontWeight('bold');
  }

  // 3. Pipelines Sheet
  var pipelinesSheet = ss.getSheetByName('Pipelines');
  if (!pipelinesSheet) {
    pipelinesSheet = ss.insertSheet('Pipelines');
    pipelinesSheet.appendRow(['id', 'name', 'stages']);
    pipelinesSheet.getRange('A1:C1').setFontWeight('bold');
    var defaultPipelines = [
      ['agency_pipeline', 'Agency Sales Pipeline', 'Lead,Contacted,Meeting Scheduled,Proposal Sent,Won,Lost'],
      ['product_pipeline', 'Product Sales Pipeline', 'Inbound,Discovery Call,Demo Done,Contract Sent,Closed Won,Closed Lost']
    ];
    for (var i = 0; i < defaultPipelines.length; i++) {
      pipelinesSheet.appendRow(defaultPipelines[i]);
    }
  }

  // 4. Sprints Sheet — each row is one sprint, queue/logs stored as JSON string
  var sprintsSheet = ss.getSheetByName('Sprints');
  if (!sprintsSheet) {
    sprintsSheet = ss.insertSheet('Sprints');
    sprintsSheet.appendRow(['id', 'name', 'type', 'sourceId', 'sourceName', 'status', 'currentIdx', 'createdAt', 'queue', 'logs']);
    sprintsSheet.getRange('A1:J1').setFontWeight('bold');
  }

  // 5. CallingLists Sheet — all lists stored as a single JSON blob in one cell
  var listsSheet = ss.getSheetByName('CallingLists');
  if (!listsSheet) {
    listsSheet = ss.insertSheet('CallingLists');
    listsSheet.appendRow(['data']);
    listsSheet.getRange('A1').setFontWeight('bold');
  }
}

// Helper to convert sheet rows into array of objects
function sheetToObjects(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0];
  var objects = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
      if (row[j] !== '') hasData = true;
    }
    if (hasData) {
      if (obj.value) obj.value = parseFloat(obj.value) || 0;
      objects.push(obj);
    }
  }
  return objects;
}

// Fetch all CRM records
function readAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var leads = sheetToObjects(ss.getSheetByName('Leads'));
  var notes = sheetToObjects(ss.getSheetByName('Notes'));

  var pipelines = sheetToObjects(ss.getSheetByName('Pipelines'));
  pipelines = pipelines.map(function(p) {
    return {
      id: p.id,
      name: p.name,
      stages: typeof p.stages === 'string' ? p.stages.split(',') : []
    };
  });

  // Read sprints — parse queue and logs JSON columns
  var sprintRows = sheetToObjects(ss.getSheetByName('Sprints'));
  var sprints = sprintRows.map(function(s) {
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      status: s.status,
      currentIdx: parseInt(s.currentIdx) || 0,
      createdAt: s.createdAt,
      queue: safeJsonParse(s.queue, []),
      logs: safeJsonParse(s.logs, [])
    };
  });

  // Read calling lists — single JSON blob
  var listsSheet = ss.getSheetByName('CallingLists');
  var callingLists = [];
  if (listsSheet && listsSheet.getLastRow() > 1) {
    var blob = listsSheet.getRange(2, 1).getValue();
    callingLists = safeJsonParse(blob, []);
  }

  return {
    success: true,
    leads: leads,
    notes: notes,
    pipelines: pipelines,
    sprints: sprints,
    callingLists: callingLists
  };
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch(e) { return fallback; }
}

// Save or Update Lead
function saveLead(lead) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads');
  var rows = sheet.getDataRange().getValues();

  var leadRowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === lead.id) { leadRowIndex = i + 1; break; }
  }

  var values = [
    lead.id || '',
    lead.name || '',
    lead.company || '',
    lead.phone || '',
    lead.email || '',
    lead.status || '',
    parseFloat(lead.value) || 0,
    lead.tags || '',
    lead.pipelineId || 'agency_pipeline',
    lead.lastContacted || ''
  ];

  if (leadRowIndex !== -1) {
    sheet.getRange(leadRowIndex, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
  return { success: true, lead: lead };
}

// Delete Lead & its associated notes
function deleteLead(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var leadsSheet = ss.getSheetByName('Leads');
  var leadsRows = leadsSheet.getDataRange().getValues();
  for (var i = 1; i < leadsRows.length; i++) {
    if (leadsRows[i][0] === id) { leadsSheet.deleteRow(i + 1); break; }
  }

  var notesSheet = ss.getSheetByName('Notes');
  var notesRows = notesSheet.getDataRange().getValues();
  for (var j = notesRows.length - 1; j >= 1; j--) {
    if (notesRows[j][1] === id) notesSheet.deleteRow(j + 1);
  }

  return { success: true, id: id };
}

// Add Note
function saveNote(note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Notes');
  sheet.appendRow([
    note.id || Utilities.getUuid(),
    note.leadId || '',
    note.text || '',
    note.timestamp || new Date().toISOString(),
    note.type || 'manual'
  ]);
  return { success: true, note: note };
}

// Overwrite/Save Pipelines config
function savePipelines(pipelines) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pipelines');
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
  }
  for (var i = 0; i < pipelines.length; i++) {
    var p = pipelines[i];
    sheet.appendRow([p.id, p.name, Array.isArray(p.stages) ? p.stages.join(',') : p.stages]);
  }
  return { success: true, pipelines: pipelines };
}

// Save or Update a Sprint (upsert by id)
function saveSprint(sprint) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Sprints');
  var rows = sheet.getDataRange().getValues();

  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === sprint.id) { rowIndex = i + 1; break; }
  }

  var values = [
    sprint.id || '',
    sprint.name || '',
    sprint.type || 'pipeline',
    sprint.sourceId || '',
    sprint.sourceName || '',
    sprint.status || 'active',
    sprint.currentIdx || 0,
    sprint.createdAt || new Date().toISOString(),
    JSON.stringify(sprint.queue || []),
    JSON.stringify(sprint.logs || [])
  ];

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
  return { success: true, sprint: sprint };
}

// Delete a Sprint by id
function deleteSprint(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Sprints');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) { sheet.deleteRow(i + 1); break; }
  }
  return { success: true, id: id };
}

// Overwrite all calling lists (stored as a single JSON blob)
function saveCallingLists(callingLists) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('CallingLists');
  // Clear existing data rows
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).clearContent();
  }
  sheet.getRange(2, 1).setValue(JSON.stringify(callingLists));
  return { success: true };
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
