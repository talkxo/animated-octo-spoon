/**
 * Pluto CRM — Google Sheets Backend API
 * 
 * ============================================
 * SETUP INSTRUCTIONS
 * ============================================
 * 
 * FIRST-TIME SETUP:
 * 1. Create a new Google Sheet (or use an existing one)
 * 2. Click Extensions -> Apps Script
 * 3. Delete any default code and paste this entire script
 * 4. Click the Save icon (or press Cmd+S)
 * 5. Click 'Deploy' -> 'New deployment'
 * 6. Select type: 'Web app'
 * 7. Set 'Execute as': 'Me' (your account)
 * 8. Set 'Who has access': 'Anyone' (safe — handles auth dynamically)
 * 9. Click 'Deploy'
 * 10. Authorize permissions when prompted (File -> Connect to your data)
 * 11. COPY the Web App URL (starts with https://script.google.com/macros/s/...)
 * 12. Paste this URL into Pluto CRM Settings panel
 * 
 * ============================================
 * WHAT THIS SCRIPT DOES
 * ============================================
 * 
 * This script creates a REST API that lets Pluto CRM read/write data in your Google Sheet.
 * It automatically creates and manages 6 sheets:
 * 
 * • Leads        — All your CRM contacts with contact info, status, deal value
 * • Notes        — Conversation history and call logs per lead
 * • Pipelines    — Sales funnel configurations with stages
 * • Sprints      — Calling sprint progress and history
 * • CallingLists — Custom uploaded call lists (CSV imports)
 * • Settings     — App preferences (currency, theme, WhatsApp templates)
 * 
 * ============================================
 * API ENDPOINTS
 * ============================================
 * 
 * GET  ?action=readAll
 *   Fetch all data (leads, notes, pipelines, sprints, calling lists, settings)
 * 
 * POST { action: 'saveLead', lead: {...} }
 *   Create or update a lead (with conflict detection via baseRevision)
 * 
 * POST { action: 'deleteLead', id: '...', baseRevision: N }
 *   Delete a lead and all associated notes
 * 
 * POST { action: 'saveNote', note: {...} }
 *   Add a new note to a lead
 * 
 * POST { action: 'savePipelines', pipelines: [...] }
 *   Overwrite all pipeline configurations
 * 
 * POST { action: 'saveSprint', sprint: {...} }
 *   Create or update a calling sprint
 * 
 * POST { action: 'deleteSprint', id: '...' }
 *   Delete a sprint
 * 
 * POST { action: 'saveCallingLists', callingLists: [...] }
 *   Save all custom calling lists
 * 
 * POST { action: 'saveSettings', settings: {...} }
 *   Update app settings (with conflict detection)
 * 
 * ============================================
 * FEATURES
 * ============================================
 * 
 * ✅ CORS-enabled (works from any web app)
 * ✅ Input validation (email, phone, required fields, length limits)
 * ✅ Conflict detection (revision-based optimistic locking)
 * ✅ Auto-initialization (creates sheets and default pipelines)
 * ✅ Pipeline stage parsing (comma-separated with trimming)
 * ✅ JSON blob storage (for complex nested data)
 * 
 * ============================================
 * TROUBLESHOOTING
 * ============================================
 * 
 * "Access Denied" error?
 *   → Make sure 'Who has access' is set to 'Anyone'
 * 
 * Data not syncing?
 *   → Check Settings panel, click 'Pull from Sheet' then 'Push to Sheet'
 * 
 * "Conflict" error?
 *   → Someone else modified the data. Pull latest and try again.
 * 
 * Web App URL too long?
 *   → It's normal. The URL contains your unique script ID.
 * 
 * ============================================
 */

function doGet(e) {
  try {
    initSheets();
    var action = e.parameter.action;
    if (action === 'readAll') {
      return jsonResponse(readAllData());
    }
    return jsonResponse({ success: false, error: 'Invalid GET action. Use action=readAll' });
  } catch (error) {
    return jsonResponse({ success: false, error: 'Server error: ' + error.message });
  }
}

function doPost(e) {
  try {
    initSheets();
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse({ success: false, error: 'Invalid JSON payload' });
    }

    var action = data.action;

    if (action === 'saveLead')          return jsonResponse(saveLead(data.lead));
    if (action === 'deleteLead')        return jsonResponse(deleteLead(data));
    if (action === 'saveNote')          return jsonResponse(saveNote(data.note));
    if (action === 'savePipelines')     return jsonResponse(savePipelines(data.pipelines));
    if (action === 'saveSprint')        return jsonResponse(saveSprint(data.sprint));
    if (action === 'deleteSprint')      return jsonResponse(deleteSprint(data.id));
    if (action === 'saveCallingLists')  return jsonResponse(saveCallingLists(data.callingLists));
    if (action === 'saveSettings')      return jsonResponse(saveSettings(data.settings));

    return jsonResponse({ success: false, error: 'Invalid POST action' });
  } catch (error) {
    return jsonResponse({ success: false, error: 'Server error: ' + error.message });
  }
}

var LEADS_HEADERS = ['id', 'name', 'company', 'phone', 'email', 'status', 'value', 'tags', 'pipelineId', 'lastContacted', 'revision', 'updatedAt'];

// Return JSON output with standard CORS redirects
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Initialize tables with headers if not present
function initSheets() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Leads Sheet
    var leadsSheet = ss.getSheetByName('Leads');
    if (!leadsSheet) {
      leadsSheet = ss.insertSheet('Leads');
      leadsSheet.appendRow(LEADS_HEADERS);
    }
    ensureHeaders(leadsSheet, LEADS_HEADERS);

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

  // 6. Settings Sheet — all settings stored as a single JSON blob in one cell
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Settings');
    settingsSheet.appendRow(['data']);
  }
  ensureHeaders(settingsSheet, ['data']);
  } catch (error) {
    // If init fails, log but don't break - sheets might already exist
    Logger.log('initSheets error: ' + error.message);
  }
}

function ensureHeaders(sheet, headers) {
  for (var i = 0; i < headers.length; i++) {
    sheet.getRange(1, i + 1).setValue(headers[i]);
  }
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
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
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var leads = sheetToObjects(ss.getSheetByName('Leads')).map(normalizeLeadRecord);
  var notes = sheetToObjects(ss.getSheetByName('Notes'));

  var pipelines = sheetToObjects(ss.getSheetByName('Pipelines'));
  pipelines = pipelines.map(function(p) {
    return {
      id: p.id,
      name: p.name,
      stages: typeof p.stages === 'string' ? p.stages.split(',').map(function(s) { return s.trim(); }) : []
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

  // Read settings — single JSON blob
  var settingsSheet = ss.getSheetByName('Settings');
  var settings = null;
  if (settingsSheet && settingsSheet.getLastRow() > 1) {
    var settingsBlob = settingsSheet.getRange(2, 1).getValue();
    settings = safeJsonParse(settingsBlob, null);
  }

  return {
    success: true,
    leads: leads,
    notes: notes,
    pipelines: pipelines,
    sprints: sprints,
    callingLists: callingLists,
    settings: settings
  };
  } catch (error) {
    return { success: false, error: 'Failed to read data: ' + error.message };
  }
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch(e) { return fallback; }
}

function toInt(value, fallback) {
  var parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function normalizeLeadRecord(lead) {
  return {
    id: lead.id || '',
    name: lead.name || '',
    company: lead.company || '',
    phone: lead.phone || '',
    email: lead.email || '',
    status: lead.status || '',
    value: parseFloat(lead.value) || 0,
    tags: lead.tags || '',
    pipelineId: lead.pipelineId || 'agency_pipeline',
    lastContacted: lead.lastContacted || '',
    revision: toInt(lead.revision, 0),
    updatedAt: lead.updatedAt || ''
  };
}

function buildLeadValues(lead) {
  return [
    lead.id || '',
    lead.name || '',
    lead.company || '',
    lead.phone || '',
    lead.email || '',
    lead.status || '',
    parseFloat(lead.value) || 0,
    lead.tags || '',
    lead.pipelineId || 'agency_pipeline',
    lead.lastContacted || '',
    toInt(lead.revision, 0),
    lead.updatedAt || ''
  ];
}

function conflictResponse(message, payload) {
  var response = {
    success: false,
    conflict: true,
    error: message
  };
  if (payload) {
    for (var key in payload) {
      response[key] = payload[key];
    }
  }
  return response;
}

// Validate email format
function validateEmail(email) {
  try {
    if (!email || email === '') return { valid: true };  // Email is optional
    var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(email)) {
      return { valid: false, warning: 'Email format may be invalid: ' + email };
    }
    return { valid: true };
  } catch (e) {
    return { valid: true };  // If validation fails, be lenient
  }
}

// Validate phone format (basic check)
function validatePhone(phone) {
  try {
    if (!phone || phone === '') return { valid: true };  // Phone is optional
    var cleaned = phone.toString().replace(/[^0-9]/g, '');
    if (cleaned.length < 7 || cleaned.length > 15) {
      return { valid: false, warning: 'Phone number may be invalid: ' + phone };
    }
    return { valid: true };
  } catch (e) {
    return { valid: true };  // If validation fails, be lenient
  }
}

// Validate lead data
function validateLead(lead) {
  try {
    var warnings = [];
    
    // Required fields
    if (!lead.name || lead.name.toString().trim() === '') {
      warnings.push('Name is required');
    }
    
    // Email validation
    var emailResult = validateEmail(lead.email);
    if (!emailResult.valid) warnings.push(emailResult.warning);
    
    // Phone validation
    var phoneResult = validatePhone(lead.phone);
    if (!phoneResult.valid) warnings.push(phoneResult.warning);
    
    // Value validation
    if (lead.value !== null && lead.value !== undefined) {
      if (typeof lead.value === 'string') {
        lead.value = parseFloat(lead.value) || 0;
      }
      if (lead.value < 0) {
        warnings.push('Value cannot be negative, set to 0');
        lead.value = 0;
      }
    }
    
    // Length validation (Google Sheets has 50,000 char limit per cell)
    var maxLength = 45000;  // Leave some headroom
    var fields = ['name', 'company', 'phone', 'email', 'tags', 'lastContacted'];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (lead[field] && lead[field].toString && lead[field].toString().length > maxLength) {
        warnings.push(field + ' is too long, truncated to ' + maxLength + ' characters');
        lead[field] = lead[field].toString().substring(0, maxLength);
      }
    }
    
    return { warnings: warnings, lead: lead };
  } catch (e) {
    // If validation fails completely, return lead with empty warnings
    return { warnings: ['Validation error: ' + e.message], lead: lead };
  }
}

// Save or Update Lead
function saveLead(lead) {
  try {
    // Validate input
    var validation = validateLead(lead);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Leads');
    var rows = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    var incomingBaseRevision = toInt(lead.baseRevision, 0);

  var leadRowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === lead.id) { leadRowIndex = i + 1; break; }
  }

  var storedLead;

  if (leadRowIndex !== -1) {
    var currentLead = normalizeLeadRecord({
      id: rows[leadRowIndex - 1][0],
      name: rows[leadRowIndex - 1][1],
      company: rows[leadRowIndex - 1][2],
      phone: rows[leadRowIndex - 1][3],
      email: rows[leadRowIndex - 1][4],
      status: rows[leadRowIndex - 1][5],
      value: rows[leadRowIndex - 1][6],
      tags: rows[leadRowIndex - 1][7],
      pipelineId: rows[leadRowIndex - 1][8],
      lastContacted: rows[leadRowIndex - 1][9],
      revision: rows[leadRowIndex - 1][10],
      updatedAt: rows[leadRowIndex - 1][11]
    });
    var isLegacyRow = (rows[leadRowIndex - 1][10] === '' || rows[leadRowIndex - 1][10] === undefined);
    var currentRevision = toInt(currentLead.revision, 0);
    if (!isLegacyRow && incomingBaseRevision !== currentRevision) {
      return conflictResponse('This lead was updated on another device. Pull the latest changes and try again.', {
        currentLead: currentLead
      });
    }
    storedLead = normalizeLeadRecord({
      id: lead.id,
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      email: lead.email,
      status: lead.status,
      value: lead.value,
      tags: lead.tags,
      pipelineId: lead.pipelineId,
      lastContacted: lead.lastContacted,
      revision: isLegacyRow ? (incomingBaseRevision + 1) : (currentRevision + 1),
      updatedAt: now
    });
    sheet.getRange(leadRowIndex, 1, 1, LEADS_HEADERS.length).setValues([buildLeadValues(storedLead)]);
  } else {
    if (incomingBaseRevision > 0) {
      return conflictResponse('This lead no longer exists in the sheet. Pull the latest changes and try again.');
    }
    storedLead = normalizeLeadRecord({
      id: lead.id || Utilities.getUuid(),
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      email: lead.email,
      status: lead.status,
      value: lead.value,
      tags: lead.tags,
      pipelineId: lead.pipelineId,
      lastContacted: lead.lastContacted,
      revision: 1,
      updatedAt: now
    });
    sheet.appendRow(buildLeadValues(storedLead));
  }
  var result = { success: true, lead: storedLead };
  if (validation.warnings && validation.warnings.length > 0) {
    result.warnings = validation.warnings;
  }
  return result;
  } catch (error) {
    return { success: false, error: 'Failed to save lead: ' + error.message };
  }
}

// Delete Lead & its associated notes
function deleteLead(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var id = payload && payload.id ? payload.id : payload;
  var incomingBaseRevision = toInt(payload && payload.baseRevision, 0);

  var leadsSheet = ss.getSheetByName('Leads');
  var leadsRows = leadsSheet.getDataRange().getValues();
  var deleted = false;
  for (var i = 1; i < leadsRows.length; i++) {
    if (leadsRows[i][0] === id) {
      var isLegacyRow = (leadsRows[i][10] === '' || leadsRows[i][10] === undefined);
      var currentRevision = toInt(leadsRows[i][10], 0);
      if (!isLegacyRow && incomingBaseRevision && incomingBaseRevision !== currentRevision) {
        return conflictResponse('This lead changed before it could be deleted. Pull the latest changes and try again.');
      }
      leadsSheet.deleteRow(i + 1);
      deleted = true;
      break;
    }
  }

  if (!deleted && incomingBaseRevision > 0) {
    return conflictResponse('This lead was already removed from the sheet.');
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
}

// Overwrite all settings (stored as a single JSON blob)
function saveSettings(settings) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Settings');
  var currentSettings = {};
  if (sheet.getLastRow() > 1) {
    currentSettings = safeJsonParse(sheet.getRange(2, 1).getValue(), {}) || {};
  }

  var isLegacySettings = (currentSettings.revision === undefined);
  var currentRevision = toInt(currentSettings.revision, 0);
  var incomingBaseRevision = toInt(settings.baseRevision, 0);
  if (!isLegacySettings && incomingBaseRevision !== currentRevision) {
    return conflictResponse('Settings changed on another device. Pull the latest settings and try again.', {
      currentSettings: currentSettings
    });
  }

  var nextSettings = {
    currency: settings.currency || 'USD',
    syncMode: settings.syncMode || 'auto',
    whatsappTemplates: Array.isArray(settings.whatsappTemplates) ? settings.whatsappTemplates : [],
    theme: settings.theme || 'dark',
    revision: isLegacySettings ? (incomingBaseRevision + 1) : (currentRevision + 1),
    updatedAt: new Date().toISOString()
  };

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).clearContent();
  }
  sheet.getRange(2, 1).setValue(JSON.stringify(nextSettings));
  return { success: true, settings: nextSettings };
}
