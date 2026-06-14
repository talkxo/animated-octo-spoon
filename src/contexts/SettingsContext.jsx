import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const userHydrated = useRef(false);
  const wsHydrated = useRef(false);

  // Hydrate user-level settings (theme, syncMode)
  useEffect(() => {
    if (!workspace.userSettings) return;
    const { theme: t, syncMode: sm } = workspace.userSettings;
    if (t) { setTheme(t); document.documentElement.setAttribute('data-theme', t); }
    if (sm) setSyncMode(sm);
    userHydrated.current = true;
  }, [workspace.userSettings]);

  // Hydrate workspace-level settings (currency, whatsappTemplates)
  useEffect(() => {
    if (!workspace.wsSettings) return;
    if (workspace.wsSettings.currency) setCurrency(workspace.wsSettings.currency);
    if (workspace.wsSettings.whatsappTemplates) setWhatsappTemplates(workspace.wsSettings.whatsappTemplates);
    wsHydrated.current = true;
  }, [workspace.wsSettings]);

  // Save user-level: theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (!userHydrated.current) return;
    if (user && workspace.userSettings?.theme !== theme) {
      workspace.saveUserSettings({ theme });
    }
  }, [theme]);

  // Save workspace-level: currency
  useEffect(() => {
    if (!wsHydrated.current) return;
    if (user && workspace.wsSettings?.currency !== currency) {
      workspace.saveWsSettings({ currency });
    }
  }, [currency]);

  // Save user-level: syncMode
  useEffect(() => {
    if (!userHydrated.current) return;
    if (user && workspace.userSettings?.syncMode !== syncMode) {
      workspace.saveUserSettings({ syncMode });
    }
  }, [syncMode]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const updateCurrency = useCallback((c) => {
    setCurrency(c);
  }, []);

  const updateSyncMode = useCallback((sm) => {
    setSyncMode(sm);
  }, []);

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
