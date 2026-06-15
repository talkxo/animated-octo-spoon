import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { DEFAULT_PIPELINES } from '../constants';

const CrmContext = createContext(null);

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within CrmProvider');
  return ctx;
}

export function CrmProvider({ user, children }) {
  const workspace = useWorkspace(user);

  const leads = workspace.leads || [];
  const notes = workspace.notes || [];
  const pipelines = workspace.pipelines?.length > 0 ? workspace.pipelines : DEFAULT_PIPELINES;
  const sprints = workspace.sprints || [];
  const callingLists = workspace.callingLists || [];

  // Active pipeline — hydrate from Firestore, save explicitly on change
  const [activePipelineId, setActivePipelineIdLocal] = useState('agency_pipeline');

  useEffect(() => {
    if (workspace.userSettings?.activePipelineId) {
      setActivePipelineIdLocal(workspace.userSettings.activePipelineId);
    }
  }, [workspace.userSettings?.activePipelineId]);

  const setActivePipelineId = useCallback((id) => {
    setActivePipelineIdLocal(id);
    if (user) workspace.saveUserSettings({ activePipelineId: id });
  }, [user, workspace]);

  const activePipeline = pipelines.find(p => String(p.id) === String(activePipelineId)) || pipelines[0];

  // Active sprint (UI-only, persisted to localStorage)
  const [activeSprintId, setActiveSprintId] = useState(
    () => localStorage.getItem('crm_active_sprint_id') || null
  );
  const saveActiveSprintIdToStorage = useCallback((id) => {
    setActiveSprintId(id);
    if (id) localStorage.setItem('crm_active_sprint_id', id);
    else localStorage.removeItem('crm_active_sprint_id');
  }, []);

  // CRM mutations — thin wrappers around workspace methods
  const saveLead = useCallback(async (leadData) => {
    const isNew = !leadData.id;
    const finalId = leadData.id || `lead-${Date.now()}`;
    const finalData = { ...leadData, id: finalId, pipelineId: leadData.pipelineId || activePipelineId };
    const prevLead = leads.find(l => l.id === finalId) || null;
    await workspace.saveLead(finalData, prevLead);
    if (isNew) {
      await workspace.addNote({
        leadId: finalId,
        text: 'Lead created in CRM.',
        type: 'system',
        timestamp: new Date().toISOString(),
      });
    }
  }, [workspace, leads, activePipelineId]);

  const deleteLead = useCallback(async (id) => {
    await workspace.deleteLead(id);
  }, [workspace]);

  const addNote = useCallback(async (noteData) => {
    const finalNote = { ...noteData, id: `note-${Date.now()}`, timestamp: new Date().toISOString() };
    await workspace.addNote(finalNote);
    if (noteData.type === 'call' || noteData.type === 'whatsapp') {
      const relatedLead = leads.find(l => String(l.id) === String(noteData.leadId));
      if (relatedLead) {
        await workspace.saveLead(
          { ...relatedLead, lastContacted: finalNote.timestamp },
          relatedLead
        );
      }
    }
  }, [workspace, leads]);

  const updatePipelines = useCallback(async (updatedPipelines) => {
    const existingIds = new Set(pipelines.map(p => p.id));
    const updatedIds = new Set(updatedPipelines.map(p => p.id));
    for (const p of pipelines) {
      if (!updatedIds.has(p.id)) await workspace.deletePipeline(p.id);
    }
    for (const p of updatedPipelines) await workspace.savePipeline(p);
  }, [workspace, pipelines]);

  const syncSprint = useCallback(async (sprint) => {
    await workspace.saveSprint(sprint);
  }, [workspace]);

  const deleteSprint = useCallback(async (id) => {
    await workspace.deleteSprint(id);
  }, [workspace]);

  const syncCallingLists = useCallback(async (lists) => {
    for (const list of lists) await workspace.saveCallingList(list);
  }, [workspace]);

  const value = {
    // Data
    leads,
    notes,
    pipelines,
    sprints,
    callingLists,

    // Pipeline
    activePipelineId,
    setActivePipelineId,
    activePipeline,

    // Sprint
    activeSprintId,
    saveActiveSprintIdToStorage,

    // Mutations
    saveLead,
    deleteLead,
    addNote,
    updatePipelines,
    syncSprint,
    deleteSprint,
    syncCallingLists,

    // Workspace metadata (pass through)
    workspace,
  };

  return (
    <CrmContext.Provider value={value}>
      {children}
    </CrmContext.Provider>
  );
}
