import { describe, expect, it } from 'vitest';
import {
  PROVIDERS,
  createLanguageModel,
  getPreset,
  resolveBaseUrl,
  resolveModelName,
} from './providers';
import { defaultConfig } from './settings';
import type { ProviderId } from './types';

const expectedProviders: Record<ProviderId, string> = {
  openai: 'openai.responses',
  anthropic: 'anthropic.messages',
  google: 'google.generative-ai',
  deepseek: 'deepseek.chat',
  openrouter: 'openrouter.chat',
  groq: 'groq.chat',
  ollama: 'ollama.chat',
  custom: 'custom.chat',
};

describe('AI provider adapters', () => {
  it.each(PROVIDERS.map((preset) => [preset.id, preset.defaultModel] as const))(
    'constructs the %s adapter with its configured model',
    async (providerId, defaultModel) => {
      const custom = providerId === 'custom';
      const config = {
        ...defaultConfig(),
        providerId,
        apiKey: 'test-key',
        ...(custom ? { model: 'test-model', baseUrl: 'https://example.com/v1' } : {}),
      };
      const model = await createLanguageModel(config);
      const adapter = model as unknown as { readonly provider: string; readonly modelId: string };

      expect(adapter.provider).toBe(expectedProviders[providerId]);
      expect(adapter.modelId).toBe(custom ? 'test-model' : defaultModel);
    },
  );

  it('keeps every hosted compatible provider on the expected HTTPS API base', () => {
    for (const providerId of ['deepseek', 'openrouter', 'groq'] as const) {
      const config = { ...defaultConfig(), providerId };
      expect(resolveBaseUrl(config)).toMatch(/^https:\/\//);
      expect(resolveModelName(config)).toBe(getPreset(providerId).defaultModel);
    }
  });
});
