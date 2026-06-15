import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_WHATSAPP_TEMPLATES } from '../constants';

const SettingsContext = createContext(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export function SettingsProvider({ workspace, user, children }) {
  const [theme, setTheme] = useState('dark');
  const [currency, setCurrency] = useState('USD');
  const [syncMode, setSyncMode] = useState('auto');
  const [whatsappTemplates, setWhatsappTemplates] = useState(DEFAULT_WHATSAPP_TEMPLATES);

  // Hydrate from Firestore — read only, never write
  useEffect(() => {
    if (!workspace.userSettings) return;
    const { theme: t, syncMode: sm } = workspace.userSettings;
    if (t) { setTheme(t); document.documentElement.setAttribute('data-theme', t); }
    if (sm) setSyncMode(sm);
  }, [workspace.userSettings]);

  useEffect(() => {
    if (!workspace.wsSettings) return;
    if (workspace.wsSettings.currency) setCurrency(workspace.wsSettings.currency);
    if (workspace.wsSettings.whatsappTemplates) setWhatsappTemplates(workspace.wsSettings.whatsappTemplates);
  }, [workspace.wsSettings]);

  // Keep DOM theme attribute in sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // All writes happen explicitly in the update callbacks — no save effects
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      workspace.saveUserSettings({ theme: next });
      return next;
    });
  }, [workspace]);

  const updateCurrency = useCallback((c) => {
    setCurrency(c);
    workspace.saveWsSettings({ currency: c });
  }, [workspace]);

  const updateSyncMode = useCallback((sm) => {
    setSyncMode(sm);
    workspace.saveUserSettings({ syncMode: sm });
  }, [workspace]);

  const updateWhatsappTemplates = useCallback(async (templates) => {
    setWhatsappTemplates(templates);
    await workspace.saveWsSettings({ whatsappTemplates: templates });
  }, [workspace]);

  const value = {
    theme,
    toggleTheme,
    currency,
    updateCurrency,
    syncMode,
    updateSyncMode,
    whatsappTemplates,
    updateWhatsappTemplates,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
