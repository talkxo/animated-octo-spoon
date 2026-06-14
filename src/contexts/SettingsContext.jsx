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

  useEffect(() => {
    if (!workspace.userSettings) return;
    const { theme: t, currency: c, syncMode: sm } = workspace.userSettings;
    if (t) { setTheme(t); document.documentElement.setAttribute('data-theme', t); }
    if (c) setCurrency(c);
    if (sm) setSyncMode(sm);
  }, [workspace.userSettings]);

  useEffect(() => {
    if (workspace.wsSettings?.whatsappTemplates) {
      setWhatsappTemplates(workspace.wsSettings.whatsappTemplates);
    }
  }, [workspace.wsSettings]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (user && workspace.userSettings?.theme !== theme) {
      workspace.saveUserSettings({ theme });
    }
  }, [theme]);

  useEffect(() => {
    if (user && workspace.userSettings?.currency !== currency) {
      workspace.saveUserSettings({ currency });
    }
  }, [currency]);

  useEffect(() => {
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
