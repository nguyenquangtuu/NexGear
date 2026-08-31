'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';

export type ClientSiteSettings = {
  site_name: string;
  site_title: string;
  site_description: string;
  site_keywords: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  favicon_url: string;
  deposit_enabled: boolean;
};

type SiteSettingsResponse = {
  success?: boolean;
  data?: Partial<ClientSiteSettings>;
};

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  }

  return fallback;
}

type SiteSettingsContextValue = {
  settings: ClientSiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  setSettings: React.Dispatch<React.SetStateAction<ClientSiteSettings>>;
};

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

export function SiteSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings: ClientSiteSettings;
}) {
  const [settings, setSettings] = useState<ClientSiteSettings>(initialSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch<SiteSettingsResponse>('/site-settings');
      const nextSettings = response?.data;
      if (nextSettings) {
        setSettings((prev) => ({
          ...prev,
          ...nextSettings,
          deposit_enabled: normalizeBoolean(nextSettings.deposit_enabled, prev.deposit_enabled),
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings,
      setSettings,
    }),
    [loading, refreshSettings, settings]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);

  if (!context) {
    throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  }

  return context;
}
