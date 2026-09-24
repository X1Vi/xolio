import { generateText } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testAiConnection } from './connection';
import { createLanguageModel, resolveReasoningOffOptions } from './providers';
import { defaultConfig } from './settings';

vi.mock('ai', () => ({ generateText: vi.fn() }));
vi.mock('./providers', () => ({
  createLanguageModel: vi.fn(),
  resolveReasoningOffOptions: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createLanguageModel).mockResolvedValue({} as never);
  vi.mocked(generateText).mockResolvedValue({ text: 'OK' } as never);
});

describe('testAiConnection', () => {
  it('uses provider-specific reasoning controls and a bounded request', async () => {
    const config = { ...defaultConfig(), providerId: 'deepseek' as const, apiKey: 'test-key' };
    vi.mocked(resolveReasoningOffOptions).mockReturnValue({
      deepseek: { thinking: { type: 'disabled' } },
    });

    await testAiConnection(config);

    expect(createLanguageModel).toHaveBeenCalledWith(config);
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      maxOutputTokens: 128,
      maxRetries: 0,
      providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
    }));
  });

  it('rejects an empty response instead of reporting a false success', async () => {
    vi.mocked(generateText).mockResolvedValue({ text: '   ' } as never);
    await expect(testAiConnection({
      ...defaultConfig(),
      apiKey: 'test-key',
    })).rejects.toThrow(/empty response/i);
  });
});
