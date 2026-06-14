import { useState, useEffect, useCallback } from 'react';

export function useSheetSync({ workspace, leads, notes, pipelines, callingLists, settings }) {
  const [sheetUrl, setSheetUrlLocal] = useState('');
  const [sheetExportStatus, setSheetExportStatus] = useState('idle');
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setNetworkOnline(true);
    const off = () => setNetworkOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (workspace.sheetUrl !== undefined) setSheetUrlLocal(workspace.sheetUrl);
  }, [workspace.sheetUrl]);

  const syncStatus = sheetExportStatus === 'exporting' ? 'syncing'
    : !networkOnline ? 'offline'
    : 'synced';

  const setSheetUrl = useCallback(async (url) => {
    setSheetUrlLocal(url);
    await workspace.saveSheetUrl(url);
  }, [workspace]);

  const postToSheet = useCallback(async (payload) => {
    if (!sheetUrl) return { success: true, offline: true };
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      try {
        const data = await response.json();
        return { success: data?.success !== false, data };
      } catch {
        return { success: true };
      }
    }
    return { success: false, error: 'Non-OK response' };
  }, [sheetUrl]);

  const exportToSheet = useCallback(async () => {
    if (!sheetUrl) return;
    setSheetExportStatus('exporting');
    try {
      await postToSheet({ action: 'exportLeads', leads });
      await postToSheet({ action: 'exportNotes', notes });
      await postToSheet({ action: 'savePipelines', pipelines });
      await postToSheet({ action: 'saveCallingLists', callingLists });
      await postToSheet({ action: 'saveSettings', settings });
      workspace.saveSheetUrl(sheetUrl);
      setSheetExportStatus('done');
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSheetExportStatus('idle'), 3000);
    } catch (err) {
      console.error('Sheet export error:', err);
      setSheetExportStatus('error');
    }
  }, [sheetUrl, leads, notes, pipelines, callingLists, settings, postToSheet, workspace]);

  const importFromSheet = useCallback(async () => {
    if (!sheetUrl) return;
    setSheetExportStatus('exporting');
    try {
      const res = await fetch(`${sheetUrl}?action=readAll`);
      const data = await res.json();
      if (!data.success) { setSheetExportStatus('error'); return; }

      if (Array.isArray(data.leads)) {
        for (const lead of data.leads) await workspace.saveLead(lead, null);
      }
      if (Array.isArray(data.notes)) {
        for (const note of data.notes) await workspace.addNote(note);
      }
      if (Array.isArray(data.pipelines)) {
        for (const p of data.pipelines) await workspace.savePipeline(p);
      }
      if (Array.isArray(data.sprints)) {
        for (const s of data.sprints) await workspace.saveSprint(s);
      }
      if (Array.isArray(data.callingLists)) {
        for (const list of data.callingLists) await workspace.saveCallingList(list);
      }
      if (data.settings?.whatsappTemplates) {
        await workspace.saveWsSettings({ whatsappTemplates: data.settings.whatsappTemplates });
      }

      setSheetExportStatus('done');
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSheetExportStatus('idle'), 3000);
    } catch (err) {
      console.error('Sheet import error:', err);
      setSheetExportStatus('error');
    }
  }, [sheetUrl, workspace]);

  return {
    sheetUrl,
    setSheetUrl,
    exportToSheet,
    importFromSheet,
    sheetExportStatus,
    lastSyncTime,
    syncStatus,
    networkOnline,
  };
}
