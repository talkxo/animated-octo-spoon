/**
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
}
