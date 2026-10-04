import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DISPLAY_SETTINGS,
  loadDisplaySettings,
  saveDisplaySettings,
  type ReaderDisplaySettings,
} from '../lib/display';

export interface ReaderSettingsState {
  readonly settings: ReaderDisplaySettings;
  readonly updateSettings: (patch: Partial<ReaderDisplaySettings>) => void;
  readonly resetSettings: () => void;
}

export function useReaderSettings(): ReaderSettingsState {
  const [settings, setSettings] = useState<ReaderDisplaySettings>(loadDisplaySettings);
  const persistedRef = useRef(settings);

  useEffect(() => {
    if (persistedRef.current === settings) {
      return;
    }
    persistedRef.current = settings;
    saveDisplaySettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<ReaderDisplaySettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_DISPLAY_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings };
}
