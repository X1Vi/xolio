import { APICallError, LoadAPIKeyError } from '@ai-sdk/provider';
import { StreamProviderError } from 'ai';

function messageForStatus(statusCode: number): string {
  if (statusCode === 401) {
    return 'Authentication failed (401). Check the API key for this provider.';
  }
  if (statusCode === 403) {
    return 'Access denied (403). This key may not be allowed to use this model.';
  }
  if (statusCode === 404) {
    return 'Model not found (404). Check the model name in AI settings.';
  }
  if (statusCode === 408 || statusCode === 504) {
    return `The provider timed out (${String(statusCode)}). Try again.`;
  }
  if (statusCode === 429) {
    return 'Rate limited (429). Wait a moment and try again.';
  }
  if (statusCode >= 500) {
    return `Provider error (${String(statusCode)}). Try again shortly.`;
  }
  return `Provider error (${String(statusCode)}). Check your model and endpoint settings.`;
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /failed to fetch|fetch failed|networkerror|load failed|network request failed/i.test(error.message);
}

export function describeAiError(error: unknown): string {
  if (StreamProviderError.isInstance(error)) {
    if (error.statusCode !== undefined) {
      return messageForStatus(error.statusCode);
    }
    return 'The provider could not complete the response. Check your model and endpoint settings.';
  }

  if (APICallError.isInstance(error)) {
    if (error.statusCode !== undefined) {
      return messageForStatus(error.statusCode);
    }
    return 'Could not reach the provider. Check your connection and endpoint settings.';
  }

  if (LoadAPIKeyError.isInstance(error)) {
    return 'Missing API key. Add one in AI settings.';
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return 'Generation stopped.';
  }

  if (isNetworkFailure(error)) {
    return 'Could not reach the provider. Check your internet connection and base URL, and note that some providers block direct browser requests (CORS).';
  }

  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'The provider timed out. Try a shorter question or another model.';
  }

  return 'Something went wrong while contacting the provider.';
}
