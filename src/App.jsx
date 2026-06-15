import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSheetSync } from './hooks/useSheetSync';
import { isConfigured } from './firebase';
import { CrmProvider, useCrm } from './contexts/CrmContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { COSMIC_QUOTES } from './constants';
import {
  BarChart3,
  PhoneCall,
  Settings,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  HelpCircle,
  LogOut,
  History,
  PanelLeftClose,
  PanelLeftOpen,
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

// ─── App Shell ───────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading: authLoading, signOutUser } = useAuth();

  if (!isConfigured) {
    return <Login />;
  }

  if (authLoading) {
    return (
      <div className="login-intro-container">
        <div className="login-intro-planet-wrapper">
          <div className="loader-spinner-small" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <CrmProvider user={user}>
      <AppWithCrm user={user} signOutUser={signOutUser} />
    </CrmProvider>
  );
}

function AppWithCrm({ user, signOutUser }) {
  const crm = useCrm();

  if (crm.workspace.wsLoading) {
    return (
      <div className="login-intro-container">
        <div className="login-intro-planet-wrapper">
          <div className="loader-spinner-small" />
        </div>
      </div>
    );
  }

  return (
    <SettingsProvider workspace={crm.workspace} user={user}>
      <AppContent user={user} signOutUser={signOutUser} />
    </SettingsProvider>
  );
}

// ─── Main App Content ────────────────────────────────────────────────────────

function AppContent({ user, signOutUser }) {
  const crm = useCrm();
  const settings = useSettings();
  const { workspace, leads, notes, pipelines, sprints, callingLists,
          activePipeline, activePipelineId, setActivePipelineId,
          activeSprintId, saveActiveSprintIdToStorage,
          saveLead, deleteLead, addNote, updatePipelines,
          syncSprint, deleteSprint, syncCallingLists } = crm;

  const sheetSync = useSheetSync({
    workspace,
    leads,
    notes,
    pipelines,
    callingLists,
    settings: {
      currency: settings.currency,
      syncMode: settings.syncMode,
      whatsappTemplates: settings.whatsappTemplates,
      theme: settings.theme,
    },
  });

  // ── Navigation & view state ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('funnel');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [logoAnimating, setLogoAnimating] = useState(false);
  const [isCosmicActive, setIsCosmicActive] = useState(false);
  const [cosmicQuote, setCosmicQuote] = useState({ text: '', tagline: '' });
  const [cosmicClicks, setCosmicClicks] = useState([]);
  const [stars, setStars] = useState([]);
  const [isSyncExpanded, setIsSyncExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('pluto_sidebar') === 'collapsed');

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('pluto_sidebar', next ? 'collapsed' : 'expanded');
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleSidebar]);

  // ── Invite handling ─────────────────────────────────────────────────────
  const [inviteError, setInviteError] = useState(null);
  const [ejectionBanner, setEjectionBanner] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);

  useEffect(() => {
    if (workspace.ejected) setEjectionBanner(true);
  }, [workspace.ejected]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    const queryUrl = params.get('sheetUrl') || params.get('sheet');
    const expiresAt = params.get('expiresAt');

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

    if (queryUrl) workspace.saveSheetUrl(queryUrl);
    if (queryUrl || expiresAt) cleanUrlBar();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const pendingInvite = localStorage.getItem('crm_pending_invite');
    if (pendingInvite) {
      setIsProcessingInvite(true);
      workspace.acceptInviteToken(pendingInvite).then(ok => {
        localStorage.removeItem('crm_pending_invite');
        if (!ok) setInviteError('This invite link has expired or was already used. Ask the workspace owner for a new one.');
      }).finally(() => setIsProcessingInvite(false));
    }
  }, [user?.uid]);

  // ── Setup wizard auto-show ──────────────────────────────────────────────
  useEffect(() => {
    const hasPendingInvite = !!localStorage.getItem('crm_pending_invite') ||
      new URLSearchParams(window.location.search).has('invite') ||
      isProcessingInvite;
    if (hasPendingInvite) return;
    if (!workspace.userSettings) return;
    if (!sheetSync.sheetUrl && workspace.isOwner && !workspace.userSettings.hasSeenWizard) {
      setIsSetupWizardOpen(true);
      workspace.saveUserSettings({ hasSeenWizard: true });
    }
  }, [sheetSync.sheetUrl, workspace.userSettings, workspace.isOwner, isProcessingInvite]);

  // ── Cosmic easter egg ───────────────────────────────────────────────────
  useEffect(() => {
    setStars(Array.from({ length: 60 }).map((_, i) => ({
      id: i, size: Math.random() * 2 + 1, left: Math.random() * 100,
      top: Math.random() * 100, duration: Math.random() * 3 + 1.5, delay: Math.random() * 2,
    })));
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

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await signOutUser();
  };

  // ── Sprint resume ───────────────────────────────────────────────────────
  const onResumeSprint = (sprintId, contactIdx = null) => {
    const sprint = sprints.find(s => String(s.id) === String(sprintId));
    if (!sprint) return;
    const updated = { ...sprint, status: 'active' };
    if (contactIdx !== null) updated.currentIdx = contactIdx;
    syncSprint(updated);
    saveActiveSprintIdToStorage(sprintId);
    setActiveTab('sprint');
  };

  // ── Sync indicator ──────────────────────────────────────────────────────
  const syncIndicatorConfig = {
    syncing: { className: 'syncing', label: 'Exporting...', title: 'Exporting to Google Sheets...', icon: <Wifi size={14} />, onClick: undefined },
    synced:  { className: 'synced', label: 'Live ✓', title: 'Connected — edits sync in real time', icon: <Wifi size={14} />, onClick: undefined },
    offline: { className: 'offline', label: 'Offline', title: 'No network connection', icon: <WifiOff size={14} />, onClick: undefined },
  };
  const activeSyncIndicator = syncIndicatorConfig[sheetSync.syncStatus] || syncIndicatorConfig.synced;

  useEffect(() => {
    setIsSyncExpanded(sheetSync.syncStatus === 'syncing');
  }, [sheetSync.syncStatus]);

  // ── KBar actions ────────────────────────────────────────────────────────
  const loggedInUser = user?.displayName || user?.email || '';
  const kbarActions = [
    { id: 'funnel', name: 'Go to Funnels', shortcut: ['g', 'f'], perform: () => setActiveTab('funnel'), section: 'Navigation', icon: <BarChart3 size={16} /> },
    { id: 'sprint', name: 'Go to Calling Sprint', shortcut: ['g', 's'], perform: () => setActiveTab('sprint'), section: 'Navigation', icon: <PhoneCall size={16} /> },
    { id: 'logs', name: 'Go to Sprint Logs', shortcut: ['g', 'l'], perform: () => setActiveTab('sprints-log'), section: 'Navigation', icon: <History size={16} /> },
    { id: 'settings', name: 'Go to Settings', shortcut: ['g', ','], perform: () => setActiveTab('settings'), section: 'Navigation', icon: <Settings size={16} /> },
    { id: 'theme', name: `Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Mode`, shortcut: ['t'], perform: settings.toggleTheme, section: 'Actions', icon: settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} /> },
    { id: 'new-lead', name: 'Add New Lead', shortcut: ['n'], perform: () => setIsNewLeadOpen(true), section: 'Actions' },
    { id: 'sidebar', name: `${sidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar`, shortcut: ['/'], perform: toggleSidebar, section: 'Actions', icon: sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} /> },
    { id: 'export', name: 'Export to Google Sheet', perform: sheetSync.exportToSheet, section: 'Actions' },
    { id: 'logout', name: 'Log Out', perform: handleLogout, section: 'Account', icon: <LogOut size={16} /> },
  ];

  return (
    <KBarProvider actions={kbarActions}>
      <PlutoCommandBar />
      <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} data-theme={settings.theme}>

        {/* Invite error banner */}
        {inviteError && (
          <div className="invite-error-banner" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '0.6rem 0.75rem', margin: '0.5rem', fontSize: 'var(--text-xs)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{inviteError}</span>
            <button onClick={() => setInviteError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}>&times;</button>
          </div>
        )}

        {/* Ejection banner */}
        {ejectionBanner && (
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '0.6rem 0.75rem', margin: '0.5rem', fontSize: 'var(--text-xs)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>You have been removed from your workspace. Please sign out and sign back in to create a new one.</span>
            <button onClick={() => setEjectionBanner(false)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '1.1rem' }}>&times;</button>
          </div>
        )}

        {/* Header */}
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
            {!sheetSync.sheetUrl && (
              <button className="btn btn-secondary" style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => setIsSetupWizardOpen(true)} title="Launch Google Sheets Setup Wizard">
                <HelpCircle size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }} className="mobile-hide">Setup Wizard</span>
              </button>
            )}
            <button className="btn btn-secondary" style={{ padding: '0.45rem', borderRadius: '8px' }} onClick={settings.toggleTheme} title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {settings.theme === 'dark' ? <Sun size={16} style={{ color: 'var(--accent)' }} /> : <Moon size={16} style={{ color: 'var(--primary)' }} />}
            </button>
            <button
              type="button"
              className={`sync-badge ${activeSyncIndicator.className} ${isSyncExpanded ? 'expanded' : ''}`}
              onClick={activeSyncIndicator.onClick}
              title={activeSyncIndicator.title}
              aria-label={activeSyncIndicator.label}
              disabled={!activeSyncIndicator.onClick}
            >
              {sheetSync.syncStatus === 'syncing' && (
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

        {/* Sidebar nav */}
        <nav className={sidebarCollapsed ? 'collapsed' : ''}>
          <button className={`nav-item ${activeTab === 'funnel' ? 'active' : ''}`} onClick={() => setActiveTab('funnel')} title="Funnels">
            <BarChart3 className="nav-icon" /><span className="nav-label">Funnels</span>
          </button>
          <button className={`nav-item ${activeTab === 'sprint' ? 'active' : ''}`} onClick={() => setActiveTab('sprint')} title="Calling Sprint">
            <PhoneCall className="nav-icon" /><span className="nav-label">Calling Sprint</span>
          </button>
          <button className={`nav-item ${activeTab === 'sprints-log' ? 'active' : ''}`} onClick={() => setActiveTab('sprints-log')} title="Logs">
            <History className="nav-icon" /><span className="nav-label">Logs</span>
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title="Settings">
            <Settings className="nav-icon" /><span className="nav-label">Settings</span>
          </button>
          <button className="nav-item nav-collapse-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? 'Expand sidebar (/)' : 'Collapse sidebar (/)'}>
            {sidebarCollapsed ? <PanelLeftOpen className="nav-icon" /> : <PanelLeftClose className="nav-icon" />}
            <span className="nav-label">{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </nav>

        {/* Main content */}
        <main>
          {activeTab === 'funnel' && (
            <FunnelView leads={leads} activePipeline={activePipeline} pipelines={pipelines} activePipelineId={activePipelineId} setActivePipelineId={setActivePipelineId} onSelectLead={(id) => setSelectedLeadId(id)} onNewLeadClick={() => setIsNewLeadOpen(true)} saveLead={saveLead} currency={settings.currency} />
          )}
          {activeTab === 'sprint' && (
            <SprintView leads={leads} activePipeline={activePipeline} pipelines={pipelines} whatsappTemplates={settings.whatsappTemplates} addNote={addNote} saveLead={saveLead} onSelectLead={(id) => setSelectedLeadId(id)} currency={settings.currency} syncSprint={syncSprint} deleteSprintFromSheet={deleteSprint} syncCallingLists={syncCallingLists} sprints={sprints} callingLists={callingLists} activeSprintId={activeSprintId} saveActiveSprintIdToStorage={saveActiveSprintIdToStorage} />
          )}
          {activeTab === 'sprints-log' && (
            <SprintsLogView sprints={sprints} deleteSprintFromSheet={deleteSprint} currency={settings.currency} activeSprintId={activeSprintId} saveActiveSprintIdToStorage={saveActiveSprintIdToStorage} onResumeSprint={onResumeSprint} onSelectLead={(id) => setSelectedLeadId(id)} />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              sheetUrl={sheetSync.sheetUrl}
              setSheetUrl={sheetSync.setSheetUrl}
              syncStatus={sheetSync.syncStatus}
              onSyncClick={sheetSync.exportToSheet}
              lastSyncTime={sheetSync.lastSyncTime}
              onOpenWizard={() => setIsSetupWizardOpen(true)}
              exportToSheet={sheetSync.exportToSheet}
              importFromSheet={sheetSync.importFromSheet}
              sheetExportStatus={sheetSync.sheetExportStatus}
            />
          )}
        </main>

        {/* Global modals */}
        {selectedLeadId && (
          <LeadModal lead={leads.find(l => String(l.id) === String(selectedLeadId))} leads={leads} notes={notes} pipelines={pipelines} onClose={() => setSelectedLeadId(null)} onSave={saveLead} onDelete={deleteLead} onAddNote={addNote} whatsappTemplates={settings.whatsappTemplates} currency={settings.currency} />
        )}
        {isNewLeadOpen && (
          <LeadModal lead={null} leads={leads} notes={notes} pipelines={pipelines} activePipelineId={activePipelineId} onClose={() => setIsNewLeadOpen(false)} onSave={(data) => { saveLead(data); setIsNewLeadOpen(false); }} onDelete={deleteLead} onAddNote={addNote} whatsappTemplates={settings.whatsappTemplates} currency={settings.currency} />
        )}
        {isSetupWizardOpen && (
          <SetupWizard sheetUrl={sheetSync.sheetUrl} setSheetUrl={sheetSync.setSheetUrl} syncStatus={sheetSync.syncStatus} onClose={() => setIsSetupWizardOpen(false)} />
        )}

        {/* Cosmic Easter Egg */}
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
