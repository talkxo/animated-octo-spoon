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
  // Initialize spreadsheet sheets if they don't exist
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
  
  if (action === 'saveLead') {
    return jsonResponse(saveLead(data.lead));
  } else if (action === 'deleteLead') {
    return jsonResponse(deleteLead(data.id));
  } else if (action === 'saveNote') {
    return jsonResponse(saveNote(data.note));
  } else if (action === 'savePipelines') {
    return jsonResponse(savePipelines(data.pipelines));
  }
  
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
    // format headers bold
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
    
    // Add default pipelines
    var defaultPipelines = [
      ['agency_pipeline', 'Agency Sales Pipeline', 'Lead,Contacted,Meeting Scheduled,Proposal Sent,Won,Lost'],
      ['product_pipeline', 'Product Sales Pipeline', 'Inbound,Discovery Call,Demo Done,Contract Sent,Closed Won,Closed Lost']
    ];
    for (var i = 0; i < defaultPipelines.length; i++) {
      pipelinesSheet.appendRow(defaultPipelines[i]);
    }
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
      // Ensure id and number values are parsed cleanly
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
  
  // Map pipelines stages back to list
  pipelines = pipelines.map(function(p) {
    return {
      id: p.id,
      name: p.name,
      stages: typeof p.stages === 'string' ? p.stages.split(',') : []
    };
  });
  
  return {
    success: true,
    leads: leads,
    notes: notes,
    pipelines: pipelines
  };
}

// Save or Update Lead
function saveLead(lead) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads');
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  
  var leadRowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === lead.id) {
      leadRowIndex = i + 1; // 1-indexed for sheets range
      break;
    }
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
  
  // Delete from Leads sheet
  var leadsSheet = ss.getSheetByName('Leads');
  var leadsRows = leadsSheet.getDataRange().getValues();
  for (var i = 1; i < leadsRows.length; i++) {
    if (leadsRows[i][0] === id) {
      leadsSheet.deleteRow(i + 1);
      break;
    }
  }
  
  // Delete associated notes
  var notesSheet = ss.getSheetByName('Notes');
  var notesRows = notesSheet.getDataRange().getValues();
  var rowsDeleted = 0;
  for (var j = notesRows.length - 1; j >= 1; j--) {
    if (notesRows[j][1] === id) {
      notesSheet.deleteRow(j + 1);
      rowsDeleted++;
    }
  }
  
  return { success: true, id: id, notesDeletedCount: rowsDeleted };
}

// Add Note
function saveNote(note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Notes');
  
  var values = [
    note.id || Utilities.getUuid(),
    note.leadId || '',
    note.text || '',
    note.timestamp || new Date().toISOString(),
    note.type || 'manual'
  ];
  
  sheet.appendRow(values);
  return { success: true, note: note };
}

// Overwrite/Save Pipelines config
function savePipelines(pipelines) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pipelines');
  
  // Clear old entries
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
  }
  
  for (var i = 0; i < pipelines.length; i++) {
    var p = pipelines[i];
    var stagesStr = Array.isArray(p.stages) ? p.stages.join(',') : p.stages;
    sheet.appendRow([p.id, p.name, stagesStr]);
  }
  
  return { success: true, pipelines: pipelines };
}
