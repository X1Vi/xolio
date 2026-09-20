import { streamText } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { describeAiError } from './errors';
import { buildSelectionPrompt } from './prompt';
import { createLanguageModel } from './providers';
import type { AiConfig } from './types';
import { validateConfig } from './settings';

export type AiStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface AiQueryState {
  readonly answer: string;
  readonly status: AiStatus;
  readonly error: string | null;
  readonly ask: (selection: string, instructions: string, question: string) => Promise<void>;
  readonly stop: () => void;
  readonly clear: () => void;
}

export function useAiQuery(config: AiConfig): AiQueryState {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<AiStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => () => {
    abortRef.current?.abort();
    runIdRef.current += 1;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    runIdRef.current += 1;
    setAnswer('');
    setStatus('idle');
    setError(null);
  }, []);

  const ask = useCallback(
    async (selection: string, instructions: string, question: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      runIdRef.current += 1;
      const runId = runIdRef.current;

      setAnswer('');
      setError(null);
      setStatus('streaming');

      try {
        const validation = validateConfig(config);
        if (validation !== null) {
          setError(validation);
          setStatus('error');
          return;
        }
        const model = await createLanguageModel(config);
        controller.signal.throwIfAborted();
        if (runIdRef.current !== runId) return;
        const { system, prompt } = buildSelectionPrompt({ selection, instructions, question });
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]);
        const result = streamText({
          model,
          system,
          prompt,
          abortSignal: signal,
          maxOutputTokens: 2048,
          maxRetries: 0,
          // Handle error events below; the SDK's default handler logs raw request details.
          onError: () => undefined,
        });

        for await (const chunk of result.stream) {
          if (runIdRef.current !== runId) {
            return;
          }
          if (chunk.type === 'error') {
            setError(describeAiError(chunk.error));
            setStatus('error');
            return;
          }
          if (chunk.type === 'text-delta') {
            setAnswer((current) => current + chunk.text);
          }
        }

        if (signal.aborted && !controller.signal.aborted) {
          signal.throwIfAborted();
        }
        if (runIdRef.current === runId) {
          setStatus(controller.signal.aborted ? 'idle' : 'done');
        }
      } catch (cause) {
        if (runIdRef.current !== runId) {
          return;
        }
        if (controller.signal.aborted) {
          setStatus('idle');
          return;
        }
        setError(describeAiError(cause));
        setStatus('error');
      }
    },
    [config],
  );

  return { answer, status, error, ask, stop, clear };
}
