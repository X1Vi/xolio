import { useCallback, useEffect, useState } from 'react';
import { PROVIDERS, getPreset, resolveModelName } from './providers';
import type { AiConfig, ProviderId } from './types';
import { clearStoredVault, decryptVault, encryptVault, readStoredVault, storeVault } from './vault';

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
  const baseUrl = record['baseUrl'];
  return {
    providerId,
    model: typeof model === 'string' ? model : '',
    apiKey: '',
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
    const parsedValue = JSON.parse(raw) as unknown;
    const config = parseStoredConfig(parsedValue);
    if (config === null) return null;
    const record = parsedValue as Record<string, unknown>;
    // One-way migration: remove legacy plaintext persistence, but keep the key
    // in memory for this session so the user can save it into the new vault.
    if (record['remember'] === true && typeof record['apiKey'] === 'string' && record['apiKey'] !== '') {
      window.localStorage.removeItem(STORAGE_KEY);
      return { ...config, apiKey: record['apiKey'], remember: false };
    }
    return config;
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      providerId: config.providerId,
      model: config.model,
      baseUrl: config.baseUrl,
      remember: true,
    }));
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
  readonly vaultStatus: 'none' | 'locked' | 'unlocked';
  readonly updateConfig: (patch: Partial<AiConfig>) => void;
  readonly resetConfig: () => void;
  readonly saveToVault: (passphrase: string) => Promise<void>;
  readonly unlockVault: (passphrase: string) => Promise<void>;
  readonly lockVault: () => void;
  readonly forgetVault: () => void;
}

export function useAiConfig(): AiConfigState {
  const [initial] = useState(() => {
    const storedVault = readStoredVault();
    const storedConfig = loadStoredConfig() ?? defaultConfig();
    return {
      config: { ...storedConfig, remember: storedVault !== null },
      vaultStatus: storedVault === null ? 'none' as const : 'locked' as const,
    };
  });
  const [config, setConfig] = useState<AiConfig>(initial.config);
  const [vaultStatus, setVaultStatus] = useState<'none' | 'locked' | 'unlocked'>(initial.vaultStatus);

  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  const updateConfig = useCallback((patch: Partial<AiConfig>) => {
    if (patch.providerId !== undefined || patch.baseUrl !== undefined) {
      clearStoredVault();
      setVaultStatus('none');
    }
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
    clearStoredVault();
    setVaultStatus('none');
    setConfig(defaultConfig());
  }, []);

  const saveToVault = useCallback(async (passphrase: string) => {
    const envelope = await encryptVault(config, passphrase);
    storeVault(envelope);
    setConfig((current) => ({ ...current, remember: true }));
    setVaultStatus('unlocked');
  }, [config]);

  const unlockVault = useCallback(async (passphrase: string) => {
    const envelope = readStoredVault();
    if (envelope === null) throw new Error('No encrypted vault was found on this device.');
    const payload = await decryptVault(envelope, passphrase);
    if (payload.providerId !== config.providerId || payload.baseUrl !== config.baseUrl) {
      throw new Error('The saved key belongs to different provider settings. Reset the vault and try again.');
    }
    setConfig((current) => ({ ...current, apiKey: payload.apiKey, remember: true }));
    setVaultStatus('unlocked');
  }, [config.baseUrl, config.providerId]);

  const lockVault = useCallback(() => {
    setConfig((current) => ({ ...current, apiKey: '', remember: true }));
    setVaultStatus('locked');
  }, []);

  const forgetVault = useCallback(() => {
    clearStoredVault();
    setConfig((current) => ({ ...current, remember: false }));
    setVaultStatus('none');
  }, []);

  return {
    config,
    vaultStatus,
    updateConfig,
    resetConfig,
    saveToVault,
    unlockVault,
    lockVault,
    forgetVault,
  };
}
