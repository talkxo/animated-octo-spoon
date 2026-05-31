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
 * Firestore schema:
 *   workspaces/{workspaceId}
 *     sheetUrl: string
 *     createdBy: uid
 *     lastSyncAt: timestamp
 *     settings:
 *       whatsappTemplates: array
 *     members/{uid}:
 *       email, displayName, photoURL, role ('owner'|'member'), joinedAt
 *
 *   users/{uid}
 *     workspaceId: string
 *     settings:
 *       theme, currency, syncMode
 *     syncQueue/{docId}:
 *       payload: object, createdAt: timestamp
 */
export function useWorkspace(user) {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [sheetUrl, setSheetUrlState] = useState('');
  const [userSettings, setUserSettings] = useState(null);     // theme, currency, syncMode
  const [wsSettings, setWsSettings] = useState(null);         // whatsappTemplates
  const [members, setMembers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [wsLoading, setWsLoading] = useState(isConfigured);
  const unsubscribesRef = useRef([]);

  // ─── Bootstrap: resolve or create workspace for this user ───────────────────
  useEffect(() => {
    if (!isConfigured || !user) {
      setWsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        let wsId;

        if (userSnap.exists() && userSnap.data().workspaceId) {
          // Returning user — pick up existing workspace
          wsId = userSnap.data().workspaceId;
        } else {
          // First-time sign-in: run localStorage migration then create workspace
          const migrated = migrateFromLocalStorage();

          // Create workspace doc
          const wsRef = doc(collection(db, 'workspaces'));
          wsId = wsRef.id;
          await setDoc(wsRef, {
            sheetUrl: migrated.sheetUrl || '',
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            lastSyncAt: null,
            settings: {
              whatsappTemplates: migrated.whatsappTemplates || [],
            },
          });

          // Add owner as member
          await setDoc(doc(db, 'workspaces', wsId, 'members', user.uid), {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'owner',
            joinedAt: serverTimestamp(),
          });

          // Create user doc
          await setDoc(userRef, {
            workspaceId: wsId,
            settings: {
              theme: migrated.theme || 'dark',
              currency: migrated.currency || 'USD',
              syncMode: migrated.syncMode || 'auto',
            },
          });
        }

        if (cancelled) return;
        setWorkspaceId(wsId);

        // ── Real-time listeners ───────────────────────────────────────────────
        const unsubs = [];

        // Workspace doc (sheetUrl, wsSettings)
        unsubs.push(
          onSnapshot(doc(db, 'workspaces', wsId), (snap) => {
            if (!snap.exists()) return;
            const d = snap.data();
            setSheetUrlState(d.sheetUrl || '');
            setWsSettings(d.settings || {});
          })
        );

        // User settings (theme, currency, syncMode)
        unsubs.push(
          onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (!snap.exists()) return;
            setUserSettings(snap.data().settings || {});
          })
        );

        // Members
        unsubs.push(
          onSnapshot(collection(db, 'workspaces', wsId, 'members'), (snap) => {
            const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
            setMembers(list);
            const me = list.find((m) => m.uid === user.uid);
            setIsOwner(me?.role === 'owner');
          })
        );

        unsubscribesRef.current = unsubs;
        setWsLoading(false);
      } catch (err) {
        console.error('useWorkspace bootstrap error:', err);
        setWsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribesRef.current.forEach((u) => u());
    };
  }, [user?.uid]);

  // ─── Write helpers ───────────────────────────────────────────────────────────

  const saveSheetUrl = async (url) => {
    if (!isConfigured || !workspaceId) return;
    await updateDoc(doc(db, 'workspaces', workspaceId), { sheetUrl: url });
  };

  const saveUserSettings = async (patch) => {
    if (!isConfigured || !user) return;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data().settings || {}) : {};
    await setDoc(ref, { settings: { ...current, ...patch } }, { merge: true });
  };

  const saveWsSettings = async (patch) => {
    if (!isConfigured || !workspaceId) return;
    const ref = doc(db, 'workspaces', workspaceId);
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data().settings || {}) : {};
    await updateDoc(ref, { settings: { ...current, ...patch } });
  };

  // Sync queue — stored in Firestore so it survives page reloads / cache clears
  const getSyncQueue = async () => {
    if (!isConfigured || !user) return [];
    const snap = await getDocs(collection(db, 'users', user.uid, 'syncQueue'));
    return snap.docs
      .sort((a, b) => (a.data().createdAt?.seconds || 0) - (b.data().createdAt?.seconds || 0))
      .map((d) => ({ _fsId: d.id, ...d.data().payload }));
  };

  const addToSyncQueue = async (payload) => {
    if (!isConfigured || !user) return;
    // Deduplicate: remove existing entry for same lead or settings
    const existing = await getDocs(collection(db, 'users', user.uid, 'syncQueue'));
    for (const d of existing.docs) {
      const p = d.data().payload;
      if (payload.action === 'saveLead' && p.action === 'saveLead' && p.lead?.id === payload.lead?.id) {
        await deleteDoc(d.ref);
      }
      if (payload.action === 'saveSettings' && p.action === 'saveSettings') {
        await deleteDoc(d.ref);
      }
    }
    await addDoc(collection(db, 'users', user.uid, 'syncQueue'), {
      payload,
      createdAt: serverTimestamp(),
    });
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

  // Workspace invite token (short-lived Firestore doc)
  const createInviteToken = async () => {
    if (!isConfigured || !workspaceId) return null;
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
    const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'invites'), {
      createdBy: user.uid,
      expiresAt,
      usedBy: null,
    });
    return { token: `${workspaceId}__${ref.id}`, expiresAt };
  };

  // Accept an invite token (called when a new user lands with ?invite=...)
  const acceptInviteToken = async (tokenStr) => {
    if (!isConfigured || !user || !tokenStr) return false;
    try {
      const [wsId, inviteId] = tokenStr.split('__');
      const inviteRef = doc(db, 'workspaces', wsId, 'invites', inviteId);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) return false;
      const invite = inviteSnap.data();
      if (invite.usedBy || Date.now() > invite.expiresAt) return false;

      // Mark invite used
      await updateDoc(inviteRef, { usedBy: user.uid });

      // Add member
      await setDoc(doc(db, 'workspaces', wsId, 'members', user.uid), {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'member',
        joinedAt: serverTimestamp(),
      });

      // Point user to this workspace
      await setDoc(doc(db, 'users', user.uid), { workspaceId: wsId }, { merge: true });

      return true;
    } catch (err) {
      console.error('acceptInviteToken error:', err);
      return false;
    }
  };

  const removeMember = async (uid) => {
    if (!isConfigured || !workspaceId || !isOwner) return;
    await deleteDoc(doc(db, 'workspaces', workspaceId, 'members', uid));
  };

  return {
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
    getSyncQueue,
    addToSyncQueue,
    removeFromSyncQueue,
    clearSyncQueue,
    createInviteToken,
    acceptInviteToken,
    removeMember,
  };
}

// ─── localStorage → Firestore one-time migration helper ──────────────────────
function migrateFromLocalStorage() {
  const user = localStorage.getItem('crm_logged_in_user') || '';
  const sheetUrl =
    (user && localStorage.getItem(`crm_sheet_url_${user}`)) ||
    localStorage.getItem('crm_sheet_url') || '';
  const currency =
    (user && localStorage.getItem(`crm_currency_${user}`)) ||
    localStorage.getItem('crm_currency') || 'USD';
  const theme =
    (user && localStorage.getItem(`crm_theme_${user}`)) ||
    localStorage.getItem('crm_theme') || 'dark';
  const syncMode =
    (user && localStorage.getItem(`crm_sync_mode_${user}`)) ||
    localStorage.getItem('crm_sync_mode') || 'auto';
  let whatsappTemplates = [];
  try {
    whatsappTemplates = JSON.parse(localStorage.getItem('crm_wa_templates') || '[]');
  } catch (_) {}

  // Clean up the old keys after migration
  [
    'crm_logged_in', 'crm_logged_in_user',
    `crm_sheet_url_${user}`, 'crm_sheet_url',
    `crm_currency_${user}`, 'crm_currency',
    `crm_theme_${user}`, 'crm_theme',
    `crm_sync_mode_${user}`, 'crm_sync_mode',
    `crm_settings_revision_${user}`, 'crm_settings_revision',
    'crm_wa_templates', 'crm_sync_queue',
  ].forEach((k) => localStorage.removeItem(k));

  return { sheetUrl, currency, theme, syncMode, whatsappTemplates };
}
