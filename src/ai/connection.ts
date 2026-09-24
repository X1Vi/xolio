import { generateText } from 'ai';
import { createLanguageModel, resolveReasoningOffOptions } from './providers';
import type { AiConfig } from './types';

/**
 * Exercise the same model adapter and provider options used by a real reader query.
 * A resolved request with no visible text is not a successful connection.
 */
export async function testAiConnection(config: AiConfig): Promise<void> {
  const model = await createLanguageModel(config);
  const providerOptions = resolveReasoningOffOptions(config);
  const result = await generateText({
    model,
    prompt: 'Reply with the single word: OK',
    maxOutputTokens: 128,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(30_000),
    ...(providerOptions === undefined ? {} : { providerOptions }),
  });

  if (result.text.trim() === '') {
    throw new Error('The provider returned an empty response.');
  }
}
