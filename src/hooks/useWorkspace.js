import { useState, useEffect, useRef } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isConfigured } from '../firebase';

/**
 * useWorkspace — manages all Firestore reads/writes for a signed-in user.
 *
 * Firestore schema (new):
 *   workspaces/{workspaceId}
 *     sheetUrl: string
 *     createdBy: uid
 *     lastSyncAt: timestamp
 *     settings: { whatsappTemplates: [] }
 *     leads/{leadId}: { name, company, phone, email, status, value, tags,
 *                       pipelineId, lastContacted, createdAt, updatedAt,
 *                       updatedBy, fieldUpdatedAt: { field: timestamp } }
 *     notes/{noteId}: { leadId, text, timestamp, type, createdAt, createdBy }
 *     pipelines/{pipelineId}: { name, stages[], updatedAt, updatedBy }
 *     sprints/{sprintId}: { ...sprintData }
 *     callingLists/{listId}: { name, entries[], updatedAt, updatedBy }
 *     members/{uid}: { email, displayName, photoURL, role, joinedAt }
 *     invites/{id}: { createdBy, expiresAt, usedBy }
 *
 *   users/{uid}
 *     workspaceId: string | null
 *     settings: { theme, currency, syncMode, activePipelineId, hasSeenWizard }
 */

// Fields we track at per-field granularity for merge resolution
const LEAD_FIELD_TRACKED = [
  'name', 'company', 'phone', 'email', 'status',
  'value', 'tags', 'pipelineId', 'lastContacted',
];

export function useWorkspace(user) {
  // ── Workspace metadata ──────────────────────────────────────────────────────
  const [workspaceId, setWorkspaceId]     = useState(null);
  const [sheetUrl, setSheetUrlState]      = useState('');
  const [userSettings, setUserSettings]   = useState(null);
  const [wsSettings, setWsSettings]       = useState(null);
  const [members, setMembers]             = useState([]);
  const [isOwner, setIsOwner]             = useState(false);
  const [wsLoading, setWsLoading]         = useState(isConfigured);
  const [ejected, setEjected]             = useState(false);

  // ── CRM data (Firestore-backed) ─────────────────────────────────────────────
  const [leads, setLeads]               = useState([]);
  const [notes, setNotes]               = useState([]);
  const [pipelines, setPipelines]       = useState([]);
  const [sprints, setSprints]           = useState([]);
  const [callingLists, setCallingLists] = useState([]);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const workspaceUnsubsRef = useRef([]);
  const crmUnsubsRef       = useRef([]);
  const workspaceIdRef     = useRef(null); // mirrors workspaceId for ejection detection

  // Keep workspaceIdRef in sync
  useEffect(() => {
    workspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  // ── Phase 1: Bootstrap (user doc + queue listeners) ─────────────────────────
  useEffect(() => {
    if (!isConfigured || !user) {
      setWorkspaceId(null);
      setSheetUrlState('');
      setUserSettings(null);
      setWsSettings(null);
      setMembers([]);
      setIsOwner(false);
      setWsLoading(false);
      setEjected(false);
      return;
    }

    let cancelled = false;
    setWsLoading(true);

    const userRef = doc(db, 'users', user.uid);
    const unsubscribers = [];

    const bootstrap = async () => {
      try {
        let userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().workspaceId) {
          // IMPORTANT: If there is a pending invite token the user arrived via
          // an invite link. DO NOT auto-create a workspace — doing so causes a
          // race condition where the user ends up as owner of an orphaned empty
          // workspace. Stay in wsLoading=true and wait for acceptInviteToken().
          const pendingInvite = localStorage.getItem('crm_pending_invite');
          if (pendingInvite) {
            if (cancelled) return;
            unsubscribers.push(
              onSnapshot(userRef, (snap) => {
                if (!snap.exists()) return;
                const data = snap.data();
                setUserSettings(data.settings || {});
                setWorkspaceId((currentId) => {
                  const nextId = data.workspaceId || null;
                  return currentId === nextId ? currentId : nextId;
                });
                if (data.workspaceId) setWsLoading(false);
              })
            );
            return;
          }

          // No pending invite and no workspace — create a fresh one
          const migrated       = readLegacyLocalState();
          const wsRef          = doc(collection(db, 'workspaces'));
          const nextWorkspaceId = wsRef.id;

          await setDoc(wsRef, {
            sheetUrl:  migrated.sheetUrl || '',
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            lastSyncAt: null,
            settings: { whatsappTemplates: migrated.whatsappTemplates || [] },
          });

          await setDoc(
            doc(db, 'workspaces', nextWorkspaceId, 'members', user.uid),
            {
              email:       user.email,
              displayName: user.displayName,
              photoURL:    user.photoURL,
              role:        'owner',
              joinedAt:    serverTimestamp(),
            }
          );

          await setDoc(userRef, {
            workspaceId: nextWorkspaceId,
            settings: {
              theme:       migrated.theme    || 'dark',
              currency:    migrated.currency || 'USD',
              syncMode:    migrated.syncMode || 'auto',
            },
          });

          clearLegacyLocalState(migrated.cleanupKeys);
          userSnap = await getDoc(userRef);
        }

        if (cancelled) return;

        // Listen to the user doc for settings + workspaceId changes (incl. ejection)
        unsubscribers.push(
          onSnapshot(userRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            setUserSettings(data.settings || {});

            // Ejection detection: owner set workspaceId=null on this user
            if (data.workspaceId === null && workspaceIdRef.current) {
              setEjected(true);
              setWorkspaceId(null);
              setWsLoading(false);
              return;
            }

            setWorkspaceId((currentId) => {
              const nextId = data.workspaceId || null;
              return currentId === nextId ? currentId : nextId;
            });
          })
        );
      } catch (err) {
        console.error('useWorkspace bootstrap error:', err);
        setWsLoading(false);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      unsubscribers.forEach((u) => u());
    };
  }, [user?.uid]);

  // ── Phase 2: Workspace metadata listeners (fires when workspaceId resolves) ─
  useEffect(() => {
    workspaceUnsubsRef.current.forEach((u) => u());
    workspaceUnsubsRef.current = [];

    if (!isConfigured || !user || !workspaceId) {
      setSheetUrlState('');
      setWsSettings(null);
      setMembers([]);
      setIsOwner(false);
      return;
    }

    setWsLoading(true);

    let docLoaded  = false;
    let memsLoaded = false;
    const checkAllLoaded = () => {
      if (docLoaded && memsLoaded) setWsLoading(false);
    };

    const unsubs = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'workspaces', workspaceId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setSheetUrlState(data.sheetUrl || '');
            setWsSettings(data.settings || {});
          }
          docLoaded = true;
          checkAllLoaded();
        },
        (err) => {
          console.error('Workspace doc snapshot error:', err);
          docLoaded = true;
          checkAllLoaded();
        }
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'workspaces', workspaceId, 'members'),
        (snap) => {
          const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
          setMembers(list);
          const me = list.find((m) => m.uid === user.uid);
          setIsOwner(me?.role === 'owner');
          memsLoaded = true;
          checkAllLoaded();
        },
        (err) => {
          console.error('Workspace members snapshot error:', err);
          memsLoaded = true;
          checkAllLoaded();
        }
      )
    );

    workspaceUnsubsRef.current = unsubs;

    return () => {
      unsubs.forEach((u) => u());
      workspaceUnsubsRef.current = [];
    };
  }, [user?.uid, workspaceId]);

  // ── Phase 3: CRM data listeners (fires when workspaceId resolves) ───────────
  useEffect(() => {
    crmUnsubsRef.current.forEach((u) => u());
    crmUnsubsRef.current = [];

    if (!isConfigured || !user || !workspaceId) {
      setLeads([]);
      setNotes([]);
      setPipelines([]);
      setSprints([]);
      setCallingLists([]);
      return;
    }

    const unsubs = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'workspaces', workspaceId, 'leads'),
        (snap) => setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('leads snapshot error:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'workspaces', workspaceId, 'notes'),
        (snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('notes snapshot error:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'workspaces', workspaceId, 'pipelines'),
        (snap) => setPipelines(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('pipelines snapshot error:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'workspaces', workspaceId, 'sprints'),
        (snap) => setSprints(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('sprints snapshot error:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'workspaces', workspaceId, 'callingLists'),
        (snap) => setCallingLists(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('callingLists snapshot error:', err)
      )
    );

    crmUnsubsRef.current = unsubs;

    return () => {
      unsubs.forEach((u) => u());
      crmUnsubsRef.current = [];
    };
  }, [user?.uid, workspaceId]);

  // ── Workspace metadata write helpers ────────────────────────────────────────

  const saveSheetUrl = async (url) => {
    if (!isConfigured || !workspaceId) return;
    await updateDoc(doc(db, 'workspaces', workspaceId), { sheetUrl: url });
  };

  const saveUserSettings = async (patch) => {
    if (!isConfigured || !user) return;
    await setDoc(doc(db, 'users', user.uid), { settings: patch }, { merge: true });
  };

  const saveWsSettings = async (patch) => {
    if (!isConfigured || !workspaceId) return;
    await setDoc(doc(db, 'workspaces', workspaceId), { settings: patch }, { merge: true });
  };

  // ── CRM write helpers ────────────────────────────────────────────────────────

  /**
   * saveLead — field-level merge for existing leads, full write for new leads.
   *
   * @param {object} leadData  The full lead object to save.
   * @param {object|null} prevLead  The previous state of the lead. Pass null for new leads.
   * @returns {string} The lead id.
   */
  const saveLead = async (leadData, prevLead = null) => {
    if (!isConfigured || !workspaceId) return leadData.id;
    const leadId  = leadData.id || `lead-${Date.now()}`;
    const leadRef = doc(db, 'workspaces', workspaceId, 'leads', leadId);
    const now     = serverTimestamp();

    if (!prevLead) {
      // New lead — full write, no merge needed
      const { id: _id, ...rest } = leadData;
      await setDoc(leadRef, {
        ...rest,
        createdAt:      now,
        updatedAt:      now,
        updatedBy:      user.uid,
        fieldUpdatedAt: {},
      });
      return leadId;
    }

    // Existing lead — patch only changed fields to avoid overwriting
    // concurrent changes to other fields by teammates
    const changedFields = LEAD_FIELD_TRACKED.filter(
      (f) => String(leadData[f] ?? '') !== String(prevLead[f] ?? '')
    );

    if (changedFields.length === 0) return leadId;

    const patch         = { updatedAt: now, updatedBy: user.uid };
    const fieldUpdatedAt = {};
    changedFields.forEach((f) => {
      patch[f]         = leadData[f];
      fieldUpdatedAt[f] = now;
    });

    // merge: true ensures we only overwrite the fields in patch,
    // leaving all other lead fields (edited by teammates) untouched
    await setDoc(leadRef, { ...patch, fieldUpdatedAt }, { merge: true });
    return leadId;
  };

  /**
   * deleteLead — removes the lead document from Firestore.
   * Notes are kept as historical records.
   */
  const deleteLead = async (id) => {
    if (!isConfigured || !workspaceId) return;
    await deleteDoc(doc(db, 'workspaces', workspaceId, 'leads', id));
  };

  /**
   * addNote — append-only. Never conflicts.
   */
  const addNote = async (note) => {
    if (!isConfigured || !workspaceId) return;
    const noteId = note.id || `note-${Date.now()}`;
    await addDoc(collection(db, 'workspaces', workspaceId, 'notes'), {
      ...note,
      id:        noteId,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
    });
  };

  /**
   * savePipeline — owner-only whole-pipeline write.
   */
  const savePipeline = async (pipeline) => {
    if (!isConfigured || !workspaceId) return;
    const ref = doc(db, 'workspaces', workspaceId, 'pipelines', pipeline.id);
    await setDoc(ref, {
      ...pipeline,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  };

  /**
   * deletePipeline — removes a pipeline document.
   */
  const deletePipeline = async (id) => {
    if (!isConfigured || !workspaceId) return;
    await deleteDoc(doc(db, 'workspaces', workspaceId, 'pipelines', id));
  };

  /**
   * saveSprint — upsert a sprint document (merge: true).
   */
  const saveSprint = async (sprint) => {
    if (!isConfigured || !workspaceId) return;
    const ref = doc(db, 'workspaces', workspaceId, 'sprints', sprint.id);
    await setDoc(ref, { ...sprint }, { merge: true });
  };

  /**
   * deleteSprint — removes a sprint document.
   */
  const deleteSprint = async (id) => {
    if (!isConfigured || !workspaceId) return;
    await deleteDoc(doc(db, 'workspaces', workspaceId, 'sprints', id));
  };

  /**
   * saveCallingList — per-list upsert (not a blob of all lists).
   */
  const saveCallingList = async (list) => {
    if (!isConfigured || !workspaceId) return;
    const ref = doc(db, 'workspaces', workspaceId, 'callingLists', list.id);
    await setDoc(
      ref,
      { ...list, updatedAt: serverTimestamp(), updatedBy: user.uid },
      { merge: true }
    );
  };

  /**
   * deleteCallingList — removes a calling list document.
   */
  const deleteCallingList = async (id) => {
    if (!isConfigured || !workspaceId) return;
    await deleteDoc(doc(db, 'workspaces', workspaceId, 'callingLists', id));
  };

  // ── Team management ──────────────────────────────────────────────────────────

  /**
   * createInviteToken — generates a 15-minute single-use invite token.
   */
  const createInviteToken = async () => {
    if (!isConfigured || !workspaceId) return null;
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const ref = await addDoc(
      collection(db, 'workspaces', workspaceId, 'invites'),
      { createdBy: user.uid, expiresAt, usedBy: null }
    );
    return { token: `${workspaceId}__${ref.id}`, expiresAt };
  };

  /**
   * acceptInviteToken — consumes an invite link and adds the user to the workspace.
   */
  const acceptInviteToken = async (tokenStr) => {
    if (!isConfigured || !user || !tokenStr) return false;
    try {
      const [nextWorkspaceId, inviteId] = tokenStr.split('__');
      if (!nextWorkspaceId || !inviteId) return false;

      const inviteRef  = doc(db, 'workspaces', nextWorkspaceId, 'invites', inviteId);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) return false;

      const invite    = inviteSnap.data();
      const expiresAt = Number(invite.expiresAt) || 0;
      const isExpired = expiresAt > 0 && Date.now() > expiresAt;
      const isUsedByAnotherUser = Boolean(invite.usedBy) && invite.usedBy !== user.uid;
      if (isUsedByAnotherUser || isExpired) return false;

      const memberRef  = doc(db, 'workspaces', nextWorkspaceId, 'members', user.uid);
      const memberSnap = await getDoc(memberRef);
      const existingRole = memberSnap.exists() ? memberSnap.data().role : null;

      await setDoc(memberRef, {
        email:       user.email,
        displayName: user.displayName,
        photoURL:    user.photoURL,
        role:        existingRole || 'member',
        joinedAt:    serverTimestamp(),
      });

      // Writing workspaceId triggers the onSnapshot in bootstrap to resolve wsLoading
      await setDoc(
        doc(db, 'users', user.uid),
        {
          workspaceId: nextWorkspaceId,
          settings: { theme: 'dark', currency: 'USD', syncMode: 'auto' },
        },
        { merge: true }
      );

      if (invite.usedBy !== user.uid) {
        await updateDoc(inviteRef, { usedBy: user.uid });
      }

      setWorkspaceId(nextWorkspaceId);
      setWsLoading(false);
      return true;
    } catch (err) {
      console.error('acceptInviteToken error:', err);
      return false;
    }
  };

  /**
   * removeMember — owner removes a teammate.
   * Also clears the removed user's workspaceId so Firestore rules take effect
   * immediately and their live session is notified via their userRef onSnapshot.
   */
  const removeMember = async (uid) => {
    if (!isConfigured || !workspaceId || !isOwner) return;
    await deleteDoc(doc(db, 'workspaces', workspaceId, 'members', uid));
    // Firestore rules allow the workspace owner to write only {workspaceId, ejectedAt}
    await setDoc(
      doc(db, 'users', uid),
      { workspaceId: null, ejectedAt: serverTimestamp() },
      { merge: true }
    );
  };

  /**
   * leaveWorkspace — a member voluntarily leaves a workspace.
   * Removes their member doc and clears their workspaceId.
   * The ejection detection in bootstrap will fire and reset the UI.
   */
  const leaveWorkspace = async () => {
    if (!isConfigured || !workspaceId) return;
    await deleteDoc(doc(db, 'workspaces', workspaceId, 'members', user.uid));
    await setDoc(doc(db, 'users', user.uid), { workspaceId: null }, { merge: true });
  };

  // ── Legacy sync queue helpers (kept for Sheet-export use only) ───────────────

  const getSyncQueue = async () => {
    if (!isConfigured || !user) return [];
    const snap = await getDocs(collection(db, 'users', user.uid, 'syncQueue'));
    return snap.docs
      .map((d) => ({
        _fsId:             d.id,
        createdAtSeconds:  d.data().createdAt?.seconds || 0,
        ...(d.data().payload || {}),
      }))
      .sort((a, b) => a.createdAtSeconds - b.createdAtSeconds)
      .map(({ createdAtSeconds, ...payload }) => payload);
  };

  const addToSyncQueue = async (payload) => {
    if (!isConfigured || !user) return;
    const queueCollectionRef = collection(db, 'users', user.uid, 'syncQueue');
    const existing           = await getDocs(queueCollectionRef);
    for (const queueDoc of existing.docs) {
      const queuedPayload = queueDoc.data().payload || {};
      if (shouldReplaceQueuedPayload(queuedPayload, payload)) {
        await deleteDoc(queueDoc.ref);
      }
    }
    await addDoc(queueCollectionRef, { payload, createdAt: serverTimestamp() });
  };

  const removeFromSyncQueue = async (fsId) => {
    if (!isConfigured || !user || !fsId) return;
    await deleteDoc(doc(db, 'users', user.uid, 'syncQueue', fsId));
  };

  const clearSyncQueue = async () => {
    if (!isConfigured || !user) return;
    const snap = await getDocs(collection(db, 'users', user.uid, 'syncQueue'));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };

  // ── Public API ───────────────────────────────────────────────────────────────

  return {
    // Workspace metadata
    workspaceId,
    sheetUrl,
    saveSheetUrl,
    userSettings,
    saveUserSettings,
    wsSettings,
    saveWsSettings,
    members,
    isOwner,
    wsLoading,
    ejected,

    // CRM data (Firestore-backed, real-time)
    leads,
    notes,
    pipelines,
    sprints,
    callingLists,

    // CRM write helpers
    saveLead,
    deleteLead,
    addNote,
    savePipeline,
    deletePipeline,
    saveSprint,
    deleteSprint,
    saveCallingList,
    deleteCallingList,

    // Team management
    createInviteToken,
    acceptInviteToken,
    removeMember,
    leaveWorkspace,

    // Legacy Sheet-export queue (kept for non-Firebase / export path)
    getSyncQueue,
    addToSyncQueue,
    removeFromSyncQueue,
    clearSyncQueue,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function shouldReplaceQueuedPayload(existingPayload, nextPayload) {
  if (existingPayload.queueKey && nextPayload.queueKey) {
    return existingPayload.queueKey === nextPayload.queueKey;
  }
  if (nextPayload.action === 'saveLead' && existingPayload.action === 'saveLead') {
    return existingPayload.lead?.id === nextPayload.lead?.id;
  }
  if (nextPayload.action === 'deleteLead' && existingPayload.action === 'saveLead') {
    return existingPayload.lead?.id === nextPayload.id;
  }
  if (nextPayload.action === 'saveLead' && existingPayload.action === 'deleteLead') {
    return existingPayload.id === nextPayload.lead?.id;
  }
  if (nextPayload.action === 'saveSettings' && existingPayload.action === 'saveSettings') {
    return true;
  }
  return false;
}

function readLegacyLocalState() {
  const legacyUser  = localStorage.getItem('crm_logged_in_user') || '';
  const sheetUrl    = (legacyUser && localStorage.getItem(`crm_sheet_url_${legacyUser}`))    || localStorage.getItem('crm_sheet_url')    || '';
  const currency    = (legacyUser && localStorage.getItem(`crm_currency_${legacyUser}`))     || localStorage.getItem('crm_currency')     || 'USD';
  const theme       = (legacyUser && localStorage.getItem(`crm_theme_${legacyUser}`))        || localStorage.getItem('crm_theme')        || 'dark';
  const syncMode    = (legacyUser && localStorage.getItem(`crm_sync_mode_${legacyUser}`))    || localStorage.getItem('crm_sync_mode')    || 'auto';

  let whatsappTemplates = [];
  try {
    whatsappTemplates = JSON.parse(localStorage.getItem('crm_wa_templates') || '[]');
  } catch (_) {
    whatsappTemplates = [];
  }

  return {
    sheetUrl,
    currency,
    theme,
    syncMode,
    whatsappTemplates,
    cleanupKeys: [
      'crm_logged_in',
      'crm_logged_in_user',
      `crm_sheet_url_${legacyUser}`,
      'crm_sheet_url',
      `crm_currency_${legacyUser}`,
      'crm_currency',
      `crm_theme_${legacyUser}`,
      'crm_theme',
      `crm_sync_mode_${legacyUser}`,
      'crm_sync_mode',
      `crm_settings_revision_${legacyUser}`,
      'crm_settings_revision',
      'crm_wa_templates',
      'crm_sync_queue',
    ],
  };
}

function clearLegacyLocalState(keys) {
  keys.forEach((key) => { if (key) localStorage.removeItem(key); });
}
