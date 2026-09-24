import { beforeEach, describe, expect, it } from 'vitest';
import { defaultConfig, loadStoredConfig, saveStoredConfig, validateConfig } from './settings';

beforeEach(() => {
  window.localStorage.clear();
});

describe('config storage', () => {
  it('does not persist credentials by default', () => {
    expect(defaultConfig().remember).toBe(false);
    saveStoredConfig({ ...defaultConfig(), apiKey: 'test-credential' });
    expect(window.localStorage.getItem('reader-ai-config')).toBeNull();
  });

  it('does not restore a key without explicit persistence consent', () => {
    window.localStorage.setItem('reader-ai-config', JSON.stringify({
      providerId: 'openai', apiKey: 'test-credential',
    }));
    expect(loadStoredConfig()?.apiKey).toBe('');
    expect(loadStoredConfig()?.remember).toBe(false);
  });
  it('persists only non-secret preferences for an encrypted vault', () => {
    const config = {
      providerId: 'openai' as const,
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      baseUrl: '',
      remember: true,
    };
    saveStoredConfig(config);
    expect(window.localStorage.getItem('reader-ai-config')).not.toContain('sk-test');
    expect(loadStoredConfig()).toEqual({ ...config, apiKey: '' });
  });

  it('removes a legacy plaintext key from storage while keeping it for this session', () => {
    window.localStorage.setItem('reader-ai-config', JSON.stringify({
      providerId: 'openai', model: '', apiKey: 'legacy-secret', baseUrl: '', remember: true,
    }));
    expect(loadStoredConfig()).toEqual({
      providerId: 'openai', model: '', apiKey: 'legacy-secret', baseUrl: '', remember: false,
    });
    expect(window.localStorage.getItem('reader-ai-config')).toBeNull();
  });

  it('removes stored data when remember is off', () => {
    saveStoredConfig({ ...defaultConfig(), apiKey: 'sk-test', remember: false });
    expect(loadStoredConfig()).toBeNull();
  });

  it('ignores corrupt data', () => {
    window.localStorage.setItem('reader-ai-config', '{not json');
    expect(loadStoredConfig()).toBeNull();
  });

  it('rejects unknown providers', () => {
    window.localStorage.setItem('reader-ai-config', JSON.stringify({ providerId: 'nope' }));
    expect(loadStoredConfig()).toBeNull();
  });
});

describe('validateConfig', () => {
  it.each([
    'http://example.com/v1', 'javascript:alert(1)', '//example.com/v1',
    ['https://', 'user:password@', 'example.com/v1'].join(''), 'https://example.com/v1?key=secret',
    'https://example.com/v1#secret', 'http://localhost.example.com/v1',
  ])('rejects an unsafe endpoint: %s', (baseUrl) => {
    expect(validateConfig({ ...defaultConfig(), providerId: 'custom', model: 'test', baseUrl })).not.toBeNull();
  });

  it.each(['https://example.com/v1', 'http://localhost:1234/v1', 'http://127.0.0.1:1234/v1', 'http://[::1]:1234/v1'])(
    'accepts secure remote and loopback endpoints: %s', (baseUrl) => {
      expect(validateConfig({ ...defaultConfig(), providerId: 'custom', model: 'test', baseUrl })).toBeNull();
    },
  );
  it('requires an API key for hosted providers', () => {
    expect(validateConfig({ ...defaultConfig(), providerId: 'anthropic' })).toMatch(/API key/);
  });

  it('requires an API key for DeepSeek', () => {
    expect(validateConfig({ ...defaultConfig(), providerId: 'deepseek' })).toMatch(/API key/);
  });

  it('accepts DeepSeek once a key is present, since it has a default base URL', () => {
    const config = { ...defaultConfig(), providerId: 'deepseek' as const, apiKey: 'sk-test' };
    expect(validateConfig(config)).toBeNull();
  });

  it('does not require a key for Ollama', () => {
    expect(validateConfig({ ...defaultConfig(), providerId: 'ollama' })).toBeNull();
  });

  it('requires a base URL for custom endpoints', () => {
    expect(validateConfig({ ...defaultConfig(), providerId: 'custom' })).toMatch(/base URL/i);
  });

  it('requires a model name for custom endpoints once the URL is set', () => {
    const config = {
      ...defaultConfig(),
      providerId: 'custom' as const,
      baseUrl: 'http://localhost:1234/v1',
    };
    expect(validateConfig(config)).toMatch(/model name/i);
  });
});
