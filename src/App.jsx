import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PhoneCall, 
  Settings, 
  Database, 
  Wifi, 
  WifiOff, 
  Plus, 
  UserPlus,
  Sun,
  Moon,
  HelpCircle,
  LogOut,
  History
} from 'lucide-react';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches
} from 'kbar';
import FunnelView from './components/FunnelView';
import SprintView from './components/SprintView';
import SettingsView from './components/SettingsView';
import LeadModal from './components/LeadModal';
import SetupWizard from './components/SetupWizard';
import Login from './components/Login';
import SprintsLogView from './components/SprintsLogView';

// Custom KBar results list renderer with high-end styles
function PlutoCommandBarResults() {
  const { results } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className="pluto-kbar-section">{item}</div>
        ) : (
          <div className={`pluto-kbar-item ${active ? 'active' : ''}`}>
            <span className="pluto-kbar-item-name">{item.name}</span>
            {item.shortcut?.length > 0 && (
              <div className="pluto-kbar-shortcut">
                {item.shortcut.map((key, i) => (
                  <kbd key={i} className="pluto-kbar-kbd">{key}</kbd>
                ))}
              </div>
            )}
          </div>
        )
      }
    />
  );
}

// Main Command Palette Component
function PlutoCommandBar() {
  return (
    <KBarPortal>
      <KBarPositioner className="pluto-kbar-backdrop">
        <KBarAnimator className="pluto-kbar-animator">
          <KBarSearch 
            className="pluto-kbar-search" 
            placeholder="Type a command or search (e.g. 'sprint', 'theme', 'sync')..." 
          />
          <PlutoCommandBarResults />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

// Default Multi-Pipeline presets
const DEFAULT_PIPELINES = [
  {
    id: 'agency_pipeline',
    name: 'Agency Sales Pipeline',
    stages: ['Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost']
  },
  {
    id: 'product_pipeline',
    name: 'Product Sales Pipeline',
    stages: ['Inbound', 'Discovery Call', 'Demo Done', 'Contract Sent', 'Closed Won', 'Closed Lost']
  }
];

// Initial mock data to WOW the user on load
const MOCK_LEADS = [
  {
    id: 'lead-1',
    name: 'Sarah Connor',
    company: 'Cyberdyne Systems',
    phone: '+15550199',
    email: 'sarah.c@cyberdyne.io',
    status: 'Proposal Sent',
    value: 18500,
    tags: 'Enterprise, AI Security',
    pipelineId: 'agency_pipeline',
    lastContacted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lead-2',
    name: 'Tony Stark',
    company: 'Stark Industries',
    phone: '+15551984',
    email: 'tony@stark.com',
    status: 'Meeting Scheduled',
    value: 75000,
    tags: 'VIP, Automation',
    pipelineId: 'agency_pipeline',
    lastContacted: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lead-3',
    name: 'Bruce Wayne',
    company: 'Wayne Enterprises',
    phone: '+15550911',
    email: 'bruce@wayne.co',
    status: 'Contacted',
    value: 45000,
    tags: 'Defense, Retainer',
    pipelineId: 'agency_pipeline',
    lastContacted: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lead-4',
    name: 'Elliot Alderson',
    company: 'Allsafe Cybersecurity',
    phone: '+15550201',
    email: 'elliot@allsafe.io',
    status: 'Lead',
    value: 9200,
    tags: 'Cold Outreach',
    pipelineId: 'agency_pipeline',
    lastContacted: ''
  },
  {
    id: 'lead-5',
    name: 'Peter Parker',
    company: 'Daily Bugle',
    phone: '+15550344',
    email: 'peter.p@bugle.com',
    status: 'Won',
    value: 3500,
    tags: 'SMB, Photography',
    pipelineId: 'agency_pipeline',
    lastContacted: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lead-6',
    name: 'John Doe',
    company: 'SaaS Labs Inc',
    phone: '+15559876',
    email: 'john@saaslabs.com',
    status: 'Discovery Call',
    value: 12000,
    tags: 'Product Trial',
    pipelineId: 'product_pipeline',
    lastContacted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_NOTES = [
  {
    id: 'note-1',
    leadId: 'lead-1',
    text: 'Sent standard enterprise service level proposal. Sarah requested a minor change in the SLA terms.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'manual'
  },
  {
    id: 'note-2',
    leadId: 'lead-2',
    text: 'Call connected! Tony is interested in automating their customer support pipeline. Scheduled screen sharing demo next Tuesday.',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'call'
  },
  {
    id: 'note-3',
    leadId: 'lead-3',
    text: 'Sent introduction template via WhatsApp slug.',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    type: 'whatsapp'
  },
  {
    id: 'note-4',
    leadId: 'lead-5',
    text: 'Deal won! Contract signed digitally. Onboarding scheduled for Friday.',
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'system'
  }
];

const DEFAULT_WHATSAPP_TEMPLATES = [
  {
    id: 'temp-1',
    title: '👋 Cold Outreach Intro',
    text: 'Hey {{name}}! This is Rishi from charming-oppenheimer. I was checking out {{company}} and noticed you guys might be looking to scale your pipeline. Would love to grab 10 mins if you have availability this week!'
  },
  {
    id: 'temp-2',
    title: '📞 Post-Call Follow-up',
    text: 'Hey {{name}}, great chatting with you just now! As promised, here is our agency deck. Let me know if next steps look good!'
  },
  {
    id: 'temp-3',
    title: '⏳ Quick Touchbase',
    text: 'Hey {{name}}, just bumping this in case you missed my earlier text. Let me know if {{company}} is still looking to solve this workflow bottleneck!'
  }
];

export default function App() {
  // Auth State — check localStorage (remember me) or sessionStorage (session only)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('crm_logged_in') === 'true' ||
           sessionStorage.getItem('crm_logged_in') === 'true';
  });
  const [loggedInUser, setLoggedInUser] = useState(() => {
    return localStorage.getItem('crm_logged_in_user') ||
           sessionStorage.getItem('crm_logged_in_user') || '';
  });

  const handleLogin = (username, rememberMe) => {
    setIsLoggedIn(true);
    setLoggedInUser(username);
    if (rememberMe) {
      localStorage.setItem('crm_logged_in', 'true');
      localStorage.setItem('crm_logged_in_user', username);
    } else {
      sessionStorage.setItem('crm_logged_in', 'true');
      sessionStorage.setItem('crm_logged_in_user', username);
    }

    // Hydrate user-scoped preferences
    const userCurrency = localStorage.getItem(`crm_currency_${username}`) || localStorage.getItem('crm_currency') || 'USD';
    const userTheme = localStorage.getItem(`crm_theme_${username}`) || localStorage.getItem('crm_theme') || 'dark';
    const userSyncMode = localStorage.getItem(`crm_sync_mode_${username}`) || localStorage.getItem('crm_sync_mode') || 'auto';
    const userRevision = parseInt(localStorage.getItem(`crm_settings_revision_${username}`) || localStorage.getItem('crm_settings_revision') || '0', 10) || 0;

    setCurrency(userCurrency);
    setTheme(userTheme);
    document.documentElement.setAttribute('data-theme', userTheme);
    setSyncMode(userSyncMode);
    setSettingsRevision(userRevision);

    // Check if there was a pending sheet URL shared via QR/Link
    const pendingUrl = localStorage.getItem('crm_pending_sheet_url');
    let savedUrl = '';
    if (pendingUrl) {
      savedUrl = pendingUrl;
      localStorage.removeItem('crm_pending_sheet_url');
      // Save it permanently for this user
      localStorage.setItem(`crm_sheet_url_${username}`, pendingUrl);
      localStorage.setItem('crm_sheet_url', pendingUrl);
    } else {
      // Restore this user's sheet URL
      savedUrl = localStorage.getItem(`crm_sheet_url_${username}`) || '';
    }
    setSheetUrl(savedUrl);
    if (savedUrl) syncDataFromSheet(savedUrl);
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_logged_in');
    localStorage.removeItem('crm_logged_in_user');
    sessionStorage.removeItem('crm_logged_in');
    sessionStorage.removeItem('crm_logged_in_user');
    setIsLoggedIn(false);
    setLoggedInUser('');

    // Reset settings states to defaults
    setCurrency('USD');
    setTheme('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    setSyncMode('auto');
    setSettingsRevision(0);
    setSheetUrl('');

    // Reset leads and CRM tables to default mocks or empty arrays to avoid data leak
    setLeads(MOCK_LEADS);
    setNotes(MOCK_NOTES);
    setPipelines(DEFAULT_PIPELINES);
    setWhatsappTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    setSprints([]);
    setCallingLists([]);
    setActiveSprintId(null);
    localStorage.removeItem('crm_active_sprint_id');
  };

  // Navigation & Views State
  const [activeTab, setActiveTab] = useState('funnel');
  const [activeSprintId, setActiveSprintId] = useState(() => {
    return localStorage.getItem('crm_active_sprint_id') || null;
  });

  const saveActiveSprintIdToStorage = (id) => {
    setActiveSprintId(id);
    if (id) {
      localStorage.setItem('crm_active_sprint_id', id);
    } else {
      localStorage.removeItem('crm_active_sprint_id');
    }
  };
  
  // Settings & Sync State — sheet URL bootstrapped from user-scoped key
  const [sheetUrl, setSheetUrl] = useState(() => {
    const user = localStorage.getItem('crm_logged_in_user') ||
                 sessionStorage.getItem('crm_logged_in_user') || '';
    return user
      ? (localStorage.getItem(`crm_sheet_url_${user}`) || '')
      : (localStorage.getItem('crm_sheet_url') || '');
  });
  const [syncStatus, setSyncStatus] = useState(sheetUrl ? 'syncing' : 'offline'); // 'syncing', 'synced', 'offline', 'error', 'pending'
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('crm_last_sync') || '');
  const [syncMode, setSyncMode] = useState(() => {
    const user = localStorage.getItem('crm_logged_in_user') ||
                 sessionStorage.getItem('crm_logged_in_user') || '';
    return user
      ? (localStorage.getItem(`crm_sync_mode_${user}`) || localStorage.getItem('crm_sync_mode') || 'auto')
      : (localStorage.getItem('crm_sync_mode') || 'auto');
  });
  const [syncQueue, setSyncQueue] = useState(() => {
    const saved = localStorage.getItem('crm_sync_queue');
    return saved ? JSON.parse(saved) : [];
  });
  const [settingsRevision, setSettingsRevision] = useState(() => {
    const user = localStorage.getItem('crm_logged_in_user') ||
                 sessionStorage.getItem('crm_logged_in_user') || '';
    const key = user ? `crm_settings_revision_${user}` : 'crm_settings_revision';
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
  });

  const [isSyncExpanded, setIsSyncExpanded] = useState(false);

  const hasPendingSync = syncQueue.length > 0;
  const syncIndicatorState = syncStatus === 'syncing'
    ? 'syncing'
    : hasPendingSync
      ? 'pending'
      : syncStatus === 'error'
        ? 'error'
        : syncStatus === 'offline' || !sheetUrl
          ? 'offline'
          : 'synced';

  const syncIndicatorConfig = {
    syncing: {
      className: 'syncing',
      label: 'Syncing...',
      title: 'Syncing data with Google Sheets...',
      icon: <div className="loader-spinner" style={{ width: '12px', height: '12px' }}></div>,
      onClick: undefined
    },
    pending: {
      className: 'pending',
      label: `${syncQueue.length} pending sync`,
      title: 'Click to push pending edits now',
      icon: <WifiOff size={14} />,
      onClick: () => flushSyncQueue()
    },
    synced: {
      className: 'synced',
      label: `Synced ${lastSyncTime || 'just now'}`,
      title: 'Synced. Click to refresh from sheet.',
      icon: <Wifi size={14} />,
      onClick: () => syncDataFromSheet()
    },
    offline: {
      className: 'offline',
      label: 'Offline (Local)',
      title: 'Offline mode. Click to set up Google Sheets.',
      icon: <WifiOff size={14} />,
      onClick: () => setIsSetupWizardOpen(true)
    },
    error: {
      className: 'error',
      label: 'Sync Error',
      title: 'Sync error. Click to retry.',
      icon: <WifiOff size={14} />,
      onClick: () => flushSyncQueue()
    }
  };

  const activeSyncIndicator = syncIndicatorConfig[syncIndicatorState];

  useEffect(() => {
    const shouldExpand = ['syncing', 'pending', 'error'].includes(syncIndicatorState);
    setIsSyncExpanded(shouldExpand);
  }, [syncIndicatorState]);

  // Core Data States
  const [pipelines, setPipelines] = useState(() => {
    const saved = localStorage.getItem('crm_pipelines');
    return saved ? JSON.parse(saved) : DEFAULT_PIPELINES;
  });
  
  const [activePipelineId, setActivePipelineId] = useState(() => {
    return localStorage.getItem('crm_active_pipeline_id') || 'agency_pipeline';
  });

  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem('crm_leads');
    return saved ? JSON.parse(saved) : MOCK_LEADS;
  });

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('crm_notes');
    return saved ? JSON.parse(saved) : MOCK_NOTES;
  });

  const [whatsappTemplates, setWhatsappTemplates] = useState(() => {
    const saved = localStorage.getItem('crm_wa_templates');
    return saved ? JSON.parse(saved) : DEFAULT_WHATSAPP_TEMPLATES;
  });

  const [sprints, setSprints] = useState(() => {
    const saved = localStorage.getItem('crm_sprints');
    return saved ? JSON.parse(saved) : [];
  });

  const [callingLists, setCallingLists] = useState(() => {
    const saved = localStorage.getItem('crm_calling_lists');
    return saved ? JSON.parse(saved) : [];
  });

  // Theme, Currency & Onboarding Wizard State
  const [theme, setTheme] = useState(() => {
    const user = localStorage.getItem('crm_logged_in_user') ||
                 sessionStorage.getItem('crm_logged_in_user') || '';
    return user
      ? (localStorage.getItem(`crm_theme_${user}`) || localStorage.getItem('crm_theme') || 'dark')
      : (localStorage.getItem('crm_theme') || 'dark');
  });
  const [currency, setCurrency] = useState(() => {
    const user = localStorage.getItem('crm_logged_in_user') ||
                 sessionStorage.getItem('crm_logged_in_user') || '';
    return user
      ? (localStorage.getItem(`crm_currency_${user}`) || localStorage.getItem('crm_currency') || 'USD')
      : (localStorage.getItem('crm_currency') || 'USD');
  });
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [logoAnimating, setLogoAnimating] = useState(false);

  // Modal / Capture Dialogs
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  const upsertLeadLocally = (lead) => {
    setLeads(prev => {
      const idx = prev.findIndex(l => String(l.id) === String(lead.id));
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = lead;
        return copy;
      }
      return [lead, ...prev];
    });
  };

  const applySettingsPayload = (settings) => {
    if (!settings) return;

    if (settings.currency) {
      setCurrency(settings.currency);
    }
    if (settings.syncMode) {
      setSyncMode(settings.syncMode);
    }
    if (Array.isArray(settings.whatsappTemplates)) {
      setWhatsappTemplates(settings.whatsappTemplates);
    }
    if (settings.theme) {
      setTheme(settings.theme);
    }
    setSettingsRevision(Number(settings.revision) || 0);
  };

  // Persistence to localstorage
  useEffect(() => {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('crm_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('crm_pipelines', JSON.stringify(pipelines));
  }, [pipelines]);

  useEffect(() => {
    localStorage.setItem('crm_wa_templates', JSON.stringify(whatsappTemplates));
  }, [whatsappTemplates]);

  useEffect(() => {
    localStorage.setItem('crm_sprints', JSON.stringify(sprints));
  }, [sprints]);

  useEffect(() => {
    localStorage.setItem('crm_calling_lists', JSON.stringify(callingLists));
  }, [callingLists]);

  useEffect(() => {
    localStorage.setItem('crm_active_pipeline_id', activePipelineId);
  }, [activePipelineId]);

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (loggedInUser) {
      localStorage.setItem(`crm_theme_${loggedInUser}`, theme);
    }
    localStorage.setItem('crm_theme', theme);
  }, [theme, loggedInUser]);

  // Sync currency preference
  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem(`crm_currency_${loggedInUser}`, currency);
    }
    localStorage.setItem('crm_currency', currency);
  }, [currency, loggedInUser]);

  // Sync mode and queue persistence
  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem(`crm_sync_mode_${loggedInUser}`, syncMode);
    }
    localStorage.setItem('crm_sync_mode', syncMode);
  }, [syncMode, loggedInUser]);

  useEffect(() => {
    localStorage.setItem('crm_sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue]);

  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem(`crm_settings_revision_${loggedInUser}`, String(settingsRevision));
    }
    localStorage.setItem('crm_settings_revision', String(settingsRevision));
  }, [settingsRevision, loggedInUser]);

  // Listen for browser online event to auto-flush in Auto Mode
  useEffect(() => {
    const handleOnline = () => {
      if (syncMode === 'auto' && syncQueue.length > 0 && sheetUrl && syncStatus !== 'syncing') {
        flushSyncQueue();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncMode, syncQueue, sheetUrl, syncStatus]);

  // Periodic retry check every 30 seconds if queue has items and mode is auto
  useEffect(() => {
    if (syncMode !== 'auto' || syncQueue.length === 0 || !sheetUrl || syncStatus === 'syncing') {
      return;
    }
    const timer = setInterval(() => {
      flushSyncQueue();
    }, 30000);
    return () => clearInterval(timer);
  }, [syncMode, syncQueue, sheetUrl, syncStatus]);

  // Parse shared sheet URL from deep link / QR code on mount
  // Parse shared sheet URL from deep link / QR code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('sheetUrl') || params.get('sheet');
    const queryCurrency = params.get('currency');
    const queryTheme = params.get('theme');
    const expiresAt = params.get('expiresAt');

    if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
      alert("⚠️ This sync QR code or link has expired for security. Please scan a fresh QR code from your desktop Settings.");
      // Clean query params from URL bar so it doesn't stay cluttered
      if (queryUrl || queryCurrency || queryTheme || expiresAt) {
        try {
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    if (queryCurrency) {
      setCurrency(queryCurrency);
      localStorage.setItem('crm_currency', queryCurrency);
    }
    if (queryTheme) {
      setTheme(queryTheme);
      localStorage.setItem('crm_theme', queryTheme);
      document.documentElement.setAttribute('data-theme', queryTheme);
    }

    if (queryUrl) {
      localStorage.setItem('crm_pending_sheet_url', queryUrl);
      if (isLoggedIn && loggedInUser) {
        setSheetUrl(queryUrl);
        localStorage.setItem(`crm_sheet_url_${loggedInUser}`, queryUrl);
        localStorage.setItem('crm_sheet_url', queryUrl);
        localStorage.removeItem('crm_pending_sheet_url');
        syncDataFromSheet(queryUrl);
      }
    }

    // Clean query params from URL bar so it doesn't stay cluttered
    if (queryUrl || queryCurrency || queryTheme || expiresAt) {
      try {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      } catch (e) {
        console.error(e);
      }
    }
  }, [isLoggedIn, loggedInUser]);

  // Auto-launch Setup Wizard if Sheet is not connected and it is first run
  useEffect(() => {
    const hasSeenWizard = localStorage.getItem('crm_has_seen_wizard');
    if (!sheetUrl && !hasSeenWizard) {
      setIsSetupWizardOpen(true);
      localStorage.setItem('crm_has_seen_wizard', 'true');
    }
  }, [sheetUrl]);

  // Initial Sync on load if Sheet URL exists
  useEffect(() => {
    if (sheetUrl) {
      if (syncQueue.length > 0 && syncMode === 'auto') {
        flushSyncQueue(syncQueue);
      } else if (syncQueue.length === 0) {
        syncDataFromSheet(sheetUrl);
      }
    }
  }, []);

  // Fetch all data from Google Sheet
  async function syncDataFromSheet(targetUrl = sheetUrl) {
    if (!targetUrl) {
      setSyncStatus('offline');
      return;
    }
    
    setSyncStatus('syncing');
    try {
      const response = await fetch(`${targetUrl}?action=readAll`);
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      
      if (data.success) {
        if (data.leads && data.leads.length > 0) {
          setLeads(data.leads);
        }
        if (data.notes && data.notes.length > 0) {
          setNotes(data.notes);
        }
        if (data.pipelines && data.pipelines.length > 0) {
          setPipelines(data.pipelines);
        }
        // Restore sprint data from sheet
        if (data.sprints) {
          setSprints(data.sprints);
        }
        if (data.callingLists) {
          setCallingLists(data.callingLists);
        }
        if (data.settings) {
          applySettingsPayload(data.settings);
        } else if (targetUrl) {
          // If settings are not yet present in the sheet, initialize them automatically!
          await syncSettings({
            currency,
            syncMode,
            whatsappTemplates,
            theme
          });
        }
        setSyncStatus('synced');
        const timeStr = new Date().toLocaleTimeString();
        setLastSyncTime(timeStr);
        localStorage.setItem('crm_last_sync', timeStr);
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Sheets Sync Error:', err);
      setSyncStatus('error');
    }
  }

  // Sprint sync helpers passed down to SprintView
  const syncSprint = (sprint) => handleSyncPush({ action: 'saveSprint', sprint });
  const deleteSprintFromSheet = (id) => handleSyncPush({ action: 'deleteSprint', id });
  const syncCallingLists = (callingLists) => handleSyncPush({ action: 'saveCallingLists', callingLists });

  const onResumeSprint = (sprintId, contactIdx = null) => {
    const updatedSprints = sprints.map(s => {
      if (String(s.id) === String(sprintId)) {
        const updated = { ...s, status: 'active' };
        if (contactIdx !== null) {
          updated.currentIdx = contactIdx;
        }
        return updated;
      }
      return s;
    });
    setSprints(updatedSprints);
    const sprintToSync = updatedSprints.find(s => String(s.id) === String(sprintId));
    if (sprintToSync) {
      syncSprint(sprintToSync);
    }
    saveActiveSprintIdToStorage(sprintId);
    setActiveTab('sprint');
  };

  // Settings sync helpers
  async function syncSettings(nextSettings) {
    const result = await handleSyncPush({
      action: 'saveSettings',
      settings: {
        ...nextSettings,
        baseRevision: settingsRevision
      }
    });
    if (result?.success && result?.data?.settings) {
      applySettingsPayload(result.data.settings);
    }
  }

  async function updateCurrency(newCurrency) {
    setCurrency(newCurrency);
    await syncSettings({
      currency: newCurrency,
      syncMode,
      whatsappTemplates,
      theme
    });
  }

  async function updateSyncMode(newSyncMode) {
    setSyncMode(newSyncMode);
    await syncSettings({
      currency,
      syncMode: newSyncMode,
      whatsappTemplates,
      theme
    });
  }

  async function updateWhatsappTemplates(newTemplates) {
    setWhatsappTemplates(newTemplates);
    await syncSettings({
      currency,
      syncMode,
      whatsappTemplates: newTemplates,
      theme
    });
  }

  async function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    await syncSettings({
      currency,
      syncMode,
      whatsappTemplates,
      theme: nextTheme
    });
  }

  // Helper to post API payload to Apps Script
  async function postToSheet(payload) {
    if (!sheetUrl) return { success: true, offline: true };
    
    try {
      // First try standard fetch POST with text/plain (simple request to avoid OPTIONS preflight, allowing us to read response CORS redirect)
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        try {
          const data = await response.json();
          if (data && data.success === false) {
            console.warn('Apps Script reported success: false', data.error);
            return {
              success: false,
              conflict: Boolean(data.conflict),
              error: data.error || 'Apps Script save failed.',
              data
            };
          }
          setLastSyncTime(new Date().toLocaleTimeString());
          return {
            success: true,
            data
          };
        } catch (parseErr) {
          console.warn('POST succeeded but could not parse response JSON:', parseErr);
          setLastSyncTime(new Date().toLocaleTimeString());
          return { success: true };
        }
      }
      return {
        success: false,
        error: 'Apps Script returned a non-OK response.'
      };
    } catch (err) {
      console.warn('CORS / fetch POST error, attempting fallback:', err);
      try {
        // Fallback to optimistic no-cors POST (ignores CORS checks, trusts Google server to receive write)
        await fetch(sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify(payload)
        });
        setLastSyncTime(new Date().toLocaleTimeString());
        return {
          success: true,
          opaque: true
        };
      } catch (fallbackErr) {
        console.error('Fallback POST failed completely:', fallbackErr);
        return {
          success: false,
          error: 'Unable to reach the Google Sheets endpoint.'
        };
      }
    }
  }

  const rebaseQueuedPayloads = (queue, responseData) => {
    if (!responseData) return queue;

    return queue.map(item => {
      if (responseData.lead && item.action === 'saveLead' && String(item.lead?.id) === String(responseData.lead.id)) {
        return {
          ...item,
          lead: {
            ...item.lead,
            baseRevision: Number(responseData.lead.revision) || 0
          }
        };
      }

      if (responseData.lead && item.action === 'deleteLead' && String(item.id) === String(responseData.lead.id)) {
        return {
          ...item,
          baseRevision: Number(responseData.lead.revision) || 0
        };
      }

      if (responseData.settings && item.action === 'saveSettings') {
        return {
          ...item,
          settings: {
            ...item.settings,
            baseRevision: Number(responseData.settings.revision) || 0
          }
        };
      }

      return item;
    });
  };

  // Process items in the sync queue sequentially (FIFO)
  async function flushSyncQueue(queueToFlush = syncQueue) {
    if (!sheetUrl || queueToFlush.length === 0) return;

    setSyncStatus('syncing');
    let currentQueue = [...queueToFlush];
    let failed = false;

    for (const item of currentQueue) {
      const result = await postToSheet(item);
      if (result.success) {
        currentQueue = rebaseQueuedPayloads(currentQueue.slice(1), result.data);
        setSyncQueue(currentQueue);
        localStorage.setItem('crm_sync_queue', JSON.stringify(currentQueue));
      } else {
        failed = true;
        if (result.conflict) {
          alert(result.error || 'A newer version exists in Google Sheets. Pulling the latest data now.');
          await syncDataFromSheet();
        }
        break;
      }
    }

    if (failed) {
      setSyncStatus('error');
    } else {
      setSyncStatus('synced');
      // Pull latest spreadsheet records to merge and refresh local state
      await syncDataFromSheet();
    }
  }

  // Route sync tasks dynamically based on Sync Mode
  async function handleSyncPush(payload) {
    if (!sheetUrl) {
      setSyncStatus('offline');
      return { success: false, offline: true };
    }

    if (syncMode === 'manual') {
      setSyncQueue(prev => [...prev, payload]);
      setSyncStatus('pending');
      return { success: true, queued: true };
    }

    // Auto Sync Mode
    if (syncQueue.length > 0) {
      const updatedQueue = [...syncQueue, payload];
      setSyncQueue(updatedQueue);
      flushSyncQueue(updatedQueue);
      return { success: true, queued: true };
    } else {
      setSyncStatus('syncing');
      const result = await postToSheet(payload);
      if (result.success) {
        setSyncStatus('synced');
        return result;
      } else {
        setSyncQueue([payload]);
        setSyncStatus('error');
        if (result.conflict) {
          setSyncQueue([]);
          localStorage.setItem('crm_sync_queue', JSON.stringify([]));
          alert(result.error || 'A newer version exists in Google Sheets. Pulling the latest data now.');
          await syncDataFromSheet();
        }
        return result;
      }
    }
  }

  // API Callbacks for Leads
  const saveLead = async (leadData) => {
    const isNew = !leadData.id;
    const finalLead = {
      ...leadData,
      id: leadData.id || `lead-${Date.now()}`,
      pipelineId: leadData.pipelineId || activePipelineId,
      lastContacted: leadData.lastContacted || '',
      revision: Number(leadData.revision) || 0
    };

    upsertLeadLocally(finalLead);

    if (isNew) {
      addNote({
        leadId: finalLead.id,
        text: 'Lead created in CRM.',
        type: 'system'
      });
    }

    const result = await handleSyncPush({
      action: 'saveLead',
      lead: {
        ...finalLead,
        baseRevision: Number(leadData.revision) || 0
      }
    });

    if (result?.success && result?.data?.lead) {
      upsertLeadLocally(result.data.lead);
    }
  };

  const deleteLead = async (id) => {
    setLeads(prev => prev.filter(l => String(l.id) !== String(id)));
    setNotes(prev => prev.filter(n => String(n.leadId) !== String(id)));
    
    if (String(selectedLeadId) === String(id)) setSelectedLeadId(null);

    await handleSyncPush({
      action: 'deleteLead',
      id: id,
      baseRevision: Number(leads.find(l => String(l.id) === String(id))?.revision) || 0
    });
  };

  // API Callbacks for Notes
  const addNote = async (noteData) => {
    const finalNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    setNotes(prev => [finalNote, ...prev]);

    const relatedLead = leads.find(l => String(l.id) === String(noteData.leadId)) || null;
    if (relatedLead && (noteData.type === 'call' || noteData.type === 'whatsapp')) {
      const updatedLead = { ...relatedLead, lastContacted: finalNote.timestamp };
      upsertLeadLocally(updatedLead);

      const leadSyncResult = await handleSyncPush({
        action: 'saveLead',
        lead: {
          ...updatedLead,
          baseRevision: Number(relatedLead.revision) || 0
        }
      });

      if (leadSyncResult?.success && leadSyncResult?.data?.lead) {
        upsertLeadLocally(leadSyncResult.data.lead);
      }
    }

    await handleSyncPush({
      action: 'saveNote',
      note: finalNote
    });
  };

  const updatePipelines = async (updatedPipelines) => {
    setPipelines(updatedPipelines);
    await handleSyncPush({
      action: 'savePipelines',
      pipelines: updatedPipelines
    });
  };

  // Find active pipeline configuration
  const activePipeline = pipelines.find(p => String(p.id) === String(activePipelineId)) || pipelines[0];

  // Actions list for Command Palette
  const actions = [
    // Navigation
    {
      id: 'nav_funnel',
      name: 'Go to Funnels Board',
      shortcut: ['g', 'f'],
      keywords: 'kanban deal sales columns stages pipeline board campaign',
      section: 'Navigation',
      perform: () => setActiveTab('funnel')
    },
    {
      id: 'nav_sprint',
      name: 'Go to Calling Sprint',
      shortcut: ['g', 'c'],
      keywords: 'call outreach list whatsapp dialing sprint outreach sprint',
      section: 'Navigation',
      perform: () => setActiveTab('sprint')
    },
    {
      id: 'nav_settings',
      name: 'Go to Settings & Preferences',
      shortcut: ['g', 's'],
      keywords: 'currency sheets credentials configuration api templates wa funnels properties preferences',
      section: 'Navigation',
      perform: () => setActiveTab('settings')
    },
    // Campaign Sync
    {
      id: 'sync_pull',
      name: 'Pull Data from Google Sheets',
      shortcut: ['s', 's'],
      keywords: 'fetch download read refresh spreadsheet google sheet pull retrieve merge',
      section: 'Campaign Sync',
      perform: () => {
        if (sheetUrl) {
          syncDataFromSheet();
        } else {
          alert('Please connect a Google Sheet first via Settings or the Setup Wizard.');
        }
      }
    },
    {
      id: 'sync_push',
      name: 'Push Pending Edits to Sheet',
      shortcut: ['s', 'p'],
      keywords: 'write upload queue offline flush sync push changes save',
      section: 'Campaign Sync',
      perform: () => {
        if (sheetUrl) {
          flushSyncQueue();
        } else {
          alert('Please connect a Google Sheet first via Settings or the Setup Wizard.');
        }
      }
    },
    // Preferences (Theme & Currency)
    {
      id: 'pref_theme',
      name: 'Toggle Light/Dark Theme',
      shortcut: ['t', 't'],
      keywords: 'color mode toggle sun moon dark light style theme switch',
      section: 'Preferences',
      perform: () => toggleTheme()
    },
    {
      id: 'pref_curr_usd',
      name: 'Set Account Currency to USD ($)',
      keywords: 'settings currency symbol dollar usd money united states',
      section: 'Preferences',
      perform: () => updateCurrency('USD')
    },
    {
      id: 'pref_curr_inr',
      name: 'Set Account Currency to INR (₹)',
      keywords: 'settings currency symbol rupee inr money india',
      section: 'Preferences',
      perform: () => updateCurrency('INR')
    },
    {
      id: 'pref_curr_eur',
      name: 'Set Account Currency to EUR (€)',
      keywords: 'settings currency symbol euro eur money europe',
      section: 'Preferences',
      perform: () => updateCurrency('EUR')
    },
    {
      id: 'pref_curr_gbp',
      name: 'Set Account Currency to GBP (£)',
      keywords: 'settings currency symbol pound gbp money united kingdom uk',
      section: 'Preferences',
      perform: () => updateCurrency('GBP')
    },
    {
      id: 'pref_curr_aed',
      name: 'Set Account Currency to AED (د.إ)',
      keywords: 'settings currency symbol dirham aed money dubai uae',
      section: 'Preferences',
      perform: () => updateCurrency('AED')
    },
    // Quick Actions
    {
      id: 'act_new_lead',
      name: 'Create New Lead / Client',
      shortcut: ['n', 'l'],
      keywords: 'add capture record scan contacts sales client deals business card ocr scanner',
      section: 'Quick Actions',
      perform: () => setIsNewLeadOpen(true)
    },
    {
      id: 'act_wizard',
      name: 'Launch DIY Onboarding Wizard',
      shortcut: ['s', 'w'],
      keywords: 'guide onboarding sheets spreadsheet connection integration credentials setup help instructions tutorials diy',
      section: 'Quick Actions',
      perform: () => setIsSetupWizardOpen(true)
    }
  ];

  // Gate — show Login if not authenticated
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <KBarProvider actions={actions}>
      <PlutoCommandBar />
      <div className="app-container">
      
      {/* Header element */}
      <header>
        <div 
          className={`logo-container ${logoAnimating ? 'logo-pop-active' : ''}`} 
          onClick={() => {
            setActiveTab('funnel');
            setIsSetupWizardOpen(false);
            setLogoAnimating(true);
            setTimeout(() => setLogoAnimating(false), 600);
          }} 
          style={{ cursor: 'pointer' }} 
          title="Go to Home Dashboard"
        >
          <div className="logo-icon">
            <svg viewBox="0 0 32 32" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
              <defs>
                <radialGradient id="plutoPlanetGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffeedd" />
                  <stop offset="60%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="#7c2d12" />
                </radialGradient>
              </defs>
              {/* Sphere */}
              <circle cx="16" cy="16" r="12" fill="url(#plutoPlanetGrad)" />
              {/* Tombaugh Regio Heart (Pluto's signature heart) on the bottom right */}
              <g transform="translate(13, 12.5) scale(0.35) rotate(-20 12 12)">
                <path 
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                  fill="#ffffff" 
                  opacity="0.9"
                />
              </g>
              {/* Subtle lighting / atmosphere outline */}
              <circle cx="16" cy="16" r="12" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="logo-text">Pluto</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* DIY Setup Guide button */}
          {!sheetUrl && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => setIsSetupWizardOpen(true)}
              title="Launch Google Sheets Setup Onboarding Wizard"
            >
              <HelpCircle size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }} className="mobile-hide">Setup Wizard</span>
            </button>
          )}

          {/* Theme Mode toggle */}
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.45rem', borderRadius: '8px' }}
            onClick={toggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun size={16} style={{ color: 'var(--accent)' }} /> : <Moon size={16} style={{ color: 'var(--primary)' }} />}
          </button>

          {/* Persistent Sync Control */}
          <button
            type="button"
            className={`sync-badge ${activeSyncIndicator.className} ${isSyncExpanded ? 'expanded' : ''}`}
            onClick={activeSyncIndicator.onClick}
            title={activeSyncIndicator.title}
            aria-label={activeSyncIndicator.label}
            disabled={!activeSyncIndicator.onClick}
          >
            {activeSyncIndicator.icon}
            <span>{activeSyncIndicator.label}</span>
          </button>
          {/* Logout button */}
          <button
            className="btn btn-secondary"
            style={{ padding: '0.45rem', borderRadius: '8px' }}
            onClick={handleLogout}
            title={`Logged in as ${loggedInUser}. Click to log out.`}
          >
            <LogOut size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </header>

      {/* Navigation - Sidebar (Desktop) or Tab bar (Mobile) */}
      <nav>
        <button 
          className={`nav-item ${activeTab === 'funnel' ? 'active' : ''}`}
          onClick={() => setActiveTab('funnel')}
        >
          <BarChart3 className="nav-icon" />
          <span className="nav-label">Funnels</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'sprint' ? 'active' : ''}`}
          onClick={() => setActiveTab('sprint')}
        >
          <PhoneCall className="nav-icon" />
          <span className="nav-label">Calling Sprint</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'sprints-log' ? 'active' : ''}`}
          onClick={() => setActiveTab('sprints-log')}
        >
          <History className="nav-icon" />
          <span className="nav-label">Logs</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="nav-icon" />
          <span className="nav-label">Settings</span>
        </button>
      </nav>

      {/* Main content display router */}
      <main>
        {activeTab === 'funnel' && (
          <FunnelView 
            leads={leads}
            activePipeline={activePipeline}
            pipelines={pipelines}
            activePipelineId={activePipelineId}
            setActivePipelineId={setActivePipelineId}
            onSelectLead={(id) => setSelectedLeadId(id)}
            onNewLeadClick={() => setIsNewLeadOpen(true)}
            saveLead={saveLead}
            currency={currency}
          />
        )}

        {activeTab === 'sprint' && (
          <SprintView 
            leads={leads}
            activePipeline={activePipeline}
            pipelines={pipelines}
            whatsappTemplates={whatsappTemplates}
            addNote={addNote}
            saveLead={saveLead}
            onSelectLead={(id) => setSelectedLeadId(id)}
            currency={currency}
            syncSprint={syncSprint}
            deleteSprintFromSheet={deleteSprintFromSheet}
            syncCallingLists={syncCallingLists}
            sprints={sprints}
            setSprints={setSprints}
            callingLists={callingLists}
            setCallingLists={setCallingLists}
            activeSprintId={activeSprintId}
            saveActiveSprintIdToStorage={saveActiveSprintIdToStorage}
          />
        )}

        {activeTab === 'sprints-log' && (
          <SprintsLogView 
            sprints={sprints}
            setSprints={setSprints}
            deleteSprintFromSheet={deleteSprintFromSheet}
            currency={currency}
            activeSprintId={activeSprintId}
            saveActiveSprintIdToStorage={saveActiveSprintIdToStorage}
            onResumeSprint={onResumeSprint}
            onSelectLead={(id) => setSelectedLeadId(id)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            sheetUrl={sheetUrl}
            setSheetUrl={(url) => {
              setSheetUrl(url);
              // Save under per-user key so it persists across devices/sessions
              if (loggedInUser) {
                localStorage.setItem(`crm_sheet_url_${loggedInUser}`, url);
              }
              localStorage.setItem('crm_sheet_url', url);
              if (url) {
                syncDataFromSheet(url);
              } else {
                setSyncStatus('offline');
              }
            }}
            syncStatus={syncStatus}
            onSyncClick={() => {
              if (syncQueue.length > 0) {
                if (confirm(`You have ${syncQueue.length} pending local edits. Pushing them to the sheet first to avoid overwriting changes. Proceed?`)) {
                  flushSyncQueue();
                }
              } else {
                syncDataFromSheet();
              }
            }}
            pipelines={pipelines}
            updatePipelines={updatePipelines}
            whatsappTemplates={whatsappTemplates}
            setWhatsappTemplates={updateWhatsappTemplates}
            lastSyncTime={lastSyncTime}
            currency={currency}
            setCurrency={updateCurrency}
            onOpenWizard={() => setIsSetupWizardOpen(true)}
            syncMode={syncMode}
            setSyncMode={updateSyncMode}
            syncQueue={syncQueue}
            clearSyncQueue={() => {
              if (confirm('Are you sure you want to discard all pending offline edits? This cannot be undone.')) {
                setSyncQueue([]);
                localStorage.setItem('crm_sync_queue', JSON.stringify([]));
                setSyncStatus('synced');
              }
            }}
            flushSyncQueue={flushSyncQueue}
            theme={theme}
          />
        )}
      </main>

      {/* Global Modals */}
      
      {/* Lead details timeline drawer */}
      {selectedLeadId && (
        <LeadModal 
          lead={leads.find(l => String(l.id) === String(selectedLeadId))}
          leads={leads}
          notes={notes}
          pipelines={pipelines}
          onClose={() => setSelectedLeadId(null)}
          onSave={saveLead}
          onDelete={deleteLead}
          onAddNote={addNote}
          whatsappTemplates={whatsappTemplates}
          currency={currency}
        />
      )}

      {/* New lead editor modal */}
      {isNewLeadOpen && (
        <LeadModal 
          lead={null}
          leads={leads}
          notes={notes}
          pipelines={pipelines}
          activePipelineId={activePipelineId}
          onClose={() => setIsNewLeadOpen(false)}
          onSave={(data) => {
            saveLead(data);
            setIsNewLeadOpen(false);
          }}
          onDelete={deleteLead}
          onAddNote={addNote}
          whatsappTemplates={whatsappTemplates}
          currency={currency}
        />
      )}

      {/* Google Sheets DIY Onboarding Setup Wizard */}
      {isSetupWizardOpen && (
        <SetupWizard 
          sheetUrl={sheetUrl}
          setSheetUrl={(url) => {
            setSheetUrl(url);
            if (loggedInUser) {
              localStorage.setItem(`crm_sheet_url_${loggedInUser}`, url);
            }
            localStorage.setItem('crm_sheet_url', url);
            if (url) {
              syncDataFromSheet(url);
            } else {
              setSyncStatus('offline');
            }
          }}
          syncStatus={syncStatus}
          onClose={() => setIsSetupWizardOpen(false)}
        />
      )}

      </div>
    </KBarProvider>
  );
}
