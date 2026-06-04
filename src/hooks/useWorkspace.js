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
  const [userSettings, setUserSettings] = useState(null);
  const [wsSettings, setWsSettings] = useState(null);
  const [members, setMembers] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [wsLoading, setWsLoading] = useState(isConfigured);
  const workspaceUnsubsRef = useRef([]);

  useEffect(() => {
    if (!isConfigured || !user) {
      setWorkspaceId(null);
      setSheetUrlState('');
      setUserSettings(null);
      setWsSettings(null);
      setMembers([]);
      setSyncQueue([]);
      setIsOwner(false);
      setWsLoading(false);
      return;
    }

    let cancelled = false;
    setWsLoading(true);

    const userRef = doc(db, 'users', user.uid);
    const queueRef = collection(db, 'users', user.uid, 'syncQueue');
    const unsubscribers = [];

    const bootstrap = async () => {
      try {
        let userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().workspaceId) {
          // IMPORTANT: If there is a pending invite token the user arrived via an
          // invite link and has not yet been added to the inviter's workspace.
          // DO NOT auto-create a new workspace — doing so causes a race condition
          // where the user ends up as owner of an orphaned empty workspace.
          // Instead, stay in wsLoading=true and wait for acceptInviteToken().
          const pendingInvite = localStorage.getItem('crm_pending_invite');
          if (pendingInvite) {
            // Set up listeners but don't create a workspace yet.
            // acceptInviteToken() will write workspaceId to users/{uid} which
            // the onSnapshot below will pick up automatically.
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
                // Once the invite is consumed and workspaceId is written,
                // we can stop showing the loading state.
                if (data.workspaceId) setWsLoading(false);
              })
            );
            unsubscribers.push(
              onSnapshot(queueRef, (snap) => {
                const nextQueue = snap.docs
                  .map((queueDoc) => ({
                    _fsId: queueDoc.id,
                    createdAtSeconds: queueDoc.data().createdAt?.seconds || 0,
                    ...(queueDoc.data().payload || {}),
                  }))
                  .sort((a, b) => a.createdAtSeconds - b.createdAtSeconds)
                  .map(({ createdAtSeconds, ...payload }) => payload);
                setSyncQueue(nextQueue);
              })
            );
            // Keep wsLoading=true until workspace is assigned.
            return;
          }

          const migrated = readLegacyLocalState();
          const wsRef = doc(collection(db, 'workspaces'));
          const nextWorkspaceId = wsRef.id;

          await setDoc(wsRef, {
            sheetUrl: migrated.sheetUrl || '',
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            lastSyncAt: null,
            settings: {
              whatsappTemplates: migrated.whatsappTemplates || [],
            },
          });

          await setDoc(doc(db, 'workspaces', nextWorkspaceId, 'members', user.uid), {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'owner',
            joinedAt: serverTimestamp(),
          });

          await setDoc(userRef, {
            workspaceId: nextWorkspaceId,
            settings: {
              theme: migrated.theme || 'dark',
              currency: migrated.currency || 'USD',
              syncMode: migrated.syncMode || 'auto',
            },
          });

          clearLegacyLocalState(migrated.cleanupKeys);
          userSnap = await getDoc(userRef);
        }

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
          })
        );

        unsubscribers.push(
          onSnapshot(queueRef, (snap) => {
            const nextQueue = snap.docs
              .map((queueDoc) => ({
                _fsId: queueDoc.id,
                createdAtSeconds: queueDoc.data().createdAt?.seconds || 0,
                ...(queueDoc.data().payload || {}),
              }))
              .sort((a, b) => a.createdAtSeconds - b.createdAtSeconds)
              .map(({ createdAtSeconds, ...payload }) => payload);
            setSyncQueue(nextQueue);
          })
        );

        // We do not set wsLoading to false here. The loading state is managed
        // by the workspace details snapshots in the useEffect below once workspaceId is set.
      } catch (err) {
        console.error('useWorkspace bootstrap error:', err);
        setWsLoading(false);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.uid]);

  useEffect(() => {
    workspaceUnsubsRef.current.forEach((unsubscribe) => unsubscribe());
    workspaceUnsubsRef.current = [];

    if (!isConfigured || !user || !workspaceId) {
      setSheetUrlState('');
      setWsSettings(null);
      setMembers([]);
      setIsOwner(false);
      return;
    }

    // Set loading to true while we fetch workspace details
    setWsLoading(true);

    let docLoaded = false;
    let memsLoaded = false;
    const checkAllLoaded = () => {
      if (docLoaded && memsLoaded) {
        setWsLoading(false);
      }
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
          const list = snap.docs.map((memberDoc) => ({ uid: memberDoc.id, ...memberDoc.data() }));
          setMembers(list);
          const me = list.find((member) => member.uid === user.uid);
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
      unsubs.forEach((unsubscribe) => unsubscribe());
      workspaceUnsubsRef.current = [];
    };
  }, [user?.uid, workspaceId]);

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

  const getSyncQueue = async () => {
    if (!isConfigured || !user) return [];
    const snap = await getDocs(collection(db, 'users', user.uid, 'syncQueue'));
    return snap.docs
      .map((queueDoc) => ({
        _fsId: queueDoc.id,
        createdAtSeconds: queueDoc.data().createdAt?.seconds || 0,
        ...(queueDoc.data().payload || {}),
      }))
      .sort((a, b) => a.createdAtSeconds - b.createdAtSeconds)
      .map(({ createdAtSeconds, ...payload }) => payload);
  };

  const addToSyncQueue = async (payload) => {
    if (!isConfigured || !user) return;
    const queueCollectionRef = collection(db, 'users', user.uid, 'syncQueue');
    const existing = await getDocs(queueCollectionRef);

    for (const queueDoc of existing.docs) {
      const queuedPayload = queueDoc.data().payload || {};
      if (shouldReplaceQueuedPayload(queuedPayload, payload)) {
        await deleteDoc(queueDoc.ref);
      }
    }

    await addDoc(queueCollectionRef, {
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
    await Promise.all(snap.docs.map((queueDoc) => deleteDoc(queueDoc.ref)));
  };

  const createInviteToken = async () => {
    if (!isConfigured || !workspaceId) return null;
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'invites'), {
      createdBy: user.uid,
      expiresAt,
      usedBy: null,
    });
    return { token: `${workspaceId}__${ref.id}`, expiresAt };
  };

  const acceptInviteToken = async (tokenStr) => {
    if (!isConfigured || !user || !tokenStr) return false;
    try {
      const [nextWorkspaceId, inviteId] = tokenStr.split('__');
      if (!nextWorkspaceId || !inviteId) return false;

      const inviteRef = doc(db, 'workspaces', nextWorkspaceId, 'invites', inviteId);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) return false;
      const invite = inviteSnap.data();
      const expiresAt = Number(invite.expiresAt) || 0;
      const isExpired = expiresAt > 0 && Date.now() > expiresAt;
      const isUsedByAnotherUser = Boolean(invite.usedBy) && invite.usedBy !== user.uid;
      if (isUsedByAnotherUser || isExpired) return false;

      const memberRef = doc(db, 'workspaces', nextWorkspaceId, 'members', user.uid);
      const memberSnap = await getDoc(memberRef);
      const existingRole = memberSnap.exists() ? memberSnap.data().role : null;

      await setDoc(memberRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: existingRole || 'member',
        joinedAt: serverTimestamp(),
      });

      // Write the new workspaceId — this triggers the onSnapshot listener in
      // bootstrap to pick up the workspace and clear wsLoading.
      await setDoc(doc(db, 'users', user.uid), {
        workspaceId: nextWorkspaceId,
        settings: {
          theme: 'dark',
          currency: 'USD',
          syncMode: 'auto',
        },
      }, { merge: true });

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
    syncQueue,
    getSyncQueue,
    addToSyncQueue,
    removeFromSyncQueue,
    clearSyncQueue,
    createInviteToken,
    acceptInviteToken,
    removeMember,
  };
}

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
  const legacyUser = localStorage.getItem('crm_logged_in_user') || '';
  const sheetUrl =
    (legacyUser && localStorage.getItem(`crm_sheet_url_${legacyUser}`)) ||
    localStorage.getItem('crm_sheet_url') || '';
  const currency =
    (legacyUser && localStorage.getItem(`crm_currency_${legacyUser}`)) ||
    localStorage.getItem('crm_currency') || 'USD';
  const theme =
    (legacyUser && localStorage.getItem(`crm_theme_${legacyUser}`)) ||
    localStorage.getItem('crm_theme') || 'dark';
  const syncMode =
    (legacyUser && localStorage.getItem(`crm_sync_mode_${legacyUser}`)) ||
    localStorage.getItem('crm_sync_mode') || 'auto';

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
  keys.forEach((key) => {
    if (key) {
      localStorage.removeItem(key);
    }
  });
}
