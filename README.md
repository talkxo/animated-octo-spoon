# Pluto CRM — App Overview & Sprint Calling Guide

## What is Pluto?

**Pluto** is a lightweight, browser-based CRM built for solo sellers and small sales teams. It lives entirely in your browser — all data is stored locally with optional two-way sync to a **Google Sheet** as a backend. There's nothing to install and no subscription required.

### Core Features

| Feature | What it does |
|---|---|
| **Funnels Board** | A Kanban-style drag-and-drop pipeline to manage leads across stages (e.g. Lead → Contacted → Proposal Sent → Won) |
| **Calling Sprint** | A focused outreach mode that queues up leads and lets you dial, log outcomes, and send WhatsApp messages one by one |
| **Lead Profiles** | Full contact card with notes timeline, call history, deal value, tags, and WhatsApp quick-send |
| **Google Sheets Sync** | Bi-directional sync: pull fresh data from your Sheet, or push local edits back. Works offline with a pending queue |
| **Command Palette** | Press `Cmd+K` anywhere to navigate, create leads, toggle theme, switch currency, or trigger a sync |
| **Business Card Scanner** | OCR-powered scanner to capture contacts directly from a photo |
| **WhatsApp Templates** | Reusable message templates with `{{name}}`, `{{company}}`, `{{value}}` placeholders that auto-fill per lead |

---

## How to Use Sprint Calling

Sprint Calling is a **power-dialer mode** — it presents one lead at a time so you can stay in flow, log what happened, and move to the next without losing context.

### Step 1 — Open the Sprint Tab
Click **Sprint** in the bottom navigation bar, or press `g` then `c` in the command palette.

### Step 2 — Choose Your Source
Pick where your call list comes from:

- **CRM Sales Pipeline** — uses your active pipeline leads (filtered by stage and sorted by priority)
- **Custom Uploaded List** — upload a CSV or paste tab-separated data (name, phone, company, email, value)

> **Tip:** If using a pipeline, you can filter to a specific stage (e.g. only "Contacted" leads) and sort by **Highest Deal Value First** to always call the biggest opportunities first.

### Step 3 — Import a Custom List (optional)
If you chose "Custom Uploaded List":
1. Click **+ New Calling List**
2. Either **upload a CSV file** or **paste rows** directly (copied from Excel/Google Sheets)
3. The parser auto-detects columns — it recognises headers like `name`, `phone`, `mobile`, `company`, `email`, `value`
4. Rows without a phone number are automatically skipped
5. Click **Save List** — your list is stored and ready to reuse

### Step 4 — Launch the Sprint
Click **🚀 Launch Sprint**. The app queues up all matching leads and takes you to the calling screen.

### Step 5 — Work Through the Queue
For each lead you'll see:
- Their **name, company, phone number, and deal value**
- A **direct dial link** to call from your device
- **WhatsApp quick-send buttons** with your saved templates (auto-filled with their details)
- An **outcome selector** — pick one of:
  - ✅ Connected & Talked
  - 🚫 No Answer / Voicemail
  - ⏳ Busy / Call Back Later
  - 📅 Meeting / Demo Scheduled
  - 🏆 Deal Won & Closed
  - 💀 Deal Lost / Refused
- A **notes field** to jot anything down

Then hit **Next →** to log the outcome and move to the next lead.

> **Pipeline automation:** Selecting "Demo Booked", "Deal Won", or "Deal Lost" automatically moves the lead to the corresponding stage in your CRM pipeline.

### Step 6 — Pause or Finish
- **Pause** (Suspend Sprint) — saves your exact position. Resume any time from the setup screen.
- **Finish** — marks the sprint complete. A full log of every outcome is saved to the Sprint History at the bottom of the page.

### Converting Prospects to Leads
If you're calling from a Custom List (not a CRM pipeline), you'll see a **➕ Convert to CRM Lead** button. This instantly creates a full lead record in whichever pipeline and stage you choose, with the sprint noted in its timeline.

---

## Quick Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` | Open command palette |
| `g` `f` | Go to Funnels board |
| `g` `c` | Go to Calling Sprint |
| `g` `s` | Go to Settings |
| `n` `l` | Create new lead |
| `s` `s` | Pull latest data from Google Sheet |
| `s` `p` | Push pending edits to Google Sheet |
| `t` `t` | Toggle dark / light theme |

---

*Pluto saves everything to your browser's localStorage. Connect a Google Sheet in Settings to back up and share data across devices.*

## Firebase Repo Setup

Pluto now includes the Firebase repo wiring for the hybrid Firebase + Google Sheets mode:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `.firebaserc.example`
- `scripts/firebase-doctor.mjs`

Use these commands:

```bash
npm run firebase:doctor
npm run firebase:login
npm run firebase:deploy
```

What still needs your real Firebase account/project:

- the actual values in `.env`
- the real project id in `.firebaserc`
- enabling Google Auth and Firestore in the Firebase console

---

## Team Members & Invite Flow (Firebase Mode)

Team collaboration requires Firebase to be configured. Here is how it works end to end:

| Who | What happens |
|-----|-------------|
| **New user — no invite** | Signs in → a fresh workspace is auto-created for them as **Owner** |
| **New user — via invite link** | Clicks link → signs in → is added to the **Owner's** workspace as **Member** (no new workspace is created) |
| **Owner (Settings)** | Sees all members, can remove non-owner members, generates new invite links |
| **Member (Settings)** | Sees the member list, cannot generate invite links |

### Settings UI — Two Separate Cards

In Settings → Sync & Invite column there are **two distinct cards** when Firebase is active:

1. **Sync to Mobile** — QR code to open Pluto on your phone (personal device sync, not team sharing)
2. **Workspace Invite Link** — copyable URL + auto-refresh countdown, for adding teammates to your shared workspace

> ⚠️ **Invite links are single-use and expire in 5 minutes.** The owner must generate a fresh link for each new teammate. The link is automatically refreshed every 5 minutes in the UI.

### How the Invite Token Join Flow Works (Technical)

```
Owner: Settings → "Workspace Invite Link" card → Copy Link
  → Link: https://app.url?invite=<workspaceId>__<tokenId>&expiresAt=<ms>

Teammate: opens link in browser
  → App stores token in localStorage as crm_pending_invite
  → URL bar is cleaned (?invite= params removed)
  → If not signed in: redirected to Google Sign-In
  → On sign-in: useWorkspace.bootstrap() checks for crm_pending_invite
      → If found: skips creating a new workspace (race condition prevention)
      → Sets up listeners and waits
  → App.jsx fires workspace.acceptInviteToken() immediately (not gated on wsLoading)
  → Firestore: invite marked usedBy, teammate added to workspace/members
  → Teammate's users/{uid} workspaceId updated → listeners pick it up → wsLoading clears
  → Teammate sees Owner's workspace (shared sheet URL, same data)
```

### Firestore Security Rules (Current)

The rules are **member-scoped** — workspace data is only accessible to users who have been added as members of that workspace:

- `/workspaces/{id}` — read/write: members only
- `/workspaces/{id}/members/{uid}` — read: members; write: owners or self (for joining)
- `/workspaces/{id}/invites/{id}` — create: members; read/update: any authenticated (needed for join flow); delete: owners
- `/users/{uid}` and `/users/{uid}/syncQueue` — private to each user

Deploy rules with: `npm run firebase:deploy` (or `./node_modules/.bin/firebase deploy --only firestore:rules`)

