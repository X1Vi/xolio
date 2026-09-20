import { StreamProviderError } from 'ai';
import { describe, expect, it } from 'vitest';
import { describeAiError } from './errors';

describe('describeAiError', () => {
  it('explains authentication failures', () => {
    const error = new StreamProviderError({
      message: 'unauthorized',
      statusCode: 401,
      isRetryable: false,
    });
    expect(describeAiError(error)).toMatch(/401/);
  });

  it('explains rate limits', () => {
    const error = new StreamProviderError({
      message: 'slow down',
      statusCode: 429,
      isRetryable: true,
    });
    expect(describeAiError(error)).toMatch(/Rate limited/);
  });

  it('explains provider outages', () => {
    const error = new StreamProviderError({
      message: 'bad gateway',
      statusCode: 502,
      isRetryable: true,
    });
    expect(describeAiError(error)).toMatch(/Provider error \(502\)/);
  });

  it('explains network failures', () => {
    expect(describeAiError(new TypeError('Failed to fetch'))).toMatch(/Could not reach/);
  });

  it('reports aborts', () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    expect(describeAiError(abort)).toMatch(/stopped/);
  });

  it('does not echo unknown errors that may contain keys or private passages', () => {
    expect(describeAiError(new Error('private passage and credential'))).toBe(
      'Something went wrong while contacting the provider.',
    );
  });

  it('does not echo provider response details', () => {
    const error = new StreamProviderError({
      message: 'private passage and credential',
      statusCode: 400,
      isRetryable: false,
    });
    expect(describeAiError(error)).toContain('400');
    expect(describeAiError(error)).not.toContain('private passage');
  });

  it('handles unknown values', () => {
    expect(describeAiError('nope')).toMatch(/Something went wrong/);
  });
});
