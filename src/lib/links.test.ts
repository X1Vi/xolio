import { describe, expect, it } from 'vitest';
import { FEEDBACK_URL, feedbackUrl } from './links';

describe('feedbackUrl', () => {
  it('tags the Xolio site and carries the page', () => {
    const url = new URL(feedbackUrl('https://example.test/reader/book-1'));
    expect(url.origin + url.pathname).toBe(FEEDBACK_URL);
    expect(url.searchParams.get('site')).toBe('xolio');
    expect(url.searchParams.get('page')).toBe('https://example.test/reader/book-1');
  });

  it('omits the page when none is available', () => {
    const url = new URL(feedbackUrl(''));
    expect(url.searchParams.has('page')).toBe(false);
  });
});
