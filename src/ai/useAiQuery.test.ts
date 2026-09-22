import { act, renderHook } from '@testing-library/react';
import { streamText } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLanguageModel } from './providers';
import { defaultConfig } from './settings';
import { useAiQuery } from './useAiQuery';

vi.mock('ai', async (importOriginal) => ({
  ...await importOriginal<typeof import('ai')>(),
  streamText: vi.fn(),
}));
vi.mock('./providers', async (importOriginal) => ({
  ...await importOriginal<typeof import('./providers')>(),
  createLanguageModel: vi.fn(),
}));

const config = { ...defaultConfig(), apiKey: 'test-credential' };

function response(
  stream: AsyncIterable<Record<string, unknown>>,
  text = '',
  finishReason = 'stop',
): ReturnType<typeof streamText> {
  return {
    stream,
    text: Promise.resolve(text),
    finishReason: Promise.resolve(finishReason),
  } as unknown as ReturnType<typeof streamText>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAiQuery', () => {
  it('streams text and finishes successfully', async () => {
    vi.mocked(streamText).mockReturnValue(response((async function* () {
      await Promise.resolve();
      yield { type: 'text-delta', text: 'Hello ' };
      yield { type: 'text-delta', text: 'reader' };
    })()));
    const { result } = renderHook(() => useAiQuery(config));
    await act(async () => { await result.current.ask('passage', 'explain', ''); });
    expect(result.current.answer).toBe('Hello reader');
    expect(result.current.status).toBe('done');
  });

  it('disables DeepSeek thinking so the token budget produces visible answer text', async () => {
    vi.mocked(streamText).mockReturnValue(response((async function* () {
      await Promise.resolve();
      yield { type: 'text-delta', text: 'Simplified' };
    })()));
    const deepseekConfig = { ...config, providerId: 'deepseek' as const };
    const { result } = renderHook(() => useAiQuery(deepseekConfig));
    await act(async () => { await result.current.ask('passage', 'simplify', ''); });
    expect(vi.mocked(streamText).mock.calls[0]?.[0].providerOptions).toEqual({
      deepseek: { thinking: { type: 'disabled' } },
    });
    expect(vi.mocked(streamText).mock.calls[0]?.[0].maxOutputTokens).toBe(32768);
    expect(result.current.answer).toBe('Simplified');
  });

  it('uses the OpenRouter reasoning switch when the DeepSeek preset points at OpenRouter', async () => {
    vi.mocked(streamText).mockReturnValue(response((async function* () {
      await Promise.resolve();
      yield { type: 'text-delta', text: 'Simplified' };
    })()));
    const deepseekConfig = {
      ...config,
      providerId: 'deepseek' as const,
      baseUrl: 'https://openrouter.ai/api/v1',
    };
    const { result } = renderHook(() => useAiQuery(deepseekConfig));
    await act(async () => { await result.current.ask('passage', 'simplify', ''); });
    expect(vi.mocked(streamText).mock.calls[0]?.[0].providerOptions).toEqual({
      deepseek: { reasoning: { enabled: false } },
    });
    expect(result.current.answer).toBe('Simplified');
  });

  it('handles a stream error without presenting raw request details or marking success', async () => {
    vi.mocked(streamText).mockReturnValue(response((async function* () {
      await Promise.resolve();
      yield { type: 'error', error: new Error('private passage and credential') };
    })()));
    const { result } = renderHook(() => useAiQuery(config));
    await act(async () => { await result.current.ask('passage', 'explain', ''); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).not.toContain('private passage');
    const options = vi.mocked(streamText).mock.calls[0]?.[0];
    expect(options?.onError).toBeTypeOf('function');
    expect(options?.maxRetries).toBe(0);
  });

  it('uses the completed text when a provider emits no text-delta chunks', async () => {
    vi.mocked(streamText).mockReturnValue(response((async function* () {
      await Promise.resolve();
      yield { type: 'finish' };
    })(), 'Fallback answer'));
    const { result } = renderHook(() => useAiQuery(config));
    await act(async () => { await result.current.ask('passage', 'simplify', ''); });
    expect(result.current.answer).toBe('Fallback answer');
    expect(result.current.status).toBe('done');
  });

  it('reports an empty provider response instead of finishing with a blank answer', async () => {
    vi.mocked(streamText).mockReturnValue(response((async function* () {
      await Promise.resolve();
      yield { type: 'finish' };
    })()));
    const { result } = renderHook(() => useAiQuery(config));
    await act(async () => { await result.current.ask('passage', 'simplify', ''); });
    expect(result.current.answer).toBe('');
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/empty response/i);
  });

  it('explains when the model exhausts its output budget without answering', async () => {
    vi.mocked(streamText).mockReturnValue(response((async function* () {
      await Promise.resolve();
      yield { type: 'finish' };
    })(), '', 'length'));
    const { result } = renderHook(() => useAiQuery(config));
    await act(async () => { await result.current.ask('long passage', 'summarize', ''); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/output budget/i);
  });

  it('names reasoning mode when an endpoint ignores the reasoning-off request', async () => {
    vi.mocked(streamText).mockReturnValue(response((async function* () {
      await Promise.resolve();
      yield { type: 'reasoning-delta', text: 'Thinking at length…' };
      yield { type: 'finish' };
    })(), '', 'length'));
    const deepseekConfig = { ...config, providerId: 'deepseek' as const };
    const { result } = renderHook(() => useAiQuery(deepseekConfig));
    await act(async () => { await result.current.ask('passage', 'simplify', ''); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/reasoning mode/i);
  });

  it('does not contact a provider with invalid settings', async () => {
    const { result } = renderHook(() => useAiQuery(defaultConfig()));
    await act(async () => { await result.current.ask('passage', 'explain', ''); });
    expect(result.current.status).toBe('error');
    expect(createLanguageModel).not.toHaveBeenCalled();
  });

  it('aborts an active request when the panel unmounts', async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(streamText).mockImplementation((options) => {
      signal = options.abortSignal;
      return response((async function* () {
        yield { type: 'text-delta', text: 'Starting' };
        await new Promise<void>((resolve) => {
          options.abortSignal?.addEventListener('abort', () => { resolve(); }, { once: true });
        });
      })());
    });
    const { result, unmount } = renderHook(() => useAiQuery(config));
    let completion: Promise<void> | undefined;
    await act(async () => {
      completion = result.current.ask('passage', 'explain', '');
      await Promise.resolve();
    });
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    await completion;
  });
});
