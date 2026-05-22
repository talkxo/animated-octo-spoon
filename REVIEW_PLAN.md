# Codebase Review & Improvement Plan (Goal B: Google Sheet SSoT)

## Phase 1: Architectural Hardening (Immediate Focus)
*   **Goal:** Solidify the boundary between local cache (React State) and remote database (Google Sheet).
*   **Focus Areas:**
    *   **Idempotency in Writes:** Audit all data paths (`Leads`, `Notes`, `Pipeline` updates) that call the Sheet API to ensure operations can be safely retried without duplication.
    *   **Conflict Resolution Logic:** Define and implement clear resolution strategy for concurrent edits (e.g., Last Write Wins on specific fields, or merge strategy).
    *   **Error Handling Visibility:** Ensure all API/Sheet errors are caught, translated into user-facing states (`syncStatus: 'error'`), and logged/queued correctly.

## Phase 2: Efficiency & User Experience (Mid-Term)
*   **Goal:** Improve responsiveness and reduce perceived latency.
*   **Focus Areas:**
    *   **Batching:** Group small, rapid updates (e.g., minor field toggles) into larger, less frequent API calls to reduce transaction overhead with the Sheet.
    *   **Local Optimistic UI:** Implement local state changes *immediately* on successful submission, marking items as 'Synced'/'Pending Sync' rather than waiting for round-trip confirmation.
    *   **Read Optimization:** Review data retrieval efficiency. Are we fetching full objects when only one field changed?

## Phase 3: Refinement & Scaling (Long-Term)
*   **Goal:** Clean up technical debt and add enterprise features.
*   **Focus Areas:**
    *   **Code Separation:** Abstract persistence logic entirely into a dedicated service layer (e.g., `ApiService.js`) to clean up `App.jsx`.
    *   **Schema Migration:** Prepare for potential changes between the React data model and the Sheet structure.

---
**Next Step:** Shall I begin by auditing the **Write Operations Safety** for the `Leads` module, as that is the most transactional data type?