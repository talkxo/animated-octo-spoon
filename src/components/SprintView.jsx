import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneCall,
  MessageSquare, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  CheckCircle, 
  AlertCircle, 
  PhoneOff, 
  Plus, 
  Undo2, 
  Play, 
  Trophy,
  Activity,
  ArrowRight,
  ClipboardList,
  Upload,
  Trash2,
  Pause,
  FolderPlus,
  History,
  UserPlus,
  Check
} from 'lucide-react';

const getCurrencySymbol = (currencyCode) => {
  const mapping = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    CAD: 'C$',
    AUD: 'A$',
    SGD: 'S$'
  };
  return mapping[currencyCode] || '$';
};

export default function SprintView({ 
  leads = [], 
  activePipeline, 
  pipelines = [], 
  whatsappTemplates = [], 
  addNote, 
  saveLead, 
  onSelectLead,
  currency
}) {
  // Repositories
  const [sprints, setSprints] = useState(() => {
    const data = localStorage.getItem('crm_sprints');
    return data ? JSON.parse(data) : [];
  });

  const [callingLists, setCallingLists] = useState(() => {
    const data = localStorage.getItem('crm_calling_lists');
    return data ? JSON.parse(data) : [];
  });

  const [activeSprintId, setActiveSprintId] = useState(() => {
    return localStorage.getItem('crm_active_sprint_id') || null;
  });

  // Sprint Management States
  const [sprintState, setSprintState] = useState('setup'); // 'setup', 'active', 'finished'
  const [sprintQueue, setSprintQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sprintLogs, setSprintLogs] = useState([]); // tracks outcomes of this sprint
  const [activeSprint, setActiveSprint] = useState(null);

  // Filter & Sort Settings for Sprint Queue (CRM Pipeline)
  const [stageFilter, setStageFilter] = useState('All');
  const [sortBy, setSortBy] = useState('value-desc'); // 'value-desc', 'contact-oldest', 'name-asc'

  // New Sprint Form Inputs
  const [newSprintSourceType, setNewSprintSourceType] = useState('pipeline'); // 'pipeline' | 'list'
  const [newSprintSourceId, setNewSprintSourceId] = useState('');
  const [newSprintName, setNewSprintName] = useState('');

  // Custom List Uploader States
  const [isListCreatorOpen, setIsListCreatorOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListPasteText, setNewListPasteText] = useState('');
  const [parsedPreviewLeads, setParsedPreviewLeads] = useState([]);
  const [parseWarning, setParseWarning] = useState('');

  // Active Lead Sprint Inputs
  const [callOutcome, setCallOutcome] = useState('');
  const [callNotes, setCallNotes] = useState('');

  // Custom List Convert to Lead States
  const [isConverting, setIsConverting] = useState(false);
  const [conversionPipelineId, setConversionPipelineId] = useState('');
  const [conversionStage, setConversionStage] = useState('');

  // Expanded Log IDs for Sprints Log
  const [expandedSprintIds, setExpandedSprintIds] = useState({});

  // Sync state helpers
  const saveSprintsToStorage = (updatedSprints) => {
    setSprints(updatedSprints);
    localStorage.setItem('crm_sprints', JSON.stringify(updatedSprints));
  };

  const saveCallingListsToStorage = (updatedLists) => {
    setCallingLists(updatedLists);
    localStorage.setItem('crm_calling_lists', JSON.stringify(updatedLists));
  };

  const saveActiveSprintIdToStorage = (id) => {
    setActiveSprintId(id);
    if (id) {
      localStorage.setItem('crm_active_sprint_id', id);
    } else {
      localStorage.removeItem('crm_active_sprint_id');
    }
  };

  // Synchronize dynamic default values
  useEffect(() => {
    if (newSprintSourceType === 'pipeline' && pipelines.length > 0) {
      const defaultId = activePipeline?.id || pipelines[0].id;
      setNewSprintSourceId(defaultId);
    } else if (newSprintSourceType === 'list' && callingLists.length > 0) {
      setNewSprintSourceId(callingLists[0].id);
    } else {
      setNewSprintSourceId('');
    }
  }, [newSprintSourceType, pipelines, activePipeline, callingLists]);

  useEffect(() => {
    const sourceName = newSprintSourceType === 'pipeline'
      ? (pipelines.find(p => p.id === newSprintSourceId)?.name || '')
      : (callingLists.find(l => l.id === newSprintSourceId)?.name || '');
    
    if (sourceName) {
      setNewSprintName(`Sprint - ${sourceName} - ${new Date().toLocaleDateString()}`);
    } else {
      setNewSprintName('');
    }
  }, [newSprintSourceType, newSprintSourceId, pipelines, callingLists]);

  // Set default pipelines for Lead Conversion Modal
  useEffect(() => {
    if (isConverting && pipelines.length > 0) {
      const defaultPipe = activePipeline?.id || pipelines[0].id;
      setConversionPipelineId(defaultPipe);
    }
  }, [isConverting, pipelines, activePipeline]);

  useEffect(() => {
    if (conversionPipelineId && pipelines.length > 0) {
      const pipe = pipelines.find(p => p.id === conversionPipelineId);
      if (pipe && pipe.stages && pipe.stages.length > 0) {
        setConversionStage(pipe.stages[0]);
      }
    }
  }, [conversionPipelineId, pipelines]);

  // CSV Parsing Logic
  const parseCSVOrTabText = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setParsedPreviewLeads([]);
      setParseWarning('No content to parse.');
      return;
    }
    
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const parseCSVLine = (line, delim) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result.map(val => val.replace(/^"|"$/g, ''));
    };

    let headers = parseCSVLine(lines[0], delimiter);
    let hasHeader = false;
    let nameIdx = -1;
    let phoneIdx = -1;
    let companyIdx = -1;
    let emailIdx = -1;
    let valueIdx = -1;

    const cleanHeader = h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    const nameAliases = ['name', 'fullname', 'prospect', 'contact', 'lead', 'client'];
    const phoneAliases = ['phone', 'telephone', 'mobile', 'ph', 'number', 'cell', 'phonephone'];
    const companyAliases = ['company', 'org', 'organization', 'business', 'companyname'];
    const emailAliases = ['email', 'emailaddress', 'e-mail', 'mail'];
    const valueAliases = ['value', 'amount', 'dealvalue', 'price', 'revenue', 'budget'];

    headers.forEach((h, idx) => {
      const cleaned = cleanHeader(h);
      if (nameAliases.includes(cleaned)) { nameIdx = idx; hasHeader = true; }
      else if (phoneAliases.includes(cleaned)) { phoneIdx = idx; hasHeader = true; }
      else if (companyAliases.includes(cleaned)) { companyIdx = idx; hasHeader = true; }
      else if (emailAliases.includes(cleaned)) { emailIdx = idx; hasHeader = true; }
      else if (valueAliases.includes(cleaned)) { valueIdx = idx; hasHeader = true; }
    });

    if (!hasHeader) {
      // Fallback ordered columns
      nameIdx = 0;
      phoneIdx = 1;
      companyIdx = 2;
      emailIdx = 3;
      valueIdx = 4;
    }

    const startRow = hasHeader ? 1 : 0;
    const parsed = [];
    let skippedCount = 0;

    for (let i = startRow; i < lines.length; i++) {
      const row = parseCSVLine(lines[i], delimiter);
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : `Prospect ${i + 1}`;
      const phoneRaw = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : '';
      const company = companyIdx !== -1 && row[companyIdx] ? row[companyIdx] : '';
      const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : '';
      
      let value = 0;
      if (valueIdx !== -1 && row[valueIdx]) {
        const cleanedVal = row[valueIdx].replace(/[^0-9.]/g, '');
        value = parseFloat(cleanedVal) || 0;
      }

      if (phoneRaw) {
        parsed.push({
          id: `prospect-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name,
          phone: phoneRaw,
          company,
          email,
          value,
          status: 'Prospect'
        });
      } else {
        skippedCount++;
      }
    }

    setParsedPreviewLeads(parsed);
    
    let warning = '';
    if (skippedCount > 0) {
      warning = `${skippedCount} row(s) skipped due to missing phone numbers.`;
    }
    if (parsed.length === 0) {
      warning = 'No valid records found (must contain phone numbers).';
    }
    setParseWarning(warning);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setNewListName(`List - ${baseName}`);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setNewListPasteText(text);
      parseCSVOrTabText(text);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e) => {
    const text = e.target.value;
    setNewListPasteText(text);
    parseCSVOrTabText(text);
  };

  const handleSaveCallingList = () => {
    if (parsedPreviewLeads.length === 0) return;
    
    const listName = newListName.trim() || `Custom List - ${new Date().toLocaleDateString()}`;
    const newList = {
      id: `list-${Date.now()}`,
      name: listName,
      leads: parsedPreviewLeads,
      createdAt: new Date().toISOString()
    };
    
    const updatedLists = [newList, ...callingLists];
    saveCallingListsToStorage(updatedLists);
    
    setNewListName('');
    setNewListPasteText('');
    setParsedPreviewLeads([]);
    setParseWarning('');
    setIsListCreatorOpen(false);
  };

  const handleDeleteCallingList = (listId, e) => {
    e.stopPropagation();
    const updatedLists = callingLists.filter(l => l.id !== listId);
    saveCallingListsToStorage(updatedLists);
  };

  // Compile Outreach Queue based on selections
  const compileSprintQueue = (sourceType, sourceId, stageFilt, sortVal) => {
    let queue = [];
    if (sourceType === 'pipeline') {
      queue = leads.filter(l => l.pipelineId === sourceId);
      // Exclude won/lost leads
      queue = queue.filter(l => l.status !== 'Won' && l.status !== 'Lost' && l.status !== 'Closed Won' && l.status !== 'Closed Lost');
      
      if (stageFilt !== 'All') {
        queue = queue.filter(l => l.status === stageFilt);
      }
      
      if (sortVal === 'value-desc') {
        queue.sort((a, b) => (b.value || 0) - (a.value || 0));
      } else if (sortVal === 'contact-oldest') {
        queue.sort((a, b) => {
          if (!a.lastContacted) return -1;
          if (!b.lastContacted) return 1;
          return new Date(a.lastContacted) - new Date(b.lastContacted);
        });
      } else if (sortVal === 'name-asc') {
        queue.sort((a, b) => a.name.localeCompare(b.name));
      }
    } else {
      const list = callingLists.find(l => l.id === sourceId);
      if (list) {
        queue = [...list.leads];
      }
    }
    return queue;
  };

  // Start a new sprint
  const handleLaunchSprint = () => {
    const queue = compileSprintQueue(newSprintSourceType, newSprintSourceId, stageFilter, sortBy);
    if (queue.length === 0) return;
    
    const sourceName = newSprintSourceType === 'pipeline' 
      ? (pipelines.find(p => p.id === newSprintSourceId)?.name || 'Pipeline') 
      : (callingLists.find(l => l.id === newSprintSourceId)?.name || 'List');
      
    const sprintName = newSprintName.trim() || `Sprint - ${sourceName} - ${new Date().toLocaleDateString()}`;
    
    const newSprint = {
      id: `sprint-${Date.now()}`,
      name: sprintName,
      type: newSprintSourceType,
      sourceId: newSprintSourceId,
      sourceName: sourceName,
      status: 'active',
      currentIdx: 0,
      queue: queue,
      logs: [],
      createdAt: new Date().toISOString()
    };
    
    const updatedSprints = [newSprint, ...sprints];
    saveSprintsToStorage(updatedSprints);
    saveActiveSprintIdToStorage(newSprint.id);
    
    setActiveSprint(newSprint);
    setSprintQueue(queue);
    setCurrentIdx(0);
    setSprintLogs([]);
    setSprintState('active');
    
    setCallOutcome('');
    setCallNotes('');
  };

  // Resume suspended sprint
  const handleResumeSprint = (sprintId) => {
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    setActiveSprint(sprint);
    setSprintQueue(sprint.queue || []);
    setCurrentIdx(sprint.currentIdx || 0);
    setSprintLogs(sprint.logs || []);
    saveActiveSprintIdToStorage(sprint.id);
    
    if (sprint.status !== 'active') {
      const updatedSprints = sprints.map(s => {
        if (s.id === sprint.id) {
          return { ...s, status: 'active' };
        }
        return s;
      });
      saveSprintsToStorage(updatedSprints);
    }
    
    setCallOutcome('');
    setCallNotes('');
    setSprintState('active');
  };

  // Suspend/pause current sprint
  const handleSuspendSprint = () => {
    if (!activeSprintId) return;
    
    const updatedSprints = sprints.map(s => {
      if (s.id === activeSprintId) {
        return {
          ...s,
          status: 'suspended',
          currentIdx: currentIdx,
          queue: sprintQueue,
          logs: sprintLogs
        };
      }
      return s;
    });
    
    saveSprintsToStorage(updatedSprints);
    setSprintState('setup');
    setActiveSprint(null);
  };

  // End active sprint manually
  const handleCompleteSprint = (sprintId = activeSprintId) => {
    const targetId = sprintId || activeSprintId;
    if (!targetId) return;
    
    const updatedSprints = sprints.map(s => {
      if (s.id === targetId) {
        return {
          ...s,
          status: 'completed',
          currentIdx: currentIdx,
          queue: sprintQueue,
          logs: sprintLogs
        };
      }
      return s;
    });
    
    saveSprintsToStorage(updatedSprints);
    saveActiveSprintIdToStorage(null);
    setActiveSprint(null);
    setSprintState('finished');
  };

  const handleDeleteSprint = (sprintId, e) => {
    e.stopPropagation();
    const updatedSprints = sprints.filter(s => s.id !== sprintId);
    saveSprintsToStorage(updatedSprints);
    if (activeSprintId === sprintId) {
      saveActiveSprintIdToStorage(null);
    }
  };

  // Convert prospect to lead
  const handleConfirmConversion = () => {
    if (!conversionPipelineId || !conversionStage) return;
    
    const activeLead = sprintQueue[currentIdx];
    const leadId = `lead-${Date.now()}`;
    const newLead = {
      id: leadId,
      name: activeLead.name,
      company: activeLead.company || '',
      phone: activeLead.phone,
      email: activeLead.email || '',
      value: activeLead.value || 0,
      pipelineId: conversionPipelineId,
      status: conversionStage,
      notes: []
    };

    saveLead(newLead);

    // Update prospect inside the queue
    const updatedQueue = [...sprintQueue];
    updatedQueue[currentIdx] = {
      ...updatedQueue[currentIdx],
      id: leadId,
      converted: true
    };
    setSprintQueue(updatedQueue);

    // Save to active sprint repository
    const updatedSprints = sprints.map(s => {
      if (s.id === activeSprintId) {
        return { ...s, queue: updatedQueue };
      }
      return s;
    });
    saveSprintsToStorage(updatedSprints);

    // Add timelines notes
    addNote({
      leadId: leadId,
      text: `Converted from Custom List Calling Sprint.`,
      type: 'system'
    });

    setIsConverting(false);
  };

  const activeLead = sprintQueue[currentIdx];

  // WhatsApp template helper
  const getWhatsAppLink = (templateText, lead) => {
    let compiled = templateText
      .replace(/{{name}}/g, lead.name)
      .replace(/{{company}}/g, lead.company || '')
      .replace(/{{value}}/g, `${getCurrencySymbol(currency)}${(lead.value || 0).toLocaleString()}`);
      
    let cleanPhone = lead.phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length > 5) {
      cleanPhone = '+' + cleanPhone;
    }
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(compiled)}`;
  };

  const handleWhatsAppTrigger = (templateTitle) => {
    const isCrmLead = activeLead.id.startsWith('lead-');
    if (isCrmLead) {
      addNote({
        leadId: activeLead.id,
        text: `Sent WhatsApp outreach: "${templateTitle}"`,
        type: 'whatsapp'
      });
    }
    
    setSprintLogs(prev => [...prev, { leadName: activeLead.name, action: 'whatsapp', details: templateTitle }]);
  };

  // Next lead in queue
  const handleNextLead = () => {
    const isCrmLead = activeLead.id.startsWith('lead-');
    
    if (callOutcome || callNotes) {
      const outcomeText = callOutcome ? `Call Outcome: [${callOutcome}]` : 'Call completed';
      const combinedText = callNotes ? `${outcomeText}. Notes: ${callNotes}` : outcomeText;
      
      if (isCrmLead) {
        addNote({
          leadId: activeLead.id,
          text: combinedText,
          type: 'call'
        });

        // Pipeline stage automation mapping
        if (activeSprint?.type === 'pipeline') {
          let updatedLead = { ...activeLead };
          const pId = activeSprint.sourceId;
          const pipeline = pipelines.find(p => p.id === pId);
          if (pipeline) {
            if (callOutcome === 'Deal Won') {
              updatedLead.status = pipeline.stages.find(s => s.toLowerCase().includes('won')) || 'Won';
            } else if (callOutcome === 'Deal Lost') {
              updatedLead.status = pipeline.stages.find(s => s.toLowerCase().includes('lost')) || 'Lost';
            } else if (callOutcome === 'Demo Booked' || callOutcome === 'Meeting Scheduled') {
              updatedLead.status = pipeline.stages.find(s => s.toLowerCase().includes('meeting') || s.toLowerCase().includes('demo')) || activeLead.status;
            } else if (activeLead.status === pipeline.stages[0] && (callOutcome === 'Connected' || callOutcome === 'Demo Booked')) {
              updatedLead.status = pipeline.stages[1] || activeLead.status;
            }
          }
          saveLead(updatedLead);
        }
      }
      
      setSprintLogs(prev => [...prev, { leadName: activeLead.name, action: 'call', outcome: callOutcome, notes: callNotes }]);
    } else {
      setSprintLogs(prev => [...prev, { leadName: activeLead.name, action: 'skip' }]);
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx < sprintQueue.length) {
      setCurrentIdx(nextIdx);
      setCallOutcome('');
      setCallNotes('');
      setIsConverting(false);
      
      // Update ongoing state in storage
      const updatedSprints = sprints.map(s => {
        if (s.id === activeSprintId) {
          return { ...s, currentIdx: nextIdx, logs: [...sprintLogs, { leadName: activeLead.name, action: 'call', outcome: callOutcome, notes: callNotes }] };
        }
        return s;
      });
      saveSprintsToStorage(updatedSprints);
    } else {
      handleCompleteSprint();
    }
  };

  const handleSkipLead = () => {
    setSprintLogs(prev => [...prev, { leadName: activeLead.name, action: 'skip' }]);
    
    const nextIdx = currentIdx + 1;
    if (nextIdx < sprintQueue.length) {
      setCurrentIdx(nextIdx);
      setCallOutcome('');
      setCallNotes('');
      setIsConverting(false);

      const updatedSprints = sprints.map(s => {
        if (s.id === activeSprintId) {
          return { ...s, currentIdx: nextIdx, logs: [...sprintLogs, { leadName: activeLead.name, action: 'skip' }] };
        }
        return s;
      });
      saveSprintsToStorage(updatedSprints);
    } else {
      handleCompleteSprint();
    }
  };

  const outcomes = [
    { label: 'Connected & Talked', value: 'Connected', icon: '✅' },
    { label: 'No Answer / Voicemail', value: 'No Answer', icon: '🚫' },
    { label: 'Busy / Call Back Later', value: 'Busy', icon: '⏳' },
    { label: 'Meeting / Demo Scheduled', value: 'Demo Booked', icon: '📅' },
    { label: 'Deal Won & Closed', value: 'Deal Won', icon: '🏆' },
    { label: 'Deal Lost / Refused', value: 'Deal Lost', icon: '💀' }
  ];

  // Lookup ongoing/suspended sprint if exists
  const ongoingSprint = sprints.find(s => s.id === activeSprintId && (s.status === 'active' || s.status === 'suspended'));

  return (
    <div className="sprint-view-wrapper">
      
      {/* STEP 1: SETUP SCREEN */}
      {sprintState === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* ONGOING/SUSPENDED SPRINT CARD */}
          {ongoingSprint && (
            <div className="glass-card" style={{ border: '1px solid var(--accent)', background: 'var(--accent-glow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Activity size={18} className="text-accent" />
                    On-going Outreach Sprint Detected
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    <strong>{ongoingSprint.name}</strong> ({ongoingSprint.sourceName}) is currently {ongoingSprint.status}.
                  </p>
                </div>
                <span className="lane-badge active" style={{ background: 'var(--accent)', color: 'var(--bg-base)', fontWeight: 700 }}>
                  {ongoingSprint.status.toUpperCase()}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.round(((ongoingSprint.currentIdx) / ongoingSprint.queue.length) * 100)}%`,
                    height: '100%',
                    background: 'var(--accent)'
                  }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  {ongoingSprint.currentIdx}/{ongoingSprint.queue.length}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => handleCompleteSprint(ongoingSprint.id)}
                >
                  Mark Completed
                </button>
                <button 
                  className="btn btn-accent" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={() => handleResumeSprint(ongoingSprint.id)}
                >
                  <Play size={12} fill="currentColor" />
                  Resume Sprint
                </button>
              </div>
            </div>
          )}

          {/* START NEW SPRINT CARD */}
          <div className="glass-card sprint-setup-card">
            <div className="lead-sprint-profile" style={{ padding: '0.5rem 0 1rem 0' }}>
              <div className="profile-avatar" style={{ border: 'none' }}>
                <PhoneCall size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <h2 className="profile-name" style={{ fontSize: '1.5rem' }}>Outreach Calling Sprint</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', padding: '0 1rem' }}>
                Select a CRM pipeline or import a custom list, and systematically run through leads.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Sprint Target Source</label>
                <select 
                  className="form-select"
                  value={newSprintSourceType}
                  onChange={(e) => setNewSprintSourceType(e.target.value)}
                >
                  <option value="pipeline">CRM Sales Pipeline</option>
                  <option value="list">Custom Uploaded List</option>
                </select>
              </div>

              {newSprintSourceType === 'pipeline' ? (
                <div className="form-group">
                  <label className="form-label">Select CRM Pipeline</label>
                  <select 
                    className="form-select"
                    value={newSprintSourceId}
                    onChange={(e) => setNewSprintSourceId(e.target.value)}
                  >
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Select Custom List</label>
                  <select 
                    className="form-select"
                    value={newSprintSourceId}
                    onChange={(e) => setNewSprintSourceId(e.target.value)}
                    disabled={callingLists.length === 0}
                  >
                    {callingLists.length === 0 ? (
                      <option value="">-- No Lists Imported Yet --</option>
                    ) : (
                      callingLists.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.leads.length} leads)</option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>

            {newSprintSourceType === 'pipeline' && (
              <div className="setup-filter-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Filter by Pipeline Stage</label>
                  <select 
                    className="form-select"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                  >
                    <option value="All">All Active Stages</option>
                    {pipelines.find(p => p.id === newSprintSourceId)?.stages.slice(0, -2).map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Priority Dialer Order</label>
                  <select 
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="value-desc">Highest Deal Value First</option>
                    <option value="contact-oldest">Coldest Leads First</option>
                    <option value="name-asc">Alphabetical (A - Z)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Custom Sprint Name (Optional)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Overriding sprint title..."
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
              />
            </div>

            {/* Queue summary box */}
            {newSprintSourceId && (
              <div className="sync-queue-container" style={{ marginTop: 0, marginBottom: '1rem' }}>
                <div className="sprint-progress-row" style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ClipboardList size={16} style={{ color: 'var(--primary)' }} />
                    OUTREACH DIALER PREVIEW
                  </div>
                  <span className="lane-badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                    {compileSprintQueue(newSprintSourceType, newSprintSourceId, stageFilter, sortBy).length} Contacts
                  </span>
                </div>
                
                <div className="sprint-logs-list">
                  {compileSprintQueue(newSprintSourceType, newSprintSourceId, stageFilter, sortBy)
                    .slice(0, 5)
                    .map((l, idx) => (
                      <div key={l.id || idx} className="sprint-progress-row" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{l.name}</span>
                          {l.company && <span style={{ color: 'var(--text-dark)', marginLeft: '0.35rem' }}>({l.company})</span>}
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>{getCurrencySymbol(currency)}{(l.value || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  
                  {compileSprintQueue(newSprintSourceType, newSprintSourceId, stageFilter, sortBy).length > 5 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', textAlign: 'center', marginTop: '0.25rem' }}>
                      + and {compileSprintQueue(newSprintSourceType, newSprintSourceId, stageFilter, sortBy).length - 5} more in queue...
                    </div>
                  )}

                  {compileSprintQueue(newSprintSourceType, newSprintSourceId, stageFilter, sortBy).length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textAlign: 'center', padding: '0.5rem' }}>
                      No contacts matching filters found in selected source.
                    </div>
                  )}
                </div>
              </div>
            )}

            <button 
              className="btn btn-primary btn-call-sprint" 
              style={{ marginTop: '0.5rem' }}
              onClick={handleLaunchSprint}
              disabled={!newSprintSourceId || compileSprintQueue(newSprintSourceType, newSprintSourceId, stageFilter, sortBy).length === 0}
            >
              <Play size={18} fill="white" />
              <span>Launch Outreach Sprint</span>
            </button>
          </div>

          {/* CUSTOM CALLING LISTS MANAGER */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FolderPlus size={18} style={{ color: 'var(--primary)' }} />
                Custom Calling Lists
              </h3>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => setIsListCreatorOpen(!isListCreatorOpen)}
              >
                {isListCreatorOpen ? 'Hide Importer' : 'Import CSV List'}
              </button>
            </div>

            {/* Expandable uploader form */}
            {isListCreatorOpen && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }} className="fade-in">
                <div className="form-group">
                  <label className="form-label">Calling List Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Inbound Signups Q2"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="csv-upload-zone" style={{ border: '1.5px dashed var(--border-light)', borderRadius: '8px', padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', cursor: 'pointer' }}>
                    <input 
                      type="file" 
                      accept=".csv" 
                      style={{ display: 'none' }} 
                      id="csv-file-picker"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="csv-file-picker" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                      <Upload size={28} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Select CSV File</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to browse files</span>
                    </label>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Or Paste Comma/Tab Separated Rows</label>
                    <textarea 
                      className="form-input" 
                      rows={5}
                      placeholder="Name, Phone, Company, Email, Value&#10;Alice, +1999888, Apple, a@apple.com, 5000&#10;Bob, +1777666, Acme, b@acme.com, 1200"
                      style={{ fontSize: '0.8rem', fontFamily: 'monospace', resize: 'none' }}
                      value={newListPasteText}
                      onChange={handlePasteChange}
                    />
                  </div>
                </div>

                {parseWarning && (
                  <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(249,115,22,0.1)', color: 'var(--primary)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <AlertCircle size={14} />
                    <span>{parseWarning}</span>
                  </div>
                )}

                {parsedPreviewLeads.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        PARSED LEADS PREVIEW (Showing first 5 of {parsedPreviewLeads.length})
                      </span>
                    </div>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                      <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Phone</th>
                            <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Company</th>
                            <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Email</th>
                            <th style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedPreviewLeads.slice(0, 5).map((l, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '0.45rem 0.6rem', fontWeight: 700 }}>{l.name}</td>
                              <td style={{ padding: '0.45rem 0.6rem' }}>{l.phone}</td>
                              <td style={{ padding: '0.45rem 0.6rem', color: 'var(--text-muted)' }}>{l.company || '-'}</td>
                              <td style={{ padding: '0.45rem 0.6rem', color: 'var(--text-muted)' }}>{l.email || '-'}</td>
                              <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>{getCurrencySymbol(currency)}{l.value.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      setNewListName('');
                      setNewListPasteText('');
                      setParsedPreviewLeads([]);
                      setParseWarning('');
                      setIsListCreatorOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    disabled={parsedPreviewLeads.length === 0}
                    onClick={handleSaveCallingList}
                  >
                    Save Custom List
                  </button>
                </div>
              </div>
            )}

            {/* Custom Lists Directory */}
            <div style={{ marginTop: '1.25rem' }}>
              <div className="sprint-logs-list" style={{ maxHeight: '200px' }}>
                {callingLists.map(list => (
                  <div key={list.id} className="sprint-progress-row" style={{ fontSize: '0.85rem', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{list.name}</span>
                      <span style={{ color: 'var(--text-dark)', marginLeft: '0.4rem', fontSize: '0.8rem' }}>({list.leads.length} contacts)</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Imported {new Date(list.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button 
                      className="outcome-btn lost" 
                      style={{ padding: '0.3rem', borderRadius: '4px' }}
                      onClick={(e) => handleDeleteCallingList(list.id, e)}
                      title="Delete calling list"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {callingLists.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textAlign: 'center', padding: '1rem' }}>
                    No custom uploaded lists. Paste/upload above to get started.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* OUTREACH SPRINT LOGS HISTORY */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <History size={18} style={{ color: 'var(--primary)' }} />
              Sprint Logs & History
            </h3>

            <div className="sprint-logs-list" style={{ maxHeight: '360px' }}>
              {sprints.map(sprint => {
                const isExpanded = expandedSprintIds[sprint.id];
                const completedPct = sprint.queue && sprint.queue.length > 0 
                  ? Math.round((sprint.currentIdx / sprint.queue.length) * 100) 
                  : 0;
                  
                const wonCount = sprint.logs ? sprint.logs.filter(l => l.outcome === 'Deal Won').length : 0;
                const connCount = sprint.logs ? sprint.logs.filter(l => l.outcome === 'Connected' || l.outcome === 'Demo Booked').length : 0;
                const skipCount = sprint.logs ? sprint.logs.filter(l => l.action === 'skip').length : 0;

                return (
                  <div key={sprint.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                    
                    <div 
                      style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setExpandedSprintIds(prev => ({ ...prev, [sprint.id]: !prev[sprint.id] }))}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{sprint.name}</span>
                          <span className={`lane-badge ${sprint.status}`} style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.4rem',
                            background: sprint.status === 'active' ? 'var(--primary-glow)' : sprint.status === 'suspended' ? 'var(--accent-glow)' : 'rgba(16,185,129,0.1)',
                            color: sprint.status === 'active' ? 'var(--primary)' : sprint.status === 'suspended' ? 'var(--accent)' : '#10b981'
                          }}>
                            {sprint.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Source: <strong style={{ color: 'var(--text-main)' }}>{sprint.type === 'pipeline' ? 'Pipeline' : 'Custom List'}</strong> ({sprint.sourceName})</span>
                          <span>Created: {new Date(sprint.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Progress slider bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${completedPct}%`,
                              height: '100%',
                              background: sprint.status === 'active' ? 'var(--primary)' : sprint.status === 'suspended' ? 'var(--accent)' : '#10b981',
                              borderRadius: '2px'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dark)' }}>{sprint.currentIdx}/{sprint.queue?.length || 0} ({completedPct}%)</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                        {sprint.status === 'suspended' && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResumeSprint(sprint.id);
                            }}
                          >
                            <Play size={10} fill="white" />
                            Resume
                          </button>
                        )}
                        
                        <button 
                          className="outcome-btn lost" 
                          style={{ padding: '0.3rem' }}
                          onClick={(e) => handleDeleteSprint(sprint.id, e)}
                        >
                          <Trash2 size={12} />
                        </button>

                        {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--border-light)' }} className="fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>{wonCount}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>WON</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>{connCount}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CONNECTED</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)' }}>{skipCount}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SKIPPED</div>
                          </div>
                        </div>

                        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                          {sprint.logs && sprint.logs.map((log, index) => (
                            <div key={index} style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: 'var(--text-main)' }}>{log.leadName}</strong>
                                <span style={{ color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                                  {log.action === 'skip' ? 'Skipped' : log.action === 'whatsapp' ? `WhatsApp: ${log.details}` : `Call: ${log.outcome}`}
                                </span>
                              </div>
                              {log.notes && <span style={{ color: 'var(--text-dark)', fontStyle: 'italic', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes}>"{log.notes}"</span>}
                            </div>
                          ))}
                          {(!sprint.logs || sprint.logs.length === 0) && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', textAlign: 'center', padding: '0.5rem' }}>
                              No call outreach logged.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}

              {sprints.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textAlign: 'center', padding: '1.5rem' }}>
                  No historical outreach logs. Launch a sprint above!
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* STEP 2: ACTIVE SPRINT MODE */}
      {sprintState === 'active' && activeLead && (
        <div className="glass-card sprint-active-card">
          
          {/* Header queue progress bar */}
          <div className="sprint-progress-row">
            <button 
              className="outcome-btn" 
              style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={handleSuspendSprint}
            >
              <Pause size={12} />
              <span>Suspend & Pause</span>
            </button>

            <div className="sprint-progress-bar-bg">
              <div 
                className="sprint-progress-bar-fill" 
                style={{ width: `${((currentIdx + 1) / sprintQueue.length) * 100}%` }}
              ></div>
            </div>

            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {currentIdx + 1} / {sprintQueue.length}
            </span>
          </div>

          {/* Lead Card Detail Profile */}
          <div className="sprint-active-profile" onClick={() => activeLead.id.startsWith('lead-') && onSelectLead(activeLead.id)} style={{ cursor: activeLead.id.startsWith('lead-') ? 'pointer' : 'default' }}>
            <div className="profile-avatar">
              {activeLead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="profile-name">{activeLead.name}</div>
            {activeLead.company && <div className="profile-company">{activeLead.company}</div>}
            {activeLead.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{activeLead.email}</div>}
            
            <div className="deal-tags" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              <span className="lead-tag-badge" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                {getCurrencySymbol(currency)}{(activeLead.value || 0).toLocaleString()}
              </span>
              <span className="lead-tag-badge">
                {activeLead.status}
              </span>
              {activeLead.id.startsWith('lead-') ? (
                <span className="lead-tag-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check size={10} />
                  CRM Lead
                </span>
              ) : (
                <span className="lead-tag-badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                  Prospect List
                </span>
              )}
            </div>
          </div>

          {/* BIG DIAL BUTTON & CONVERT LEAD ACTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
            <a 
              href={`tel:${activeLead.phone}`}
              className="btn btn-accent btn-call-sprint"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                setCallOutcome('Connected');
              }}
            >
              <Phone size={22} fill="white" />
              <span>Call Phone Now ({activeLead.phone})</span>
            </a>

            {/* Prospect Convert to Lead trigger */}
            {!activeLead.id.startsWith('lead-') && (
              <div style={{ width: '100%', marginTop: '0.25rem' }}>
                {!isConverting ? (
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', borderColor: 'var(--primary-glow)' }}
                    onClick={() => setIsConverting(true)}
                  >
                    <UserPlus size={15} style={{ color: 'var(--primary)' }} />
                    <span>Convert to CRM Lead</span>
                  </button>
                ) : (
                  <div className="glass-card" style={{ padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', width: '100%' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <UserPlus size={14} style={{ color: 'var(--primary)' }} />
                      CONVERT PROSPECT TO CRM LEAD
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>CRM Pipeline</label>
                        <select 
                          className="form-select" 
                          style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                          value={conversionPipelineId}
                          onChange={(e) => setConversionPipelineId(e.target.value)}
                        >
                          {pipelines.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Starting Stage</label>
                        <select 
                          className="form-select" 
                          style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                          value={conversionStage}
                          onChange={(e) => setConversionStage(e.target.value)}
                        >
                          {pipelines.find(p => p.id === conversionPipelineId)?.stages.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => setIsConverting(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={handleConfirmConversion}
                      >
                        Confirm Convert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QUICK OUTCOMES */}
          <div className="form-group">
            <label className="form-label">Call Feedback Outcome</label>
            <div className="sprint-outcome-btn-grid">
              {outcomes.map(item => (
                <button
                  key={item.value}
                  className={`outcome-btn ${callOutcome === item.value ? 'active' : ''} ${item.value === 'Deal Won' ? 'won' : ''} ${item.value === 'Deal Lost' ? 'lost' : ''}`}
                  onClick={() => setCallOutcome(item.value)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* WHATSAPP TRIGGER */}
          {whatsappTemplates.length > 0 && (
            <div className="whatsapp-triggers-box">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981' }}>
                <MessageSquare size={13} />
                WhatsApp Quick Outreaches
              </label>
              
              <div className="whatsapp-slug-list">
                {whatsappTemplates.map(temp => (
                  <a
                    key={temp.id}
                    href={getWhatsAppLink(temp.text, activeLead)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-slug-btn"
                    onClick={() => handleWhatsAppTrigger(temp.title)}
                  >
                    <span>{temp.title}</span>
                    <ChevronRight size={14} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* CUSTOM NOTES */}
          <div className="form-group">
            <label className="form-label">Outreach Notes / Update</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Spoke to prospect, they need X SLA changed before meeting..."
              style={{ resize: 'none', fontSize: '0.875rem' }}
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
            />
          </div>

          {/* BOTTOM CONTROLS */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              onClick={handleSkipLead}
            >
              Skip
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
              onClick={handleNextLead}
            >
              <span>Save & Continue</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Premature End Button */}
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}
            onClick={() => handleCompleteSprint()}
          >
            End Sprint Prematurely & Save Outcomes
          </button>

        </div>
      )}

      {/* STEP 3: FINISHED SCREEN */}
      {sprintState === 'finished' && (
        <div className="glass-card sprint-setup-card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '50%', color: '#10b981', alignSelf: 'center', marginBottom: '0.5rem' }}>
            <Trophy size={38} />
          </div>
          
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Sprint Completed!</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Awesome job! You've run through your outreach calling list.
            </p>
          </div>

          {/* Call Stats Summary */}
          <div className="grid-metrics" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.25rem', margin: '0.5rem 0' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {sprintLogs.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OUTREACH ACTIONS</div>
            </div>

            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
                {sprintLogs.filter(l => l.outcome === 'Connected' || l.outcome === 'Demo Booked' || l.outcome === 'Deal Won').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONNECTIONS MADE</div>
            </div>
          </div>

          {/* Logs of the sprint */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              SPRINT LOG ACTIVITY
            </div>
            
            <div className="sprint-logs-list" style={{ maxHeight: '160px' }}>
              {sprintLogs.map((log, index) => (
                <div key={index} className="sprint-progress-row" style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{log.leadName}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                      {log.action === 'skip' ? 'Skipped' : log.action === 'whatsapp' ? `WhatsApp Outreach: ${log.details}` : `Call: ${log.outcome}`}
                    </span>
                  </div>
                </div>
              ))}
              
              {sprintLogs.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textAlign: 'center' }}>
                  No activities completed during this sprint
                </div>
              )}
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ marginTop: '1.25rem' }}
            onClick={() => setSprintState('setup')}
          >
            Run Another Sprint
          </button>
        </div>
      )}

    </div>
  );
}
