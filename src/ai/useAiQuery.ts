import { streamText } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { describeAiError } from './errors';
import { buildSelectionPrompt } from './prompt';
import { createLanguageModel, resolveModelName, resolveReasoningOffOptions } from './providers';
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
        let streamError: unknown = null;
        let receivedText = false;
        let receivedReasoning = false;
        const deepseek =
          config.providerId === 'deepseek' || resolveModelName(config).toLowerCase().includes('deepseek');
        const reasoningOptions = resolveReasoningOffOptions(config);
        const result = streamText({
          model,
          system,
          prompt,
          abortSignal: signal,
          // DeepSeek V4 enables thinking by default and reasoning tokens count against the
          // output budget, so a long passage can finish with no visible answer unless the
          // budget is generous (and reasoning is disabled where the endpoint honours it).
          maxOutputTokens: deepseek ? 32_768 : 2048,
          maxRetries: 0,
          ...(reasoningOptions === undefined ? {} : { providerOptions: reasoningOptions }),
          // Capture callback-only provider errors without logging raw request details.
          onError: ({ error: cause }) => {
            streamError = cause;
          },
        });

        for await (const chunk of result.stream) {
          if (runIdRef.current !== runId) {
            return;
          }
          if (chunk.type === 'error') {
            controller.abort();
            setError(describeAiError(chunk.error));
            setStatus('error');
            return;
          }
          if (chunk.type === 'reasoning-delta') {
            receivedReasoning ||= chunk.text.trim() !== '';
          }
          if (chunk.type === 'text-delta') {
            receivedText ||= chunk.text.trim() !== '';
            setAnswer((current) => current + chunk.text);
          }
        }

        if (signal.aborted && !controller.signal.aborted) {
          signal.throwIfAborted();
        }
        if (runIdRef.current === runId && !controller.signal.aborted && !receivedText) {
          if (streamError !== null) {
            setError(describeAiError(streamError));
            setStatus('error');
            return;
          }
          const finalText = await result.text;
          if (runIdRef.current !== runId) {
            return;
          }
          if (finalText.trim() !== '') {
            setAnswer(finalText);
            receivedText = true;
          } else if (receivedReasoning) {
            setError(
              'The endpoint ran the model in reasoning mode and its thinking used the whole output budget before any answer was written. This endpoint is ignoring the request to turn reasoning off; try another gateway or model.',
            );
            setStatus('error');
            return;
          } else {
            const finishReason = await Promise.resolve(result.finishReason).catch(() => null);
            if (finishReason === 'length') {
              setError(
                'The model used its whole output budget without writing an answer, which can happen when a long passage triggers extended reasoning. Try a shorter selection or another model.',
              );
              setStatus('error');
              return;
            }
          }
        }
        if (runIdRef.current === runId) {
          if (controller.signal.aborted) {
            setStatus('idle');
          } else if (receivedText) {
            setStatus('done');
          } else {
            setError('The provider returned an empty response. Try again or choose another model.');
            setStatus('error');
          }
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
