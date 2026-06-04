import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useWorkspace } from './hooks/useWorkspace';
import { isConfigured } from './firebase';
import {
  BarChart3,
  PhoneCall,
  Settings,
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
  Upload,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
} from 'kbar';
import FunnelView from './components/FunnelView';
import SprintView from './components/SprintView';
import SettingsView from './components/SettingsView';
import LeadModal from './components/LeadModal';
import SetupWizard from './components/SetupWizard';
import Login from './components/Login';
import SprintsLogView from './components/SprintsLogView';
import ConflictToast from './components/ConflictToast';

// ─── KBar command palette ─────────────────────────────────────────────────────

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
              {item.icon && <div className="pluto-kbar-item-icon">{item.icon}</div>}
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

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PIPELINES = [
  {
    id: 'agency_pipeline',
    name: 'Agency Sales Pipeline',
    stages: ['Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'],
  },
  {
    id: 'product_pipeline',
    name: 'Product Sales Pipeline',
    stages: ['Inbound', 'Discovery Call', 'Demo Done', 'Contract Sent', 'Closed Won', 'Closed Lost'],
  },
];

const MOCK_LEADS = [
  { id: 'lead-1', name: 'Sarah Connor', company: 'Cyberdyne Systems', phone: '+15550199', email: 'sarah.c@cyberdyne.io', status: 'Proposal Sent', value: 18500, tags: 'Enterprise, AI Security', pipelineId: 'agency_pipeline', lastContacted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'lead-2', name: 'Tony Stark', company: 'Stark Industries', phone: '+15551984', email: 'tony@stark.com', status: 'Meeting Scheduled', value: 75000, tags: 'VIP, Automation', pipelineId: 'agency_pipeline', lastContacted: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'lead-3', name: 'Bruce Wayne', company: 'Wayne Enterprises', phone: '+15550911', email: 'bruce@wayne.co', status: 'Contacted', value: 45000, tags: 'Defense, Retainer', pipelineId: 'agency_pipeline', lastContacted: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { id: 'lead-4', name: 'Elliot Alderson', company: 'Allsafe Cybersecurity', phone: '+15550201', email: 'elliot@allsafe.io', status: 'Lead', value: 9200, tags: 'Cold Outreach', pipelineId: 'agency_pipeline', lastContacted: '' },
  { id: 'lead-5', name: 'Peter Parker', company: 'Daily Bugle', phone: '+15550344', email: 'peter.p@bugle.com', status: 'Won', value: 3500, tags: 'SMB, Photography', pipelineId: 'agency_pipeline', lastContacted: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'lead-6', name: 'John Doe', company: 'SaaS Labs Inc', phone: '+15559876', email: 'john@saaslabs.com', status: 'Discovery Call', value: 12000, tags: 'Product Trial', pipelineId: 'product_pipeline', lastContacted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

const MOCK_NOTES = [
  { id: 'note-1', leadId: 'lead-1', text: 'Sent standard enterprise service level proposal. Sarah requested a minor change in the SLA terms.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: 'manual' },
  { id: 'note-2', leadId: 'lead-2', text: 'Call connected! Tony is interested in automating their customer support pipeline. Scheduled screen sharing demo next Tuesday.', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), type: 'call' },
  { id: 'note-3', leadId: 'lead-3', text: 'Sent introduction template via WhatsApp slug.', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), type: 'whatsapp' },
  { id: 'note-4', leadId: 'lead-5', text: 'Deal won! Contract signed digitally. Onboarding scheduled for Friday.', timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), type: 'system' },
];

const DEFAULT_WHATSAPP_TEMPLATES = [
  { id: 'temp-1', title: '👋 Cold Outreach Intro', text: 'Hey {{name}}! This is from Pluto CRM. I was checking out {{company}} and noticed you guys might be looking to scale your pipeline. Would love to grab 10 mins if you have availability this week!' },
  { id: 'temp-2', title: '📞 Post-Call Follow-up', text: 'Hey {{name}}, great chatting with you just now! As promised, here is our agency deck. Let me know if next steps look good!' },
  { id: 'temp-3', title: '⏳ Quick Touchbase', text: 'Hey {{name}}, just bumping this in case you missed my earlier text. Let me know if {{company}} is still looking to solve this workflow bottleneck!' },
];

const COSMIC_QUOTES = [
  { text: "Always remember: Pluto is 4.67 billion miles away, and we still reached it. Your cold leads aren't that far.", tagline: 'Start small, reach far!' },
  { text: "Pluto was demoted to a dwarf planet, but it's still out there closing orbital deals. Keep spinning.", tagline: 'Start small, reach far!' },
  { text: "Even at -375°F, Pluto keeps revolving. No cold outreach list is too frozen for a solid pitch.", tagline: 'Start small, reach far!' },
  { text: "It took New Horizons 9.5 years to reach Pluto. Sometimes the longest sales cycle leads to the sweetest heart of gold.", tagline: 'Start small, reach far!' },
  { text: "Pluto doesn't care that it's small or remote; it still holds a giant heart on its surface.", tagline: 'Start small, reach far!' },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth & workspace ──────────────────────────────────────────────────────
  const { user, loading: authLoading, signOutUser } = useAuth();
  const workspace = useWorkspace(user);

  const isAppLoading = isConfigured
    ? authLoading || (!!user && workspace.wsLoading)
    : false;

  // Fallback local auth for non-Firebase mode
  const [localUser, setLocalUser] = useState(
    () => localStorage.getItem('crm_logged_in_user') || sessionStorage.getItem('crm_logged_in_user') || ''
  );
  const isLoggedIn   = isConfigured ? (!!user && !workspace.wsLoading) : !!localUser;
  const loggedInUser = isConfigured ? (user?.displayName || user?.email || '') : localUser;

  // ── CRM data ──────────────────────────────────────────────────────────────
  // In Firebase mode → comes from Firestore via workspace real-time listeners.
  // In local mode → comes from localStorage.

  const [localLeads, setLocalLeads] = useState(() => {
    const s = localStorage.getItem('crm_leads');
    return s ? JSON.parse(s) : MOCK_LEADS;
  });
  const [localNotes, setLocalNotes] = useState(() => {
    const s = localStorage.getItem('crm_notes');
    return s ? JSON.parse(s) : MOCK_NOTES;
  });
  const [localPipelines, setLocalPipelines] = useState(() => {
    const s = localStorage.getItem('crm_pipelines');
    return s ? JSON.parse(s) : DEFAULT_PIPELINES;
  });
  const [localSprints, setLocalSprints] = useState(() => {
    const s = localStorage.getItem('crm_sprints');
    return s ? JSON.parse(s) : [];
  });
  const [localCallingLists, setLocalCallingLists] = useState(() => {
    const s = localStorage.getItem('crm_calling_lists');
    return s ? JSON.parse(s) : [];
  });

  // Resolved CRM data (Firebase or local)
  const leads       = isConfigured ? (workspace.leads       || [])               : localLeads;
  const notes       = isConfigured ? (workspace.notes       || [])               : localNotes;
  const pipelines   = isConfigured
    ? (workspace.pipelines?.length > 0 ? workspace.pipelines : DEFAULT_PIPELINES)
    : localPipelines;
  const sprints      = isConfigured ? (workspace.sprints      || []) : localSprints;
  const callingLists = isConfigured ? (workspace.callingLists || []) : localCallingLists;

  // Persist local-mode data to localStorage
  useEffect(() => { if (!isConfigured) localStorage.setItem('crm_leads',        JSON.stringify(localLeads));        }, [localLeads]);
  useEffect(() => { if (!isConfigured) localStorage.setItem('crm_notes',        JSON.stringify(localNotes));        }, [localNotes]);
  useEffect(() => { if (!isConfigured) localStorage.setItem('crm_pipelines',    JSON.stringify(localPipelines));    }, [localPipelines]);
  useEffect(() => { if (!isConfigured) localStorage.setItem('crm_sprints',      JSON.stringify(localSprints));      }, [localSprints]);
  useEffect(() => { if (!isConfigured) localStorage.setItem('crm_calling_lists',JSON.stringify(localCallingLists)); }, [localCallingLists]);

  // ── One-time Sheet → Firestore migration banner ──────────────────────────
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (!isConfigured || !workspace.workspaceId || workspace.wsLoading) return;
    if (workspace.leads?.length > 0) return; // Already have Firestore data
    const hasMigrated = localStorage.getItem(`crm_migrated_${workspace.workspaceId}`);
    if (!hasMigrated && sheetUrl) setShowMigrationBanner(true);
  }, [workspace.workspaceId, workspace.wsLoading, workspace.leads?.length]);

  // ── Settings: sheetUrl ────────────────────────────────────────────────────
  const [sheetUrl, setSheetUrl] = useState('');
  useEffect(() => {
    if (isConfigured) {
      if (workspace.sheetUrl !== undefined) setSheetUrl(workspace.sheetUrl);
    } else {
      const stored = (loggedInUser && localStorage.getItem(`crm_sheet_url_${loggedInUser}`))
        || localStorage.getItem('crm_sheet_url') || '';
      setSheetUrl(stored);
    }
  }, [workspace.sheetUrl, isConfigured, loggedInUser]);

  // ── Settings: theme, currency, syncMode ───────────────────────────────────
  const [theme, setTheme]       = useState('dark');
  const [currency, setCurrency] = useState('USD');
  const [syncMode, setSyncMode] = useState('auto');

  const [whatsappTemplates, setWhatsappTemplates] = useState(() => {
    if (isConfigured) return DEFAULT_WHATSAPP_TEMPLATES;
    const s = localStorage.getItem('crm_wa_templates');
    return s ? JSON.parse(s) : DEFAULT_WHATSAPP_TEMPLATES;
  });

  useEffect(() => {
    if (!workspace.userSettings) return;
    const { theme: t, currency: c, syncMode: sm, activePipelineId: ap, hasSeenWizard: hsw } = workspace.userSettings;
    if (t) { setTheme(t); document.documentElement.setAttribute('data-theme', t); }
    if (c) setCurrency(c);
    if (sm) setSyncMode(sm);
    if (ap) setActivePipelineId(ap);
  }, [workspace.userSettings]);

  useEffect(() => {
    if (workspace.wsSettings?.whatsappTemplates) {
      setWhatsappTemplates(workspace.wsSettings.whatsappTemplates);
    }
  }, [workspace.wsSettings]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (isConfigured && user && workspace.userSettings?.theme !== theme) {
      workspace.saveUserSettings({ theme });
    } else if (!isConfigured && loggedInUser) {
      localStorage.setItem(`crm_theme_${loggedInUser}`, theme);
      localStorage.setItem('crm_theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (isConfigured && user && workspace.userSettings?.currency !== currency) {
      workspace.saveUserSettings({ currency });
    } else if (!isConfigured && loggedInUser) {
      localStorage.setItem(`crm_currency_${loggedInUser}`, currency);
      localStorage.setItem('crm_currency', currency);
    }
  }, [currency]);

  useEffect(() => {
    if (isConfigured && user && workspace.userSettings?.syncMode !== syncMode) {
      workspace.saveUserSettings({ syncMode });
    } else if (!isConfigured && loggedInUser) {
      localStorage.setItem(`crm_sync_mode_${loggedInUser}`, syncMode);
      localStorage.setItem('crm_sync_mode', syncMode);
    }
  }, [syncMode]);

  // ── Pipelines & active pipeline ───────────────────────────────────────────
  const [activePipelineId, setActivePipelineId] = useState(() => {
    if (isConfigured) return 'agency_pipeline';
    return localStorage.getItem('crm_active_pipeline_id') || 'agency_pipeline';
  });
  const activePipelineDebounceRef = useRef(null);
  useEffect(() => {
    if (isConfigured) {
      clearTimeout(activePipelineDebounceRef.current);
      activePipelineDebounceRef.current = setTimeout(() => {
        if (user) workspace.saveUserSettings({ activePipelineId });
      }, 1500);
    } else {
      localStorage.setItem('crm_active_pipeline_id', activePipelineId);
    }
  }, [activePipelineId]);
  const activePipeline = pipelines.find(p => String(p.id) === String(activePipelineId)) || pipelines[0];

  // ── Sync status (simplified: connected / offline / exporting) ────────────
  const [syncStatus, setSyncStatus]   = useState('offline');
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [sheetExportStatus, setSheetExportStatus] = useState('idle'); // idle | exporting | done | error
  const [isSyncExpanded, setIsSyncExpanded] = useState(false);

  // In Firebase mode: network online/offline drives the indicator
  // In local mode: sheet connection drives it
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setNetworkOnline(true);
    const off = () => setNetworkOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const syncIndicatorState = isConfigured
    ? (sheetExportStatus === 'exporting' ? 'syncing'
       : !networkOnline ? 'offline'
       : 'synced')
    : (syncStatus);

  const [localSyncQueue, setLocalSyncQueue] = useState(() => {
    if (isConfigured) return [];
    const s = localStorage.getItem('crm_sync_queue');
    try { return s ? JSON.parse(s) : []; } catch { return []; }
  });
  useEffect(() => {
    if (!isConfigured) localStorage.setItem('crm_sync_queue', JSON.stringify(localSyncQueue));
  }, [localSyncQueue]);
  const syncQueue = isConfigured ? [] : localSyncQueue;
  const hasPendingSync = syncQueue.length > 0;

  const isSyncingRef   = useRef(false);
  const syncQueueRef   = useRef(localSyncQueue);
  const lastWriteTimeRef      = useRef(0);
  const reconcileAfterPullRef = useRef(false);
  const hydratedSheetUrlRef   = useRef('');
  const leadRevisionsRef      = useRef({});
  const settingsRevisionRef   = useRef(0);
  const [settingsRevision, setSettingsRevision] = useState(0);

  useEffect(() => { syncQueueRef.current = localSyncQueue; }, [localSyncQueue]);

  const updateLocalSyncQueue = (q) => {
    syncQueueRef.current = q;
    setLocalSyncQueue(q);
    localStorage.setItem('crm_sync_queue', JSON.stringify(q));
  };

  const effectiveSyncIndicatorState = isConfigured
    ? syncIndicatorState
    : (hasPendingSync ? 'pending' : syncStatus === 'error' ? 'error' : syncStatus);

  const syncIndicatorConfig = {
    syncing:  { className: 'syncing',  label: isConfigured ? 'Exporting...' : 'Syncing...', title: 'Syncing data...', icon: <Wifi size={14} />, onClick: undefined },
    pending:  { className: 'pending',  label: `${syncQueue.length} pending`, title: 'Click to push pending edits', icon: <WifiOff size={14} />, onClick: () => flushSyncQueue() },
    synced:   { className: 'synced',   label: isConfigured ? 'Live ✓' : `Synced ${lastSyncTime || 'just now'}`, title: isConfigured ? 'Connected — edits sync in real time' : 'Synced. Click to refresh.', icon: <Wifi size={14} />, onClick: isConfigured ? undefined : () => syncDataFromSheet() },
    offline:  { className: 'offline',  label: isConfigured ? 'Offline' : 'Offline (Local)', title: isConfigured ? 'No network connection' : 'Click to set up Google Sheets.', icon: <WifiOff size={14} />, onClick: isConfigured ? undefined : () => setIsSetupWizardOpen(true) },
    error:    { className: 'error',    label: 'Sync Error', title: 'Sync error. Click to retry.', icon: <WifiOff size={14} />, onClick: () => flushSyncQueue() },
  };
  const activeSyncIndicator = syncIndicatorConfig[effectiveSyncIndicatorState] || syncIndicatorConfig.offline;

  useEffect(() => {
    setIsSyncExpanded(['pending', 'error'].includes(effectiveSyncIndicatorState));
  }, [effectiveSyncIndicatorState]);

  // ── Invite error banner ───────────────────────────────────────────────────
  const [inviteError, setInviteError] = useState(null);
  const [ejectionBanner, setEjectionBanner] = useState(false);

  useEffect(() => {
    if (workspace.ejected) setEjectionBanner(true);
  }, [workspace.ejected]);

  // ── Conflict toasts ───────────────────────────────────────────────────────
  const [conflicts, setConflicts] = useState([]);
  const dismissConflict = (id) => setConflicts(prev => prev.filter(c => c.id !== id));
  const forceWriteConflict = async (conflict) => {
    dismissConflict(conflict.id);
    const lead = leads.find(l => l.id === conflict.leadId);
    if (!lead) return;
    const updated = { ...lead, [conflict.field]: conflict.clientValue };
    await saveLead(updated);
  };

  // ── Navigation & view state ───────────────────────────────────────────────
  const [activeTab, setActiveTab]     = useState('funnel');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isNewLeadOpen, setIsNewLeadOpen]   = useState(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [logoAnimating, setLogoAnimating]   = useState(false);
  const [isCosmicActive, setIsCosmicActive] = useState(false);
  const [cosmicQuote, setCosmicQuote]       = useState({ text: '', tagline: '' });
  const [cosmicClicks, setCosmicClicks]     = useState([]);
  const [stars, setStars]                   = useState([]);

  const [activeSprintId, setActiveSprintId] = useState(
    () => localStorage.getItem('crm_active_sprint_id') || null
  );
  const saveActiveSprintIdToStorage = (id) => {
    setActiveSprintId(id);
    if (id) localStorage.setItem('crm_active_sprint_id', id);
    else localStorage.removeItem('crm_active_sprint_id');
  };

  useEffect(() => {
    const s = Array.from({ length: 60 }).map((_, i) => ({
      id: i, size: Math.random() * 2 + 1, left: Math.random() * 100,
      top: Math.random() * 100, duration: Math.random() * 3 + 1.5, delay: Math.random() * 2,
    }));
    setStars(s);
  }, []);

  useEffect(() => {
    if (!isCosmicActive) return;
    const t = setTimeout(() => setIsCosmicActive(false), 9000);
    return () => clearTimeout(t);
  }, [isCosmicActive]);

  const handleLogoClick = () => {
    setActiveTab('funnel');
    setIsSetupWizardOpen(false);
    setLogoAnimating(true);
    setTimeout(() => setLogoAnimating(false), 600);
    const now = Date.now();
    setCosmicClicks(prev => {
      const filtered = prev.filter(t => t > now - 5000);
      const next = [...filtered, now];
      if (next.length >= 8) {
        setCosmicQuote(COSMIC_QUOTES[Math.floor(Math.random() * COSMIC_QUOTES.length)]);
        setIsCosmicActive(true);
        return [];
      }
      return next;
    });
  };

  // ── Auth callbacks ────────────────────────────────────────────────────────
  const handleLogin = (username, rememberMe) => {
    if (!isConfigured) {
      setLocalUser(username);
      if (rememberMe) localStorage.setItem('crm_logged_in_user', username);
      else sessionStorage.setItem('crm_logged_in_user', username);
      const storedSheet    = localStorage.getItem(`crm_sheet_url_${username}`) || localStorage.getItem('crm_sheet_url') || '';
      const storedTheme    = localStorage.getItem(`crm_theme_${username}`)    || localStorage.getItem('crm_theme')    || 'dark';
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
    setCurrency('USD');
    setTheme('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    setSyncMode('auto');
    setSettingsRevision(0);
    setLocalLeads(MOCK_LEADS);
    setLocalNotes(MOCK_NOTES);
    setLocalPipelines(DEFAULT_PIPELINES);
    setWhatsappTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    setLocalSprints([]);
    setLocalCallingLists([]);
    setLocalSyncQueue([]);
    setActiveSprintId(null);
    localStorage.removeItem('crm_active_sprint_id');
    localStorage.removeItem('crm_sync_queue');
  };

  // ── Invite / deep-link handling ───────────────────────────────────────────
  useEffect(() => {
    const params       = new URLSearchParams(window.location.search);
    const inviteToken  = params.get('invite');
    const queryUrl     = params.get('sheetUrl') || params.get('sheet');
    const queryCurrency = params.get('currency');
    const queryTheme   = params.get('theme');
    const expiresAt    = params.get('expiresAt');

    const cleanUrlBar = () => {
      try {
        const clean = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({ path: clean }, '', clean);
      } catch (e) { /* no-op */ }
    };

    if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
      setInviteError('This QR code or invite link has expired. Ask the workspace owner for a fresh one.');
      cleanUrlBar();
      return;
    }

    if (inviteToken) {
      localStorage.setItem('crm_pending_invite', inviteToken);
      cleanUrlBar();
      return;
    }

    if (queryCurrency) setCurrency(queryCurrency);
    if (queryTheme) { setTheme(queryTheme); document.documentElement.setAttribute('data-theme', queryTheme); }
    if (queryUrl && user) workspace.saveSheetUrl(queryUrl);
    else if (queryUrl) localStorage.setItem('crm_pending_sheet_url', queryUrl);
    if (queryUrl || queryCurrency || queryTheme || expiresAt) cleanUrlBar();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const pendingInvite = localStorage.getItem('crm_pending_invite');
    if (pendingInvite) {
      localStorage.removeItem('crm_pending_invite');
      workspace.acceptInviteToken(pendingInvite).then(ok => {
        if (!ok) setInviteError('This invite link has expired or was already used. Ask the workspace owner for a new one.');
      });
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user || workspace.wsLoading) return;
    const pendingUrl = localStorage.getItem('crm_pending_sheet_url');
    if (pendingUrl) {
      localStorage.removeItem('crm_pending_sheet_url');
      workspace.saveSheetUrl(pendingUrl);
    }
  }, [user?.uid, workspace.wsLoading]);

  // ── Setup wizard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    if (isConfigured) {
      if (!workspace.userSettings) return;
      if (!sheetUrl && workspace.isOwner && !workspace.userSettings.hasSeenWizard) {
        setIsSetupWizardOpen(true);
        workspace.saveUserSettings({ hasSeenWizard: true });
      }
    } else {
      if (!sheetUrl && !localStorage.getItem('crm_has_seen_wizard')) {
        setIsSetupWizardOpen(true);
        localStorage.setItem('crm_has_seen_wizard', 'true');
      }
    }
  }, [sheetUrl, isLoggedIn, workspace.userSettings, workspace.isOwner]);

  // ── Google Sheets: local-mode sync (unchanged) ────────────────────────────
  // In Firebase mode Sheets is export-only — the sync effects below only run
  // when isConfigured is false.

  useEffect(() => {
    if (isConfigured) return; // Firebase mode: no auto-pull
    if (!workspace.userSettings && isConfigured) return;
    if (!sheetUrl) { hydratedSheetUrlRef.current = ''; setSyncStatus('offline'); return; }
    if (hydratedSheetUrlRef.current === sheetUrl) return;
    hydratedSheetUrlRef.current = sheetUrl;
    let cancelled = false;
    (async () => {
      await syncDataFromSheet(sheetUrl, { allowQueuedPull: true });
      if (cancelled) return;
      if (syncMode === 'auto' && syncQueueRef.current.length > 0) flushSyncQueue();
    })();
    return () => { cancelled = true; };
  }, [sheetUrl, syncMode]);

  useEffect(() => {
    if (isConfigured) return;
    const handleOnline = () => {
      if (syncMode === 'auto' && syncQueue.length > 0 && sheetUrl && syncStatus !== 'syncing') {
        flushSyncQueue();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncMode, syncQueue.length, sheetUrl, syncStatus]);

  useEffect(() => {
    if (isConfigured) return;
    if (syncMode !== 'auto' || syncQueue.length === 0 || !sheetUrl || syncStatus === 'syncing') return;
    const t = setInterval(() => flushSyncQueue(), 30000);
    return () => clearInterval(t);
  }, [syncMode, syncQueue.length, sheetUrl, syncStatus]);

  // ── CRM mutations (Firebase-first, local fallback) ────────────────────────

  const upsertLocalLead = (lead) => {
    setLocalLeads(prev => {
      const idx = prev.findIndex(l => String(l.id) === String(lead.id));
      if (idx !== -1) { const c = [...prev]; c[idx] = lead; return c; }
      return [lead, ...prev];
    });
  };

  const saveLead = async (leadData) => {
    const isNew  = !leadData.id;
    const finalId = leadData.id || `lead-${Date.now()}`;
    const finalData = { ...leadData, id: finalId, pipelineId: leadData.pipelineId || activePipelineId };

    if (isConfigured) {
      const prevLead = leads.find(l => l.id === finalId) || null;
      await workspace.saveLead(finalData, prevLead);
      // onSnapshot will update UI automatically
      if (isNew) {
        await workspace.addNote({
          leadId:    finalId,
          text:      'Lead created in CRM.',
          type:      'system',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // Local mode — optimistic update + Sheet queue
      if (leadRevisionsRef.current[finalId] === undefined) {
        leadRevisionsRef.current[finalId] = Number(leadData.revision) || 0;
      }
      const currentRev = leadRevisionsRef.current[finalId];
      leadRevisionsRef.current[finalId] = currentRev + 1;
      const optimistic = { ...finalData, revision: currentRev + 1 };
      upsertLocalLead(optimistic);
      if (isNew) {
        const note = { id: `note-${Date.now()}`, leadId: finalId, text: 'Lead created in CRM.', type: 'system', timestamp: new Date().toISOString() };
        setLocalNotes(prev => [note, ...prev]);
      }
      await handleSyncPush({ action: 'saveLead', lead: { ...finalData, revision: currentRev, baseRevision: currentRev } });
    }
  };

  const deleteLead = async (id) => {
    if (isConfigured) {
      await workspace.deleteLead(id);
    } else {
      setLocalLeads(prev => prev.filter(l => String(l.id) !== String(id)));
      setLocalNotes(prev => prev.filter(n => String(n.leadId) !== String(id)));
      const currentRev = leadRevisionsRef.current[id] || 0;
      delete leadRevisionsRef.current[id];
      await handleSyncPush({ action: 'deleteLead', id, baseRevision: currentRev });
    }
    if (String(selectedLeadId) === String(id)) setSelectedLeadId(null);
  };

  const addNote = async (noteData) => {
    const finalNote = { ...noteData, id: `note-${Date.now()}`, timestamp: new Date().toISOString() };
    const relatedLead = leads.find(l => String(l.id) === String(noteData.leadId)) || null;

    if (isConfigured) {
      await workspace.addNote(finalNote);
      if (relatedLead && (noteData.type === 'call' || noteData.type === 'whatsapp')) {
        await workspace.saveLead({ ...relatedLead, lastContacted: finalNote.timestamp }, relatedLead);
      }
    } else {
      setLocalNotes(prev => [finalNote, ...prev]);
      if (relatedLead && (noteData.type === 'call' || noteData.type === 'whatsapp')) {
        await saveLead({ ...relatedLead, lastContacted: finalNote.timestamp });
      }
      await handleSyncPush({ action: 'saveNote', note: finalNote });
    }
  };

  const updatePipelines = async (updatedPipelines) => {
    if (isConfigured) {
      // Upsert each pipeline individually to Firestore
      const existingIds = new Set(pipelines.map(p => p.id));
      const updatedIds  = new Set(updatedPipelines.map(p => p.id));
      // Delete removed pipelines
      for (const p of pipelines) {
        if (!updatedIds.has(p.id)) await workspace.deletePipeline(p.id);
      }
      // Upsert all current pipelines
      for (const p of updatedPipelines) await workspace.savePipeline(p);
    } else {
      setLocalPipelines(updatedPipelines);
      await handleSyncPush({ action: 'savePipelines', pipelines: updatedPipelines });
    }
  };

  // ── Sprint helpers ────────────────────────────────────────────────────────
  const syncSprint = async (sprint) => {
    if (isConfigured) {
      await workspace.saveSprint(sprint);
    } else {
      await handleSyncPush({ action: 'saveSprint', sprint });
    }
  };

  const deleteSprintFromSheet = async (id) => {
    if (isConfigured) {
      await workspace.deleteSprint(id);
    } else {
      await handleSyncPush({ action: 'deleteSprint', id });
    }
  };

  const syncCallingLists = async (lists) => {
    if (isConfigured) {
      for (const list of lists) await workspace.saveCallingList(list);
    } else {
      await handleSyncPush({ action: 'saveCallingLists', callingLists: lists });
    }
  };

  const onResumeSprint = (sprintId, contactIdx = null) => {
    const updatedSprints = sprints.map(s => {
      if (String(s.id) !== String(sprintId)) return s;
      const u = { ...s, status: 'active' };
      if (contactIdx !== null) u.currentIdx = contactIdx;
      return u;
    });
    if (!isConfigured) setLocalSprints(updatedSprints);
    const sprintToSync = updatedSprints.find(s => String(s.id) === String(sprintId));
    if (sprintToSync) syncSprint(sprintToSync);
    saveActiveSprintIdToStorage(sprintId);
    setActiveTab('sprint');
  };

  // ── Settings helpers ──────────────────────────────────────────────────────
  async function updateCurrency(c) {
    setCurrency(c);
    if (!isConfigured) await syncSettings({ currency: c, syncMode, whatsappTemplates, theme });
  }

  async function updateSyncMode(sm) {
    setSyncMode(sm);
    if (!isConfigured) await syncSettings({ currency, syncMode: sm, whatsappTemplates, theme });
  }

  async function updateWhatsappTemplates(templates) {
    setWhatsappTemplates(templates);
    if (isConfigured) {
      await workspace.saveWsSettings({ whatsappTemplates: templates });
    } else {
      localStorage.setItem('crm_wa_templates', JSON.stringify(templates));
      await syncSettings({ currency, syncMode, whatsappTemplates: templates, theme });
    }
  }

  async function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (!isConfigured) await syncSettings({ currency, syncMode, whatsappTemplates, theme: next });
  }

  // ── Google Sheets export (Firebase mode: on-demand only) ─────────────────
  const exportToSheet = async () => {
    if (!sheetUrl) return;
    setSheetExportStatus('exporting');
    try {
      await postToSheet({ action: 'exportLeads', leads });
      await postToSheet({ action: 'exportNotes', notes });
      await postToSheet({ action: 'savePipelines', pipelines });
      await postToSheet({ action: 'saveCallingLists', callingLists });
      await postToSheet({ action: 'saveSettings', settings: { currency, syncMode, whatsappTemplates, theme } });
      workspace.saveSheetUrl(sheetUrl); // updates lastSyncAt on workspace doc
      setSheetExportStatus('done');
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSheetExportStatus('idle'), 3000);
    } catch (err) {
      console.error('Sheet export error:', err);
      setSheetExportStatus('error');
    }
  };

  const importFromSheet = async () => {
    if (!sheetUrl) return;
    setSheetExportStatus('exporting');
    try {
      const res  = await fetch(`${sheetUrl}?action=readAll`);
      const data = await res.json();
      if (!data.success) { setSheetExportStatus('error'); return; }

      // Write each entity to Firestore — onSnapshot will update UI
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

      localStorage.setItem(`crm_migrated_${workspace.workspaceId}`, 'true');
      setShowMigrationBanner(false);
      setSheetExportStatus('done');
      setTimeout(() => setSheetExportStatus('idle'), 3000);
    } catch (err) {
      console.error('Sheet import error:', err);
      setSheetExportStatus('error');
    }
  };

  // ── Local-mode Sheet sync (unchanged from original) ───────────────────────
  async function syncDataFromSheet(targetUrl = sheetUrl, options = {}) {
    const { allowQueuedPull = false } = options;
    if (!targetUrl) { setSyncStatus('offline'); return; }
    const fetchStartedAt = Date.now();
    setSyncStatus('syncing');
    try {
      const response = await fetch(`${targetUrl}?action=readAll`);
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      if (data.success) {
        const hasBlockingQueue = syncQueueRef.current.length > 0 && !allowQueuedPull && !reconcileAfterPullRef.current;
        if (isSyncingRef.current || hasBlockingQueue || lastWriteTimeRef.current > fetchStartedAt) {
          setSyncStatus('synced'); return;
        }
        if ('leads' in data) {
          const nextLeads = Array.isArray(data.leads) ? data.leads : [];
          setLocalLeads(nextLeads);
          leadRevisionsRef.current = {};
          nextLeads.forEach(l => { leadRevisionsRef.current[l.id] = Number(l.revision) || 0; });
        }
        if ('notes'       in data) setLocalNotes(Array.isArray(data.notes)       ? data.notes       : []);
        if ('pipelines'   in data) setLocalPipelines(Array.isArray(data.pipelines) ? data.pipelines : []);
        if ('sprints'     in data) setLocalSprints(Array.isArray(data.sprints)     ? data.sprints     : []);
        if ('callingLists'in data) setLocalCallingLists(Array.isArray(data.callingLists) ? data.callingLists : []);
        if (data.settings) {
          applySettingsPayload(data.settings);
        } else if (targetUrl) {
          await syncSettings({ currency, syncMode, whatsappTemplates, theme });
        }
        if (reconcileAfterPullRef.current) {
          reconcileAfterPullRef.current = false;
          updateLocalSyncQueue([]);
        }
        setSyncStatus('synced');
        const ts = new Date().toLocaleTimeString();
        setLastSyncTime(ts);
        localStorage.setItem('crm_last_sync', ts);
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Sheets Sync Error:', err);
      setSyncStatus('error');
    }
  }

  const applySettingsPayload = (settings) => {
    if (!settings) return;
    if (settings.currency) setCurrency(settings.currency);
    if (settings.syncMode) setSyncMode(settings.syncMode);
    if (Array.isArray(settings.whatsappTemplates)) setWhatsappTemplates(settings.whatsappTemplates);
    if (settings.theme) setTheme(settings.theme);
    const nextRev = Number(settings.revision) || 0;
    settingsRevisionRef.current = nextRev;
    setSettingsRevision(nextRev);
  };

  async function syncSettings(nextSettings) {
    const currentRev = settingsRevisionRef.current;
    settingsRevisionRef.current = currentRev + 1;
    setSettingsRevision(currentRev + 1);
    localStorage.setItem('crm_settings_revision', String(currentRev + 1));
    const payload = { action: 'saveSettings', settings: { ...nextSettings, baseRevision: currentRev } };
    await handleSyncPush(payload);
  }

  async function postToSheet(payload) {
    if (!sheetUrl) return { success: true, offline: true };
    try {
      const response = await fetch(sheetUrl, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload),
      });
      if (response.ok) {
        try {
          const data = await response.json();
          if (data?.success === false) return { success: false, conflict: Boolean(data.conflict), error: data.error, data };
          setLastSyncTime(new Date().toLocaleTimeString());
          return { success: true, data };
        } catch { setLastSyncTime(new Date().toLocaleTimeString()); return { success: true }; }
      }
      return { success: false, error: 'Non-OK response' };
    } catch {
      try {
        await fetch(sheetUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
        reconcileAfterPullRef.current = true;
        setTimeout(() => { if (!isSyncingRef.current) syncDataFromSheet(undefined, { allowQueuedPull: true }); }, 2500);
        return { success: true, opaque: true, unverified: true };
      } catch { return { success: false, error: 'Unable to reach endpoint.' }; }
    }
  }

  async function flushSyncQueue() {
    if (!sheetUrl || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    let failed = false;
    try {
      while (syncQueueRef.current.length > 0) {
        const item   = syncQueueRef.current[0];
        const result = await postToSheet(item);
        if (result.success) {
          if (result.unverified) break;
          lastWriteTimeRef.current = Date.now();
          if (item.action === 'saveSettings' && result.data?.settings?.revision !== undefined) {
            const rev = Number(result.data.settings.revision);
            settingsRevisionRef.current = rev;
            setSettingsRevision(rev);
            localStorage.setItem('crm_settings_revision', String(rev));
          }
          updateLocalSyncQueue(syncQueueRef.current.slice(1));
        } else {
          failed = true;
          if (result.conflict) {
            updateLocalSyncQueue([]);
            setInviteError(null); // clear unrelated banners
            await syncDataFromSheet(undefined, { allowQueuedPull: true });
            return;
          }
          break;
        }
      }
    } finally { isSyncingRef.current = false; }
    setSyncStatus(failed ? 'error' : 'synced');
  }

  async function handleSyncPush(payload) {
    if (!sheetUrl) { setSyncStatus('offline'); return { success: false, offline: true }; }
    const nextPayload = { ...payload, queueKey: payload.queueKey || buildQueueKey(payload) };
    const deduped = syncQueueRef.current.filter(p => {
      if (nextPayload.action === 'saveLead'    && p.action === 'saveLead')    return p.lead?.id !== nextPayload.lead?.id;
      if (nextPayload.action === 'deleteLead'  && p.action === 'saveLead')    return p.lead?.id !== nextPayload.id;
      if (nextPayload.action === 'saveLead'    && p.action === 'deleteLead')  return p.id       !== nextPayload.lead?.id;
      if (nextPayload.action === 'saveSettings'&& p.action === 'saveSettings') return false;
      if (p.queueKey && nextPayload.queueKey) return p.queueKey !== nextPayload.queueKey;
      return true;
    });
    const nextQueue = [...deduped, nextPayload];
    if (syncMode === 'manual') { updateLocalSyncQueue(nextQueue); setSyncStatus('pending'); return { success: true, queued: true }; }
    updateLocalSyncQueue(nextQueue);
    flushSyncQueue();
    return { success: true, queued: true };
  }

  function buildQueueKey(payload) {
    switch (payload.action) {
      case 'saveLead':   case 'deleteLead':   return `lead:${payload.lead?.id || payload.id}`;
      case 'saveSettings': return 'settings';
      case 'saveSprint': case 'deleteSprint': return `sprint:${payload.sprint?.id || payload.id}`;
      case 'saveCallingLists': return 'callingLists';
      case 'savePipelines':   return 'pipelines';
      case 'saveNote': return `note:${payload.note?.id}`;
      default: return `${payload.action}:${payload.id || payload.lead?.id || payload.note?.id || Date.now()}`;
    }
  }

  // ── KBar actions ──────────────────────────────────────────────────────────
  const actions = [
    { id: 'act_new_lead',   name: 'Create New Lead / Client',      shortcut: ['n','l'], keywords: 'add capture record contacts sales client deals', section: 'Quick Actions', perform: () => setIsNewLeadOpen(true),    icon: <UserPlus size={16} />, subtitle: 'Open lead form creation wizard' },
    { id: 'nav_funnel',     name: 'Go to Funnels Board',           shortcut: ['g','f'], keywords: 'kanban deal sales columns stages pipeline',     section: 'Navigation',    perform: () => setActiveTab('funnel'),   icon: <BarChart3 size={16} />, subtitle: 'View stages, pipelines and deal cards' },
    { id: 'nav_sprint',     name: 'Go to Calling Sprint',          shortcut: ['g','c'], keywords: 'call outreach list whatsapp dialing sprint',    section: 'Navigation',    perform: () => setActiveTab('sprint'),   icon: <PhoneCall size={16} />, subtitle: 'Outreach list dialer and lead details' },
    { id: 'nav_logs',       name: 'Go to Sprints Log',             shortcut: ['g','l'], keywords: 'sprint logs activity audit records history',    section: 'Navigation',    perform: () => setActiveTab('sprints-log'), icon: <History size={16} />, subtitle: 'Track sprint history and system event logs' },
    { id: 'nav_settings',   name: 'Go to Settings & Preferences',  shortcut: ['g','s'], keywords: 'currency sheets credentials api templates',    section: 'Navigation',    perform: () => setActiveTab('settings'), icon: <Settings size={16} />, subtitle: 'Manage currency, sheets sync, and templates' },
    ...(!isConfigured ? [
      { id: 'sync_pull', name: 'Pull Data from Google Sheets', shortcut: ['s','s'], keywords: 'fetch download refresh spreadsheet pull', section: 'Sheets Sync', perform: () => sheetUrl ? syncDataFromSheet() : alert('Please connect a Google Sheet first.'), icon: <Download size={16} />, subtitle: 'Fetch latest rows from Google Sheets' },
      { id: 'sync_push', name: 'Push Pending Edits to Sheet',  shortcut: ['s','p'], keywords: 'write upload queue flush sync push changes',  section: 'Sheets Sync', perform: () => sheetUrl ? flushSyncQueue() : alert('Please connect a Google Sheet first.'),  icon: <Upload size={16} />, subtitle: 'Upload pending offline edits to the sheet' },
    ] : [
      { id: 'sync_export', name: 'Export to Google Sheets', shortcut: ['s','e'], keywords: 'export backup sheet',          section: 'Sheets Sync', perform: () => exportToSheet(),   icon: <Upload size={16} />, subtitle: 'Snapshot current data to Google Sheets' },
      { id: 'sync_import', name: 'Import from Google Sheets', shortcut: ['s','i'], keywords: 'import migrate sheet',       section: 'Sheets Sync', perform: () => importFromSheet(), icon: <Download size={16} />, subtitle: 'Pull sheet data into Firestore' },
    ]),
    { id: 'pref_theme',    name: 'Toggle Light/Dark Theme',          shortcut: ['t','t'], keywords: 'color mode toggle dark light theme switch', section: 'Preferences', perform: () => toggleTheme(), icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />, subtitle: 'Switch between light and dark UI modes' },
    { id: 'pref_curr_usd', name: 'Set Account Currency to USD ($)',  keywords: 'currency dollar usd', section: 'Preferences', perform: () => updateCurrency('USD'), icon: <Coins size={16} />, subtitle: 'Change display currency to USD ($)' },
    { id: 'pref_curr_inr', name: 'Set Account Currency to INR (₹)',  keywords: 'currency rupee inr india', section: 'Preferences', perform: () => updateCurrency('INR'), icon: <Coins size={16} />, subtitle: 'Change display currency to INR (₹)' },
    { id: 'pref_curr_eur', name: 'Set Account Currency to EUR (€)',  keywords: 'currency euro eur europe', section: 'Preferences', perform: () => updateCurrency('EUR'), icon: <Coins size={16} />, subtitle: 'Change display currency to EUR (€)' },
    { id: 'pref_curr_gbp', name: 'Set Account Currency to GBP (£)',  keywords: 'currency pound gbp uk', section: 'Preferences', perform: () => updateCurrency('GBP'), icon: <Coins size={16} />, subtitle: 'Change display currency to GBP (£)' },
    { id: 'pref_curr_aed', name: 'Set Account Currency to AED (د.إ)',keywords: 'currency dirham aed dubai', section: 'Preferences', perform: () => updateCurrency('AED'), icon: <Coins size={16} />, subtitle: 'Change display currency to AED (د.إ)' },
  ];

  // ── Render gates ──────────────────────────────────────────────────────────
  if (isAppLoading) {
    return (
      <div className="login-intro-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>
        <div className="login-intro-planet-wrapper">
          <svg viewBox="0 0 32 32" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg" className="login-intro-planet-svg">
            <defs><radialGradient id="introPlutoPlanetGrad" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#ffeedd" /><stop offset="60%" stopColor="var(--primary)" /><stop offset="100%" stopColor="#7c2d12" /></radialGradient></defs>
            <circle cx="16" cy="16" r="12" fill="url(#introPlutoPlanetGrad)" />
            <g transform="translate(13, 12.5) scale(0.35) rotate(-20 12 12)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ffffff" opacity="0.9" /></g>
            <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          </svg>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-body)', fontWeight: 500, letterSpacing: '0.02em', animation: 'heartbeat 2s infinite ease-in-out' }}>
          Connecting to your Pluto workspace...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <KBarProvider actions={actions}>
      <PlutoCommandBar />
      <div className="app-container">

        {/* ── Banners ─────────────────────────────────────────────────────── */}

        {/* Invite error banner */}
        {inviteError && (
          <div className="invite-error-banner" role="alert">
            <AlertTriangle size={15} />
            <span>{inviteError}</span>
            <button className="invite-error-dismiss" onClick={() => setInviteError(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Ejection banner */}
        {ejectionBanner && (
          <div className="invite-error-banner ejection" role="alert">
            <AlertTriangle size={15} />
            <span>You have been removed from this workspace by the owner. Refresh to start a new workspace.</span>
            <button className="invite-error-dismiss" onClick={() => window.location.reload()} aria-label="Refresh">Refresh</button>
          </div>
        )}

        {/* One-time migration banner (Firebase mode, Sheet connected, Firestore empty) */}
        {showMigrationBanner && !isMigrating && (
          <div className="migration-banner" role="alert">
            <span>📦 Your Google Sheet has data that hasn't been migrated to your real-time workspace yet.</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: 'var(--text-xs)' }} onClick={importFromSheet}>
                Migrate Now
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--text-xs)' }} onClick={() => {
                localStorage.setItem(`crm_migrated_${workspace.workspaceId}`, 'true');
                setShowMigrationBanner(false);
              }}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header>
          <div
            className={`logo-container ${logoAnimating ? 'logo-pop-active' : ''}`}
            onClick={handleLogoClick}
            style={{ cursor: 'pointer' }}
            title="Go to Home Dashboard"
          >
            <div className="logo-icon">
              <svg viewBox="0 0 32 32" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                <defs><radialGradient id="plutoPlanetGrad" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#ffeedd" /><stop offset="60%" stopColor="var(--primary)" /><stop offset="100%" stopColor="#7c2d12" /></radialGradient></defs>
                <circle cx="16" cy="16" r="12" fill="url(#plutoPlanetGrad)" />
                <g transform="translate(13, 12.5) scale(0.35) rotate(-20 12 12)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ffffff" opacity="0.9" /></g>
                <circle cx="16" cy="16" r="12" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.5" />
              </svg>
            </div>
            <div className="logo-text">Pluto</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {!sheetUrl && (
              <button className="btn btn-secondary" style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => setIsSetupWizardOpen(true)} title="Launch Google Sheets Setup Wizard">
                <HelpCircle size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }} className="mobile-hide">Setup Wizard</span>
              </button>
            )}
            <button className="btn btn-secondary" style={{ padding: '0.45rem', borderRadius: '8px' }} onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {theme === 'dark' ? <Sun size={16} style={{ color: 'var(--accent)' }} /> : <Moon size={16} style={{ color: 'var(--primary)' }} />}
            </button>
            <button
              type="button"
              className={`sync-badge ${activeSyncIndicator.className} ${isSyncExpanded ? 'expanded' : ''}`}
              onClick={activeSyncIndicator.onClick}
              title={activeSyncIndicator.title}
              aria-label={activeSyncIndicator.label}
              disabled={!activeSyncIndicator.onClick}
            >
              {effectiveSyncIndicatorState === 'syncing' && (
                <svg className="sync-rect-spinner" viewBox="0 0 36 36">
                  <rect x="1" y="1" width="34" height="34" rx="9" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" pathLength="100" />
                </svg>
              )}
              {activeSyncIndicator.icon}
              <span>{activeSyncIndicator.label}</span>
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.45rem', borderRadius: '8px' }} onClick={handleLogout} title={`Logged in as ${loggedInUser}. Click to log out.`}>
              <LogOut size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </header>

        {/* ── Sidebar nav ─────────────────────────────────────────────────── */}
        <nav>
          <button className={`nav-item ${activeTab === 'funnel' ? 'active' : ''}`} onClick={() => setActiveTab('funnel')}>
            <BarChart3 className="nav-icon" /><span className="nav-label">Funnels</span>
          </button>
          <button className={`nav-item ${activeTab === 'sprint' ? 'active' : ''}`} onClick={() => setActiveTab('sprint')}>
            <PhoneCall className="nav-icon" /><span className="nav-label">Calling Sprint</span>
          </button>
          <button className={`nav-item ${activeTab === 'sprints-log' ? 'active' : ''}`} onClick={() => setActiveTab('sprints-log')}>
            <History className="nav-icon" /><span className="nav-label">Logs</span>
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings className="nav-icon" /><span className="nav-label">Settings</span>
          </button>
        </nav>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main>
          {activeTab === 'funnel' && (
            <FunnelView leads={leads} activePipeline={activePipeline} pipelines={pipelines} activePipelineId={activePipelineId} setActivePipelineId={setActivePipelineId} onSelectLead={(id) => setSelectedLeadId(id)} onNewLeadClick={() => setIsNewLeadOpen(true)} saveLead={saveLead} currency={currency} />
          )}
          {activeTab === 'sprint' && (
            <SprintView leads={leads} activePipeline={activePipeline} pipelines={pipelines} whatsappTemplates={whatsappTemplates} addNote={addNote} saveLead={saveLead} onSelectLead={(id) => setSelectedLeadId(id)} currency={currency} syncSprint={syncSprint} deleteSprintFromSheet={deleteSprintFromSheet} syncCallingLists={syncCallingLists} sprints={sprints} setSprints={isConfigured ? undefined : setLocalSprints} callingLists={callingLists} setCallingLists={isConfigured ? undefined : setLocalCallingLists} activeSprintId={activeSprintId} saveActiveSprintIdToStorage={saveActiveSprintIdToStorage} />
          )}
          {activeTab === 'sprints-log' && (
            <SprintsLogView sprints={sprints} setSprints={isConfigured ? undefined : setLocalSprints} deleteSprintFromSheet={deleteSprintFromSheet} currency={currency} activeSprintId={activeSprintId} saveActiveSprintIdToStorage={saveActiveSprintIdToStorage} onResumeSprint={onResumeSprint} onSelectLead={(id) => setSelectedLeadId(id)} />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              sheetUrl={sheetUrl}
              setSheetUrl={(url) => {
                setSheetUrl(url);
                if (loggedInUser) {
                  if (isConfigured) workspace.saveSheetUrl(url);
                  else { localStorage.setItem(`crm_sheet_url_${loggedInUser}`, url); localStorage.setItem('crm_sheet_url', url); }
                }
                if (url && !isConfigured) syncDataFromSheet(url);
                else if (!url) setSyncStatus('offline');
              }}
              workspace={workspace}
              user={user}
              syncStatus={isConfigured ? effectiveSyncIndicatorState : syncStatus}
              onSyncClick={isConfigured ? exportToSheet : () => {
                if (syncQueue.length > 0) { if (confirm(`You have ${syncQueue.length} pending edits. Push them first?`)) flushSyncQueue(); }
                else syncDataFromSheet();
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
                if (confirm('Discard all pending offline edits? Cannot be undone.')) updateLocalSyncQueue([]);
              }}
              flushSyncQueue={flushSyncQueue}
              theme={theme}
              toggleTheme={toggleTheme}
              isFirebaseMode={isConfigured}
              exportToSheet={exportToSheet}
              importFromSheet={importFromSheet}
              sheetExportStatus={sheetExportStatus}
            />
          )}
        </main>

        {/* ── Global modals ────────────────────────────────────────────────── */}
        {selectedLeadId && (
          <LeadModal lead={leads.find(l => String(l.id) === String(selectedLeadId))} leads={leads} notes={notes} pipelines={pipelines} onClose={() => setSelectedLeadId(null)} onSave={saveLead} onDelete={deleteLead} onAddNote={addNote} whatsappTemplates={whatsappTemplates} currency={currency} />
        )}
        {isNewLeadOpen && (
          <LeadModal lead={null} leads={leads} notes={notes} pipelines={pipelines} activePipelineId={activePipelineId} onClose={() => setIsNewLeadOpen(false)} onSave={(data) => { saveLead(data); setIsNewLeadOpen(false); }} onDelete={deleteLead} onAddNote={addNote} whatsappTemplates={whatsappTemplates} currency={currency} />
        )}
        {isSetupWizardOpen && (
          <SetupWizard sheetUrl={sheetUrl} setSheetUrl={(url) => {
            setSheetUrl(url);
            if (loggedInUser) {
              if (isConfigured) workspace.saveSheetUrl(url);
              else { localStorage.setItem(`crm_sheet_url_${loggedInUser}`, url); localStorage.setItem('crm_sheet_url', url); }
            }
            if (url && !isConfigured) syncDataFromSheet(url);
          }} syncStatus={isConfigured ? effectiveSyncIndicatorState : syncStatus} onClose={() => setIsSetupWizardOpen(false)} />
        )}

        {/* Conflict toast stack */}
        <ConflictToast conflicts={conflicts} onDismiss={dismissConflict} onForceWrite={forceWriteConflict} />

        {/* ── Cosmic Easter Egg ────────────────────────────────────────────── */}
        <div className={`cosmic-overlay ${isCosmicActive ? 'active' : ''}`}>
          <div className="disco-transition-layer"></div>
          <div className="stars-field">
            {stars.map(star => (
              <div key={star.id} className="star" style={{ width: `${star.size}px`, height: `${star.size}px`, left: `${star.left}%`, top: `${star.top}%`, animationDuration: `${star.duration}s`, animationDelay: `${star.delay}s` }} />
            ))}
          </div>
          <div className="cosmic-content">
            <div className="cosmic-heart-icon">
              <svg viewBox="0 0 32 32" width="100" height="100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', filter: 'drop-shadow(0 0 30px rgba(249, 115, 22, 0.45)) drop-shadow(0 0 50px rgba(236, 72, 153, 0.35))' }}>
                <defs><radialGradient id="plutoPlanetGradCosmic" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#ffeedd" /><stop offset="60%" stopColor="var(--primary)" /><stop offset="100%" stopColor="#7c2d12" /></radialGradient></defs>
                <circle cx="16" cy="16" r="12" fill="url(#plutoPlanetGradCosmic)" />
                <g transform="translate(13, 12.5) scale(0.35) rotate(-20 12 12)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ffffff" opacity="0.95" /></g>
                <circle cx="16" cy="16" r="12" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.5" />
              </svg>
            </div>
            <div className="cosmic-quote">
              "{cosmicQuote.text}"
              <em>{cosmicQuote.tagline}</em>
            </div>
            <button type="button" className="btn-return" onClick={() => setIsCosmicActive(false)}>Return to Earth</button>
          </div>
        </div>

      </div>
    </KBarProvider>
  );
}
