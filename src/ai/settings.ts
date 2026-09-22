import { useCallback, useEffect, useState } from 'react';
import { PROVIDERS, getPreset, resolveModelName } from './providers';
import type { AiConfig, ProviderId } from './types';

const STORAGE_KEY = 'reader-ai-config';

export function defaultConfig(): AiConfig {
  return {
    providerId: 'openai',
    model: '',
    apiKey: '',
    baseUrl: '',
    remember: false,
  };
}

function isProviderId(value: string): value is ProviderId {
  return PROVIDERS.some((preset) => preset.id === value);
}

function parseStoredConfig(value: unknown): AiConfig | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const providerId = record['providerId'];
  if (typeof providerId !== 'string' || !isProviderId(providerId)) {
    return null;
  }
  const model = record['model'];
  const apiKey = record['apiKey'];
  const baseUrl = record['baseUrl'];
  return {
    providerId,
    model: typeof model === 'string' ? model : '',
    apiKey: record['remember'] === true && typeof apiKey === 'string' ? apiKey : '',
    baseUrl: typeof baseUrl === 'string' ? baseUrl : '',
    remember: record['remember'] === true,
  };
}

export function loadStoredConfig(): AiConfig | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    return parseStoredConfig(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveStoredConfig(config: AiConfig): void {
  try {
    if (!config.remember) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage can be unavailable; the config still works for this session
  }
}

export function validateConfig(config: AiConfig): string | null {
  const preset = getPreset(config.providerId);
  if (preset.requiresApiKey && config.apiKey.trim() === '') {
    return `Add an API key for ${preset.label}.`;
  }
  if (preset.requiresBaseUrl && config.baseUrl.trim() === '') {
    return `Add a base URL for ${preset.label}.`;
  }
  if (config.baseUrl.trim() !== '') {
    try {
      const url = new URL(config.baseUrl.trim());
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
        return 'Use HTTPS for remote endpoints, or HTTP on localhost for a local model.';
      }
      if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
        return 'Use a base URL without credentials, query parameters, or fragments. Enter your key in the API key field.';
      }
    } catch {
      return 'Enter a valid absolute base URL.';
    }
  }
  if (resolveModelName(config) === '') {
    return 'Enter a model name.';
  }
  return null;
}

export interface AiConfigState {
  readonly config: AiConfig;
  readonly updateConfig: (patch: Partial<AiConfig>) => void;
  readonly resetConfig: () => void;
}

export function useAiConfig(): AiConfigState {
  const [config, setConfig] = useState<AiConfig>(() => loadStoredConfig() ?? defaultConfig());

  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  const updateConfig = useCallback((patch: Partial<AiConfig>) => {
    setConfig((current) => {
      const providerChanged = patch.providerId !== undefined && patch.providerId !== current.providerId;
      const endpointChanged = patch.baseUrl !== undefined && patch.baseUrl !== current.baseUrl;
      if (providerChanged) {
        return { ...current, apiKey: '', baseUrl: '', model: '', remember: false, ...patch };
      }
      return { ...current, ...patch, ...(endpointChanged ? { apiKey: '', remember: false } : {}) };
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig());
  }, []);

  return { config, updateConfig, resetConfig };
}
