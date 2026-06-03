import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useWorkspace } from './hooks/useWorkspace';
import { isConfigured } from './firebase';
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
  History,
  Coins,
  Download,
  Upload
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {item.icon && (
                <div className="pluto-kbar-item-icon">
                  {item.icon}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
                <span className="pluto-kbar-item-name">{item.name}</span>
                {item.subtitle && (
                  <span className="pluto-kbar-item-subtitle">{item.subtitle}</span>
                )}
              </div>
            </div>
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

const COSMIC_QUOTES = [
  {
    text: "Always remember: Pluto is 4.67 billion miles away, and we still reached it. Your cold leads aren't that far.",
    tagline: "Start small, reach far!"
  },
  {
    text: "Pluto was demoted to a dwarf planet, but it's still out there closing orbital deals. Keep spinning.",
    tagline: "Start small, reach far!"
  },
  {
    text: "Even at -375°F, Pluto keeps revolving. No cold outreach list is too frozen for a solid pitch.",
    tagline: "Start small, reach far!"
  },
  {
    text: "It took New Horizons 9.5 years to reach Pluto. Sometimes the longest sales cycle leads to the sweetest heart of gold.",
    tagline: "Start small, reach far!"
  },
  {
    text: "Pluto doesn't care that it's small or remote; it still holds a giant heart on its surface.",
    tagline: "Start small, reach far!"
  }
];

export default function App() {
  // ─── Firebase Auth & Firestore workspace ──────────────────────────────────
  const { user, loading: authLoading, signOutUser } = useAuth();
  const workspace = useWorkspace(user);

  // Check if credentials are being resolved or if the workspace is bootstrapping
  const isAppLoading = isConfigured ? (authLoading || (!!user && workspace.wsLoading)) : false;

  // Fallback local auth state
  const [localUser, setLocalUser] = useState(() => {
    return localStorage.getItem('crm_logged_in_user') || sessionStorage.getItem('crm_logged_in_user') || '';
  });

  // Derived auth state (mirrors old isLoggedIn / loggedInUser shape)
  const isLoggedIn = isConfigured ? (!!user && !workspace.wsLoading) : !!localUser;
  const loggedInUser = isConfigured ? (user?.displayName || user?.email || '') : localUser;

  // Cosmic Disco Easter Egg States
  const [isCosmicActive, setIsCosmicActive] = useState(false);
  const [cosmicQuote, setCosmicQuote] = useState({ text: '', tagline: '' });
  const [cosmicClicks, setCosmicClicks] = useState([]);
  const [stars, setStars] = useState([]);

  // Generate random stars on mount so they remain stable
  useEffect(() => {
    const generatedStars = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 3 + 1.5,
      delay: Math.random() * 2
    }));
    setStars(generatedStars);
  }, []);

  // Timer effect to automatically dismiss Cosmic Disco
  useEffect(() => {
    if (!isCosmicActive) return;
    const timer = setTimeout(() => {
      setIsCosmicActive(false);
    }, 9000);
    return () => clearTimeout(timer);
  }, [isCosmicActive]);

  // Click handler for logo click tracking
  const handleLogoClick = () => {
    setActiveTab('funnel');
    setIsSetupWizardOpen(false);
    setLogoAnimating(true);
    setTimeout(() => setLogoAnimating(false), 600);

    const now = Date.now();
    const windowStart = now - 5000; // 5-second window
    setCosmicClicks(prev => {
      const filtered = prev.filter(t => t > windowStart);
      const nextClicks = [...filtered, now];
      if (nextClicks.length >= 8) {
        const randomQuote = COSMIC_QUOTES[Math.floor(Math.random() * COSMIC_QUOTES.length)];
        setCosmicQuote(randomQuote);
        setIsCosmicActive(true);
        return []; // Reset clicks
      }
      return nextClicks;
    });
  };

  // handleLogin is called by Login.jsx after a successful Google sign-in.
  // Firebase Auth's onAuthStateChanged already updates `user`; this just
  // triggers a sheet pull if one is already connected in Firestore.
  const handleLogin = (username, rememberMe, firebaseUser) => {
    if (!isConfigured) {
      setLocalUser(username);
      if (rememberMe) {
        localStorage.setItem('crm_logged_in_user', username);
      } else {
        sessionStorage.setItem('crm_logged_in_user', username);
      }
      // Hydrate local user preferences
      const storedSheet = localStorage.getItem(`crm_sheet_url_${username}`) || localStorage.getItem('crm_sheet_url') || '';
      const storedTheme = localStorage.getItem(`crm_theme_${username}`) || localStorage.getItem('crm_theme') || 'dark';
      const storedCurrency = localStorage.getItem(`crm_currency_${username}`) || localStorage.getItem('crm_currency') || 'USD';
      const storedSyncMode = localStorage.getItem(`crm_sync_mode_${username}`) || localStorage.getItem('crm_sync_mode') || 'auto';
      
      setSheetUrl(storedSheet);
      setTheme(storedTheme);
      document.documentElement.setAttribute('data-theme', storedTheme);
      setCurrency(storedCurrency);
      setSyncMode(storedSyncMode);
      if (storedSheet) syncDataFromSheet(storedSheet);
    }
  };

  const handleLogout = async () => {
    if (isConfigured) {
      await signOutUser();
    } else {
      setLocalUser('');
      localStorage.removeItem('crm_logged_in_user');
      sessionStorage.removeItem('crm_logged_in_user');
    }
    // Reset CRM tables to mock state to avoid data leaking between sessions
    setCurrency('USD');
    setTheme('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    setSyncMode('auto');
    setSettingsRevision(0);
    setLeads(MOCK_LEADS);
    setNotes(MOCK_NOTES);
    setPipelines(DEFAULT_PIPELINES);
    setWhatsappTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    setSprints([]);
    setCallingLists([]);
    setLocalSyncQueue([]);
    setActiveSprintId(null);
    localStorage.removeItem('crm_active_sprint_id');
    localStorage.removeItem('crm_sync_queue');
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
  
  // ─── Settings & Sync State ────────────────────────────────────────────────
  // sheetUrl comes from Firestore (workspace.sheetUrl) via real-time listener.
  // We keep a local state copy so the rest of the app can read it synchronously.
  const [sheetUrl, setSheetUrl] = useState('');
  useEffect(() => {
    if (isConfigured) {
      if (workspace.sheetUrl !== undefined) setSheetUrl(workspace.sheetUrl);
    } else {
      const stored = (loggedInUser && localStorage.getItem(`crm_sheet_url_${loggedInUser}`)) || localStorage.getItem('crm_sheet_url') || '';
      setSheetUrl(stored);
    }
  }, [workspace.sheetUrl, isConfigured, loggedInUser]);

  const [syncStatus, setSyncStatus] = useState('offline');
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [syncMode, setSyncMode] = useState('auto');
  const [localSyncQueue, setLocalSyncQueue] = useState(() => {
    // Firebase mode: syncQueue comes from Firestore — no localStorage needed
    if (isConfigured) return [];
    const saved = localStorage.getItem('crm_sync_queue');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (_) {
      return [];
    }
  });
  const syncQueue = isConfigured ? (workspace.syncQueue || []) : localSyncQueue;
  const syncQueueRef = useRef(syncQueue);
  const isSyncingRef = useRef(false);
  const leadRevisionsRef = useRef({});
  const settingsRevisionRef = useRef(0);
  const lastWriteTimeRef = useRef(0);
  const reconcileAfterPullRef = useRef(false);
  const hydratedSheetUrlRef = useRef('');
  // Debounce ref for activePipelineId Firestore writes (avoids write-per-click on tab switches)
  const activePipelineDebounceRef = useRef(null);
  const [settingsRevision, setSettingsRevision] = useState(0);

  // Hydrate local state from Firestore userSettings once loaded
  useEffect(() => {
    if (isConfigured) {
      if (!workspace.userSettings) return;
      const { theme: t, currency: c, syncMode: sm, activePipelineId: ap, hasSeenWizard: hsw } = workspace.userSettings;
      if (t) { setTheme(t); document.documentElement.setAttribute('data-theme', t); }
      if (c) setCurrency(c);
      if (sm) setSyncMode(sm);
      // Restore last-active pipeline tab from Firestore
      if (ap) setActivePipelineId(ap);
      // hasSeenWizard is read in the wizard effect below — no action needed here
    } else {
      if (loggedInUser) {
        const storedTheme = localStorage.getItem(`crm_theme_${loggedInUser}`) || localStorage.getItem('crm_theme') || 'dark';
        const storedCurrency = localStorage.getItem(`crm_currency_${loggedInUser}`) || localStorage.getItem('crm_currency') || 'USD';
        const storedSyncMode = localStorage.getItem(`crm_sync_mode_${loggedInUser}`) || localStorage.getItem('crm_sync_mode') || 'auto';
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);
        setCurrency(storedCurrency);
        setSyncMode(storedSyncMode);
      }
    }
  }, [workspace.userSettings, isConfigured, loggedInUser]);

  // Hydrate whatsapp templates from workspace settings
  useEffect(() => {
    if (!workspace.wsSettings?.whatsappTemplates) return;
    setWhatsappTemplates(workspace.wsSettings.whatsappTemplates);
  }, [workspace.wsSettings]);

  // Keep refs in sync on mount
  useEffect(() => {
    settingsRevisionRef.current = settingsRevision;
    leads.forEach(l => {
      leadRevisionsRef.current[l.id] = Number(l.revision) || 0;
    });
  }, []);

  useEffect(() => {
    syncQueueRef.current = syncQueue;
  }, [syncQueue]);

  const updateLocalSyncQueue = (newQueue) => {
    syncQueueRef.current = newQueue;
    setLocalSyncQueue(newQueue);
    // Firebase mode: queue is in Firestore — no localStorage write needed
    if (!isConfigured) {
      localStorage.setItem('crm_sync_queue', JSON.stringify(newQueue));
    }
  };

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
      icon: <Wifi size={14} />,
      onClick: undefined
    },
    pending: {
      className: 'pending',
      label: `${syncQueue.length} pending`,
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
    // Only expand for states that need user attention (not syncing — that uses a ring animation)
    const shouldExpand = ['pending', 'error'].includes(syncIndicatorState);
    setIsSyncExpanded(shouldExpand);
  }, [syncIndicatorState]);

  // Core Data States
  const [pipelines, setPipelines] = useState(() => {
    const saved = localStorage.getItem('crm_pipelines');
    return saved ? JSON.parse(saved) : DEFAULT_PIPELINES;
  });
  
  const [activePipelineId, setActivePipelineId] = useState(() => {
    // Firebase mode: will be hydrated from Firestore userSettings
    if (isConfigured) return 'agency_pipeline';
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
    // Firebase mode: will be hydrated from Firestore wsSettings.whatsappTemplates
    if (isConfigured) return DEFAULT_WHATSAPP_TEMPLATES;
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
  // Initial values are 'dark'/'USD'; Firestore hydration fires in useEffect above.
  const [theme, setTheme] = useState('dark');
  const [currency, setCurrency] = useState('USD');
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
    const nextRev = Number(settings.revision) || 0;
    settingsRevisionRef.current = nextRev;
    setSettingsRevision(nextRev);
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
    // Firebase mode: whatsappTemplates are persisted via workspace.saveWsSettings in SettingsView
    if (!isConfigured) {
      localStorage.setItem('crm_wa_templates', JSON.stringify(whatsappTemplates));
    }
  }, [whatsappTemplates]);

  useEffect(() => {
    localStorage.setItem('crm_sprints', JSON.stringify(sprints));
  }, [sprints]);

  useEffect(() => {
    localStorage.setItem('crm_calling_lists', JSON.stringify(callingLists));
  }, [callingLists]);

  useEffect(() => {
    if (isConfigured) {
      // Debounce at 1.5s — avoids a Firestore write on every rapid pipeline tab click
      clearTimeout(activePipelineDebounceRef.current);
      activePipelineDebounceRef.current = setTimeout(() => {
        if (user) workspace.saveUserSettings({ activePipelineId });
      }, 1500);
    } else {
      localStorage.setItem('crm_active_pipeline_id', activePipelineId);
    }
  }, [activePipelineId, user, isConfigured]);

  // Sync theme to DOM + Firestore/localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (isConfigured) {
      if (user && workspace.userSettings?.theme !== theme) {
        workspace.saveUserSettings({ theme });
      }
    } else {
      if (loggedInUser) {
        localStorage.setItem(`crm_theme_${loggedInUser}`, theme);
        localStorage.setItem('crm_theme', theme);
      }
    }
  }, [theme, user, loggedInUser, isConfigured]);

  // Sync currency to Firestore/localStorage
  useEffect(() => {
    if (isConfigured) {
      if (user && workspace.userSettings?.currency !== currency) {
        workspace.saveUserSettings({ currency });
      }
    } else {
      if (loggedInUser) {
        localStorage.setItem(`crm_currency_${loggedInUser}`, currency);
        localStorage.setItem('crm_currency', currency);
      }
    }
  }, [currency, user, loggedInUser, isConfigured]);

  // Sync mode to Firestore/localStorage
  useEffect(() => {
    if (isConfigured) {
      if (user && workspace.userSettings?.syncMode !== syncMode) {
        workspace.saveUserSettings({ syncMode });
      }
    } else {
      if (loggedInUser) {
        localStorage.setItem(`crm_sync_mode_${loggedInUser}`, syncMode);
        localStorage.setItem('crm_sync_mode', syncMode);
      }
    }
  }, [syncMode, user, loggedInUser, isConfigured]);

  useEffect(() => {
    if (!isConfigured) {
      localStorage.setItem('crm_sync_queue', JSON.stringify(localSyncQueue));
    }
  }, [localSyncQueue, isConfigured]);

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

  // Parse deep-link / QR code params on mount
  // New format: ?invite=<workspaceId>__<tokenId>&expiresAt=<ms>
  // Legacy format: ?sheetUrl=...&currency=...&theme=...&expiresAt=... (still accepted)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    const queryUrl = params.get('sheetUrl') || params.get('sheet');
    const queryCurrency = params.get('currency');
    const queryTheme = params.get('theme');
    const expiresAt = params.get('expiresAt');

    const cleanUrlBar = () => {
      try {
        const clean = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({ path: clean }, '', clean);
      } catch (e) { console.error(e); }
    };

    if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
      alert('⚠️ This sync QR code or link has expired. Please scan a fresh QR code from Settings.');
      cleanUrlBar();
      return;
    }

    // New invite token: consumed by useWorkspace after sign-in
    if (inviteToken) {
      localStorage.setItem('crm_pending_invite', inviteToken);
      cleanUrlBar();
      return; // Nothing else to do until user signs in
    }

    // Legacy QR: theme/currency preferences
    if (queryCurrency) setCurrency(queryCurrency);
    if (queryTheme) {
      setTheme(queryTheme);
      document.documentElement.setAttribute('data-theme', queryTheme);
    }
    if (queryUrl && user) {
      workspace.saveSheetUrl(queryUrl);
    } else if (queryUrl) {
      localStorage.setItem('crm_pending_sheet_url', queryUrl);
    }
    if (queryUrl || queryCurrency || queryTheme || expiresAt) cleanUrlBar();
  }, [user]);

  // After sign-in: consume any pending invite immediately (before wsLoading clears)
  // IMPORTANT: Do NOT gate this on workspace.wsLoading — the bootstrap hook
  // intentionally keeps wsLoading=true while waiting for invite consumption.
  // Gating here would cause a deadlock.
  useEffect(() => {
    if (!user) return;
    const pendingInvite = localStorage.getItem('crm_pending_invite');
    if (pendingInvite) {
      localStorage.removeItem('crm_pending_invite');
      workspace.acceptInviteToken(pendingInvite).then((ok) => {
        if (!ok) alert('This invite link has expired or already been used. Ask the workspace owner for a new one.');
      });
    }
  }, [user?.uid]);

  // After workspace loads: consume any pending sheet URL
  useEffect(() => {
    if (!user || workspace.wsLoading) return;
    const pendingUrl = localStorage.getItem('crm_pending_sheet_url');
    if (pendingUrl) {
      localStorage.removeItem('crm_pending_sheet_url');
      workspace.saveSheetUrl(pendingUrl);
    }
  }, [user?.uid, workspace.wsLoading]);


  // Auto-launch Setup Wizard if Sheet is not connected and it is first run (owner only)
  useEffect(() => {
    if (!isLoggedIn) return; // Don't prompt until auth resolves
    if (isConfigured) {
      // Firebase mode: wait for userSettings to load, then read hasSeenWizard from Firestore (owner only)
      if (!workspace.userSettings) return;
      if (!sheetUrl && workspace.isOwner && !workspace.userSettings.hasSeenWizard) {
        setIsSetupWizardOpen(true);
        workspace.saveUserSettings({ hasSeenWizard: true });
      }
    } else {
      // Sandbox mode: use localStorage flag
      const hasSeenWizard = localStorage.getItem('crm_has_seen_wizard');
      if (!sheetUrl && !hasSeenWizard) {
        setIsSetupWizardOpen(true);
        localStorage.setItem('crm_has_seen_wizard', 'true');
      }
    }
  }, [sheetUrl, isLoggedIn, workspace.userSettings, workspace.isOwner, isConfigured]);

  // Initial Sync on load if Sheet URL exists
  // FIX 2: Always pull fresh revisions first before flushing a stale queue.
  // Flushing with old baseRevisions (from a previous session) causes immediate
  // conflict errors because the sheet has already moved forward.
  useEffect(() => {
    if (isConfigured && !workspace.userSettings) {
      return;
    }

    if (!sheetUrl) {
      hydratedSheetUrlRef.current = '';
      setSyncStatus('offline');
      return;
    }

    if (hydratedSheetUrlRef.current === sheetUrl) {
      return;
    }

    hydratedSheetUrlRef.current = sheetUrl;
    let cancelled = false;

    (async () => {
      await syncDataFromSheet(sheetUrl, { allowQueuedPull: true });
      if (cancelled) return;
      if (syncMode === 'auto' && syncQueueRef.current.length > 0) {
        flushSyncQueue();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sheetUrl, isConfigured, workspace.userSettings, syncMode]);

  // Fetch all data from Google Sheet
  async function syncDataFromSheet(targetUrl = sheetUrl, options = {}) {
    const { allowQueuedPull = false } = options;
    if (!targetUrl) {
      setSyncStatus('offline');
      return;
    }
    
    const fetchStartedAt = Date.now();
    setSyncStatus('syncing');
    try {
      const response = await fetch(`${targetUrl}?action=readAll`);
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      
      if (data.success) {
        // If a write is in progress, or queue has pending edits, or a write occurred while fetching, ignore this stale data to avoid overwriting local edits
        const hasBlockingQueue = syncQueueRef.current.length > 0 && !allowQueuedPull && !reconcileAfterPullRef.current;
        if (isSyncingRef.current || hasBlockingQueue || lastWriteTimeRef.current > fetchStartedAt) {
          console.warn('Ignoring stale sheet pull to protect local edits');
          setSyncStatus('synced');
          return;
        }

        if ('leads' in data) {
          const nextLeads = Array.isArray(data.leads) ? data.leads : [];
          setLeads(nextLeads);
          leadRevisionsRef.current = {};
          nextLeads.forEach(l => {
            leadRevisionsRef.current[l.id] = Number(l.revision) || 0;
          });
        }
        if ('notes' in data) {
          setNotes(Array.isArray(data.notes) ? data.notes : []);
        }
        if ('pipelines' in data) {
          setPipelines(Array.isArray(data.pipelines) ? data.pipelines : []);
        }
        // Restore sprint data from sheet
        if ('sprints' in data) {
          setSprints(Array.isArray(data.sprints) ? data.sprints : []);
        }
        if ('callingLists' in data) {
          setCallingLists(Array.isArray(data.callingLists) ? data.callingLists : []);
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
        if (reconcileAfterPullRef.current) {
          reconcileAfterPullRef.current = false;
          if (isConfigured) {
            syncQueueRef.current = [];
            await workspace.clearSyncQueue();
          } else {
            updateLocalSyncQueue([]);
          }
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

  // Reads the current revision from ref, queues the payload with that revision as baseRevision,
  // then immediately increments the ref so all subsequent rapid actions see the updated value.
  // This is the standard ref-first optimistic locking pattern for offline-first apps.
  const queueWithRevision = (buildPayload, refKey, idOrNull = null) => {
    let currentRev;
    if (refKey === 'settings') {
      currentRev = settingsRevisionRef.current;
      settingsRevisionRef.current = currentRev + 1;
      // Persist the new rev immediately so a page reload picks it up
      setSettingsRevision(currentRev + 1);
      if (loggedInUser) {
        localStorage.setItem(`crm_settings_revision_${loggedInUser}`, String(currentRev + 1));
      }
      localStorage.setItem('crm_settings_revision', String(currentRev + 1));
    } else {
      // Lead revision keyed by lead id
      const id = idOrNull;
      currentRev = leadRevisionsRef.current[id] !== undefined ? leadRevisionsRef.current[id] : 0;
      leadRevisionsRef.current[id] = currentRev + 1;
    }
    return buildPayload(currentRev);
  };

  // Settings sync helpers
  async function syncSettings(nextSettings) {
    // Use ref-first pattern: read current ref, increment immediately, queue with old value as baseRevision
    const payload = queueWithRevision(
      (currentRev) => ({
        action: 'saveSettings',
        settings: {
          ...nextSettings,
          baseRevision: currentRev
        }
      }),
      'settings'
    );
    await handleSyncPush(payload);
  }

  const buildQueueKey = (payload) => {
    switch (payload.action) {
      case 'saveLead':
      case 'deleteLead':
        return `lead:${payload.lead?.id || payload.id}`;
      case 'saveSettings':
        return 'settings';
      case 'saveSprint':
      case 'deleteSprint':
        return `sprint:${payload.sprint?.id || payload.id}`;
      case 'saveCallingLists':
        return 'callingLists';
      case 'savePipelines':
        return 'pipelines';
      case 'saveNote':
        return `note:${payload.note?.id}`;
      default:
        return `${payload.action}:${payload.id || payload.lead?.id || payload.note?.id || Date.now()}`;
    }
  };

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
        // FIX 3: no-cors fallback — we cannot read the response body at all.
        // The write MAY have succeeded or failed silently on the server.
        // Mark as unverified so the caller does NOT remove the item from queue
        // or increment revisions. Schedule a re-pull in 2s to reconcile.
        await fetch(sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify(payload)
        });
        // Schedule a reconciliation pull after a short delay
        reconcileAfterPullRef.current = true;
        setTimeout(() => {
          if (!isSyncingRef.current) {
            syncDataFromSheet(undefined, { allowQueuedPull: true });
          }
        }, 2500);
        return {
          success: true,
          opaque: true,
          unverified: true
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

  // Process items in the sync queue sequentially (FIFO).
  // Revisions are already baked into each queued payload at action time (ref-first),
  // so we never need to rebase — just slice and shift on success.
  async function flushSyncQueue() {
    if (!sheetUrl) return;
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    let failed = false;

    // FIX 1: try/finally guarantees isSyncingRef is always reset — even if
    // an unhandled exception occurs inside the loop. Without this, any crash
    // permanently locks the sync system until the page is refreshed.
    try {
      while (syncQueueRef.current.length > 0) {
        const item = syncQueueRef.current[0];
        const result = await postToSheet(item);

        if (result.success) {
          // FIX 3 (continued): If the write was opaque (no-cors fallback), we
          // cannot confirm it landed. Pause the queue — the scheduled re-pull
          // will reconcile the server state and update revisions.
          if (result.unverified) {
            console.warn('Opaque write: pausing queue until re-pull confirms server state.');
            break;
          }

          lastWriteTimeRef.current = Date.now();

          // FIX 5: For settings writes, confirm the revision from the server
          // response instead of relying on the optimistically incremented ref.
          // This prevents the client and server revisions from drifting apart
          // when a no-cors write silently fails.
          if (item.action === 'saveSettings' && result.data?.settings?.revision !== undefined) {
            const confirmedRev = Number(result.data.settings.revision);
            settingsRevisionRef.current = confirmedRev;
            setSettingsRevision(confirmedRev);
            if (loggedInUser) {
              localStorage.setItem(`crm_settings_revision_${loggedInUser}`, String(confirmedRev));
            }
            localStorage.setItem('crm_settings_revision', String(confirmedRev));
          }

          // Revisions were already incremented in the ref when the action was queued.
          // Just remove the item we just successfully sent.
            if (isConfigured) {
              syncQueueRef.current = syncQueueRef.current.slice(1);
              await workspace.removeFromSyncQueue(item._fsId);
            } else {
              updateLocalSyncQueue(syncQueueRef.current.slice(1));
            }
        } else {
          failed = true;
          if (result.conflict) {
            // On conflict, clear the whole queue and re-pull the authoritative server state.
            // The user's local ref revisions will be refreshed from the server data.
            if (isConfigured) {
              syncQueueRef.current = [];
              await workspace.clearSyncQueue();
            } else {
              updateLocalSyncQueue([]);
            }
            alert(result.error || 'A conflict was detected. Pulling the latest data from Google Sheets.');
            await syncDataFromSheet(undefined, { allowQueuedPull: true });
            return;
          }
          break;
        }
      }
    } finally {
      // FIX 1: Always runs — lock is released even if loop threw an exception.
      isSyncingRef.current = false;
    }

    if (failed) {
      setSyncStatus('error');
    } else {
      setSyncStatus('synced');
    }
  }

  // Route sync tasks dynamically based on Sync Mode
  async function handleSyncPush(payload) {
    if (!sheetUrl) {
      setSyncStatus('offline');
      return { success: false, offline: true };
    }

    // FIX 4: Deduplicate the queue — replace any existing pending write for the
    // same entity (same lead id, or settings). Without this, editing a lead 5×
    // queues 5 entries each with a different baseRevision, guaranteeing 4
    // consecutive conflicts when flushed. Only the latest payload matters.
    const nextPayload = {
      ...payload,
      queueKey: payload.queueKey || buildQueueKey(payload)
    };
    const deduped = syncQueueRef.current.filter(p => {
      if (nextPayload.action === 'saveLead' && p.action === 'saveLead') {
        return p.lead?.id !== nextPayload.lead?.id;
      }
      if (nextPayload.action === 'deleteLead' && p.action === 'saveLead') {
        return p.lead?.id !== nextPayload.id;
      }
      if (nextPayload.action === 'saveLead' && p.action === 'deleteLead') {
        return p.id !== nextPayload.lead?.id;
      }
      if (nextPayload.action === 'saveSettings' && p.action === 'saveSettings') {
        return false; // Always replace settings — only the latest snapshot matters
      }
      if (p.queueKey && nextPayload.queueKey) {
        return p.queueKey !== nextPayload.queueKey;
      }
      return true;
    });
    const nextQueue = [...deduped, nextPayload];

    if (syncMode === 'manual') {
      if (isConfigured) {
        syncQueueRef.current = nextQueue;
        await workspace.addToSyncQueue(nextPayload);
      } else {
        updateLocalSyncQueue(nextQueue);
      }
      setSyncStatus('pending');
      return { success: true, queued: true };
    }

    // Auto Sync Mode: Queue and flush
    if (isConfigured) {
      syncQueueRef.current = nextQueue;
      await workspace.addToSyncQueue(nextPayload);
    } else {
      updateLocalSyncQueue(nextQueue);
    }
    
    // Trigger sequential flush (will skip if already flushing)
    flushSyncQueue();

    return { success: true, queued: true };
  }

  // API Callbacks for Leads
  const saveLead = async (leadData) => {
    const isNew = !leadData.id;
    const finalId = leadData.id || `lead-${Date.now()}`;

    // Seed the ref if this lead has never been seen before
    if (leadRevisionsRef.current[finalId] === undefined) {
      leadRevisionsRef.current[finalId] = Number(leadData.revision) || 0;
    }

    // Build and queue the payload using the ref-first pattern:
    // reads current revision, increments the ref immediately, returns the payload.
    const payload = queueWithRevision(
      (currentRev) => ({
        action: 'saveLead',
        lead: {
          ...leadData,
          id: finalId,
          pipelineId: leadData.pipelineId || activePipelineId,
          lastContacted: leadData.lastContacted || '',
          revision: currentRev,
          baseRevision: currentRev
        }
      }),
      'lead',
      finalId
    );

    // Optimistically update local state with the new revision already applied
    const optimisticLead = { ...payload.lead, revision: leadRevisionsRef.current[finalId] };
    upsertLeadLocally(optimisticLead);

    if (isNew) {
      addNote({
        leadId: finalId,
        text: 'Lead created in CRM.',
        type: 'system'
      });
    }

    await handleSyncPush(payload);
  };

  const deleteLead = async (id) => {
    setLeads(prev => prev.filter(l => String(l.id) !== String(id)));
    setNotes(prev => prev.filter(n => String(n.leadId) !== String(id)));
    
    if (String(selectedLeadId) === String(id)) setSelectedLeadId(null);

    // Read current revision from ref (already incremented by any prior actions)
    const currentRev = leadRevisionsRef.current[id] !== undefined
      ? leadRevisionsRef.current[id]
      : (Number(leads.find(l => String(l.id) === String(id))?.revision) || 0);

    // Clean up ref — lead is gone
    delete leadRevisionsRef.current[id];

    await handleSyncPush({
      action: 'deleteLead',
      id: id,
      baseRevision: currentRev
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
      // Use saveLead which already applies the ref-first revision pattern
      await saveLead({
        ...relatedLead,
        lastContacted: finalNote.timestamp
      });
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
    // Quick Actions
    {
      id: 'act_new_lead',
      name: 'Create New Lead / Client',
      shortcut: ['n', 'l'],
      keywords: 'add capture record scan contacts sales client deals business card ocr scanner',
      section: 'Quick Actions',
      perform: () => setIsNewLeadOpen(true),
      icon: <UserPlus size={16} />,
      subtitle: 'Open lead form creation wizard'
    },
    // Navigation
    {
      id: 'nav_funnel',
      name: 'Go to Funnels Board',
      shortcut: ['g', 'f'],
      keywords: 'kanban deal sales columns stages pipeline board campaign',
      section: 'Navigation',
      perform: () => setActiveTab('funnel'),
      icon: <BarChart3 size={16} />,
      subtitle: 'View stages, pipelines and deal cards'
    },
    {
      id: 'nav_sprint',
      name: 'Go to Calling Sprint',
      shortcut: ['g', 'c'],
      keywords: 'call outreach list whatsapp dialing sprint outreach sprint',
      section: 'Navigation',
      perform: () => setActiveTab('sprint'),
      icon: <PhoneCall size={16} />,
      subtitle: 'Outreach list dialer and lead details'
    },
    {
      id: 'nav_logs',
      name: 'Go to Sprints Log',
      shortcut: ['g', 'l'],
      keywords: 'sprint logs activity audit database records history timeline',
      section: 'Navigation',
      perform: () => setActiveTab('sprints-log'),
      icon: <History size={16} />,
      subtitle: 'Track sprint history and system event logs'
    },
    {
      id: 'nav_settings',
      name: 'Go to Settings & Preferences',
      shortcut: ['g', 's'],
      keywords: 'currency sheets credentials configuration api templates wa funnels properties preferences',
      section: 'Navigation',
      perform: () => setActiveTab('settings'),
      icon: <Settings size={16} />,
      subtitle: 'Manage currency, sheets sync, and templates'
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
      },
      icon: <Download size={16} />,
      subtitle: 'Fetch the latest rows from Google Sheets'
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
      },
      icon: <Upload size={16} />,
      subtitle: 'Upload pending offline edits to the sheet'
    },
    // Preferences (Theme & Currency)
    {
      id: 'pref_theme',
      name: 'Toggle Light/Dark Theme',
      shortcut: ['t', 't'],
      keywords: 'color mode toggle sun moon dark light style theme switch',
      section: 'Preferences',
      perform: () => toggleTheme(),
      icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
      subtitle: 'Switch between light and dark UI modes'
    },
    {
      id: 'pref_curr_usd',
      name: 'Set Account Currency to USD ($)',
      keywords: 'settings currency symbol dollar usd money united states',
      section: 'Preferences',
      perform: () => updateCurrency('USD'),
      icon: <Coins size={16} />,
      subtitle: 'Change display currency to USD ($)'
    },
    {
      id: 'pref_curr_inr',
      name: 'Set Account Currency to INR (₹)',
      keywords: 'settings currency symbol rupee inr money india',
      section: 'Preferences',
      perform: () => updateCurrency('INR'),
      icon: <Coins size={16} />,
      subtitle: 'Change display currency to INR (₹)'
    },
    {
      id: 'pref_curr_eur',
      name: 'Set Account Currency to EUR (€)',
      keywords: 'settings currency symbol euro eur money europe',
      section: 'Preferences',
      perform: () => updateCurrency('EUR'),
      icon: <Coins size={16} />,
      subtitle: 'Change display currency to EUR (€)'
    },
    {
      id: 'pref_curr_gbp',
      name: 'Set Account Currency to GBP (£)',
      keywords: 'settings currency symbol pound gbp money united kingdom uk',
      section: 'Preferences',
      perform: () => updateCurrency('GBP'),
      icon: <Coins size={16} />,
      subtitle: 'Change display currency to GBP (£)'
    },
    {
      id: 'pref_curr_aed',
      name: 'Set Account Currency to AED (د.إ)',
      keywords: 'settings currency symbol dirham aed money dubai uae',
      section: 'Preferences',
      perform: () => updateCurrency('AED'),
      icon: <Coins size={16} />,
      subtitle: 'Change display currency to AED (د.إ)'
    }
  ];

  // Gate — show loading spinner if authenticating or loading workspace
  if (isAppLoading) {
    return (
      <div className="login-intro-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>
        <div className="login-intro-planet-wrapper">
          <svg viewBox="0 0 32 32" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg" className="login-intro-planet-svg">
            <defs>
              <radialGradient id="introPlutoPlanetGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffeedd" />
                <stop offset="60%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="#7c2d12" />
              </radialGradient>
            </defs>
            <circle cx="16" cy="16" r="12" fill="url(#introPlutoPlanetGrad)" />
            <g transform="translate(13, 12.5) scale(0.35) rotate(-20 12 12)">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="#ffffff"
                opacity="0.9"
              />
            </g>
            <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          </svg>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-body)', fontWeight: 500, letterSpacing: '0.02em', animation: 'heartbeat 2s infinite ease-in-out' }}>
          Connecting to your Pluto workspace...
        </div>
      </div>
    );
  }

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
          onClick={handleLogoClick} 
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
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }} className="mobile-hide">Setup Wizard</span>
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
            {syncIndicatorState === 'syncing' && (
              <svg className="sync-rect-spinner" viewBox="0 0 36 36">
                <rect 
                  x="1" 
                  y="1" 
                  width="34" 
                  height="34" 
                  rx="9" 
                  fill="none" 
                  stroke="var(--primary)" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  pathLength="100" 
                />
              </svg>
            )}
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
              if (loggedInUser) {
                if (isConfigured) {
                  workspace.saveSheetUrl(url);
                } else {
                  localStorage.setItem(`crm_sheet_url_${loggedInUser}`, url);
                  localStorage.setItem('crm_sheet_url', url);
                }
              }
              if (url) {
                syncDataFromSheet(url);
              } else {
                setSyncStatus('offline');
              }
            }}
            workspace={workspace}
            user={user}
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
                if (isConfigured) {
                  syncQueueRef.current = [];
                  workspace.clearSyncQueue();
                } else {
                  updateLocalSyncQueue([]);
                }
                setSyncStatus('synced');
              }
            }}
            flushSyncQueue={flushSyncQueue}
            theme={theme}
            toggleTheme={toggleTheme}
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
              if (isConfigured) {
                workspace.saveSheetUrl(url);
              } else {
                localStorage.setItem(`crm_sheet_url_${loggedInUser}`, url);
                localStorage.setItem('crm_sheet_url', url);
              }
            }
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

      {/* Cosmic Disco Easter Egg Overlay */}
      <div className={`cosmic-overlay ${isCosmicActive ? 'active' : ''}`}>
        <div className="disco-transition-layer"></div>
        <div className="stars-field">
          {stars.map(star => (
            <div
              key={star.id}
              className="star"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`
              }}
            />
          ))}
        </div>
        <div className="cosmic-content">
          <div className="cosmic-heart-icon">
            <svg viewBox="0 0 32 32" width="100" height="100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', filter: 'drop-shadow(0 0 30px rgba(249, 115, 22, 0.45)) drop-shadow(0 0 50px rgba(236, 72, 153, 0.35))' }}>
              <defs>
                <radialGradient id="plutoPlanetGradCosmic" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffeedd" />
                  <stop offset="60%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="#7c2d12" />
                </radialGradient>
              </defs>
              <circle cx="16" cy="16" r="12" fill="url(#plutoPlanetGradCosmic)" />
              <g transform="translate(13, 12.5) scale(0.35) rotate(-20 12 12)">
                <path 
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                  fill="#ffffff" 
                  opacity="0.95"
                />
              </g>
              <circle cx="16" cy="16" r="12" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="cosmic-quote">
            "{cosmicQuote.text}"
            <em>{cosmicQuote.tagline}</em>
          </div>
          <button 
            type="button"
            className="btn-return" 
            onClick={() => setIsCosmicActive(false)}
          >
            Return to Earth
          </button>
        </div>
      </div>

      </div>
    </KBarProvider>
  );
}
