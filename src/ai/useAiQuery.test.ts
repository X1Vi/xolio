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

function response(stream: AsyncIterable<Record<string, unknown>>): ReturnType<typeof streamText> {
  return { stream } as unknown as ReturnType<typeof streamText>;
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
