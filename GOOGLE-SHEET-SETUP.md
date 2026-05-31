# Pluto CRM — Google Sheet Setup Guide

This guide walks you through connecting Pluto CRM to a Google Sheet as a backend database.

---

## Overview

Pluto CRM uses Google Apps Script to create a REST API layer over your Google Sheet. This allows the web app to read and write CRM data (leads, notes, pipelines, sprints) directly to your sheet.

---

## Step-by-Step Setup

### Step 1: Create a New Google Sheet

1. Click this link to create a blank sheet: [sheets.new](https://sheets.new)
2. Optionally rename it (e.g., "Pluto CRM Database") by clicking the title at the top

---

### Step 2: Add the Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script** in the menu bar
2. Delete any default code that appears (like `function myFunction() {...}`)
3. Copy the entire contents of `google-apps-script.js` from this project
4. Paste it into the Apps Script editor
5. Click the **Save** icon (or press `Cmd+S` / `Ctrl+S`)

---

### Step 3: Deploy as Web App

1. Click **Deploy** → **New deployment** in the Apps Script menu
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app** and click **Done**
4. Configure the settings exactly as shown:
   - **Execute as:** `Me` (your Google account)
   - **Who has access:** `Anyone` (important for API access without login)
5. Click **Deploy**
6. When prompted to **Authorize access**:
   - Click **Review permissions**
   - Select your Google account
   - If you see a scary "App script isn't verified" warning:
     - Click **Advanced**
     - Click **Go to Untitled Project (unsafe)**
     - Click **Allow**
7. Copy the **Web App URL** that appears (it looks like:
   `https://script.google.com/macros/s/.../exec`)

---

### Step 4: Connect to Pluto CRM

1. In Pluto CRM, go to **Settings** (or click the setup wizard)
2. Paste the Web App URL into the **Google Sheet Backend URL** field
3. Click **Test Connection**
4. If successful, click **Save & Finish**

---

## What Gets Created

The Apps Script automatically creates these sheets in your Google Sheet:

| Sheet | Purpose |
|-------|--------|
| **Leads** | All your contacts with name, email, phone, status, deal value, tags |
| **Notes** | Conversation history and call logs for each lead |
| **Pipelines** | Your sales funnel configurations with stages |
| **Sprints** | Calling sprint progress and completed history |
| **CallingLists** | Custom uploaded call lists (from CSV imports) |
| **Settings** | App preferences like currency, theme, WhatsApp templates |

---

## How It Works

### The Big Picture

```
Your Browser (Pluto CRM)
        ↓
   Web App URL
        ↓
Google Apps Script (API Layer)
        ↓
   Your Google Sheet (Database)
```

### Data Flow

1. **Read**: Pluto sends `GET ?action=readAll` → Apps Script returns all data as JSON
2. **Write**: Pluto sends `POST { action: 'saveLead', lead: {...} }` → Apps Script updates the sheet
3. **Conflict Detection**: Each record has a `revision` number. If two devices try to update the same lead, the second one is rejected with a conflict error.

---

## Security & Privacy FAQ

### 🔒 Is the "Unverified App" warning safe to ignore?

**Yes.** Google shows this warning for ANY custom Apps Script run from a personal account. Since:
- The code is 100% open source (you can read it in `google-apps-script.js`)
- It runs entirely within your own Google account
- It only accesses the specific sheet you created it in

…it's completely safe to click **Advanced** → **Go to Untitled Project (unsafe)**.

### 🔒 Why set "Who has access" to "Anyone"?

This allows Pluto (running in your browser) to send HTTP requests directly to your sheet without requiring OAuth or a backend server. Your Web App URL acts as a **pre-shared secret token** — anyone who knows it can access your data.

**Important:** Treat your Web App URL like a password. Don't share it.

### 🔒 Can someone guess my URL and steal my data?

The URL contains a unique, randomly-generated script ID that's essentially impossible to guess. However, if you're concerned, you can:
- Restrict access to "Only yourself" (but this breaks CORS for the web app)
- Use Google Apps Script's new "Restricted" access level
- Deploy to a custom domain via Google App Engine (advanced)

### 🔒 What permissions does the script have?

The Apps Script only has access to:
- The specific spreadsheet it was created in
- Nothing else in your Google Drive
- No access to your Gmail, Contacts, Calendar, etc.

---

## Troubleshooting

### ❌ "Access Denied" when testing connection

**Cause:** Wrong deployment settings.

**Fix:** 
1. Go back to Apps Script
2. Click **Deploy** → **Manage deployments**
3. Click the edit icon (pencil) next to your deployment
4. Verify: **Execute as** = `Me`, **Who has access** = `Anyone`
5. Click **Deploy** again

---

### ❌ Data not syncing / empty response

**Cause:** Sheet hasn't been initialized yet.

**Fix:** Click **Pull from Sheet** in the Settings panel. This triggers the `initSheets()` function that creates all required tables with headers.

---

### ❌ "Conflict" error when saving

**Cause:** The record was modified on another device since you last pulled.

**Fix:** Click **Pull from Sheet** to get the latest data, then try saving again.

---

### ❌ CORS error in browser console

**Cause:** Browser blocking cross-origin request (common when testing locally).

**Fix:** The app has offline-first support. Data will be queued and synced when possible. The warning step in the setup wizard handles this gracefully.

---

### ❌ "Revision limit exceeded" error

**Cause:** Google Apps Script has a 20 deployment limit per script.

**Fix:** 
1. Click **Deploy** → **Manage deployments**
2. Delete old deployments you don't need
3. Create a new deployment

---

## API Reference

### GET Endpoint

```
GET {sheetUrl}?action=readAll
```

Returns all data:
```json
{
  "success": true,
  "leads": [...],
  "notes": [...],
  "pipelines": [...],
  "sprints": [...],
  "callingLists": [...],
  "settings": {...}
}
```

### POST Endpoints

```javascript
// Save or update a lead
POST { action: 'saveLead', lead: { id, name, email, company, ... } }

// Delete a lead
POST { action: 'deleteLead', id: '...', baseRevision: N }

// Add a note
POST { action: 'saveNote', note: { leadId, text, type } }

// Save pipelines
POST { action: 'savePipelines', pipelines: [...] }

// Save sprint
POST { action: 'saveSprint', sprint: {...} }

// Delete sprint  
POST { action: 'deleteSprint', id: '...' }

// Save calling lists
POST { action: 'saveCallingLists', callingLists: [...] }

// Save settings
POST { action: 'saveSettings', settings: { currency, theme, ... } }
```

---

## Going Further

### Deploying as a web app

To host Pluto as a public web app:

1. Deploy to Netlify, Vercel, or any static host
2. Each user creates their own Google Sheet + Apps Script
3. Each user gets their own private database (their own sheet)

### Want to add custom fields?

Edit the `LEADS_HEADERS` array in `google-apps-script.js`:

```javascript
var LEADS_HEADERS = ['id', 'name', 'company', 'phone', 'email', 'status', 'value', 'tags', 'pipelineId', 'lastContacted', 'revision', 'updatedAt', 'customField1', 'customField2'];
```

Then update the corresponding `normalizeLeadRecord()` and `buildLeadValues()` functions.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create a Google Sheet |
| 2 | Add the Apps Script code |
| 3 | Deploy as Web App (Execute as: Me, Access: Anyone) |
| 4 | Copy the Web App URL |
| 5 | Paste URL into Pluto CRM Settings |
| 6 | Done! Your CRM is now backed by your own Google Sheet |

---

*Need help? Open an issue on GitHub or check the README for more details.*
