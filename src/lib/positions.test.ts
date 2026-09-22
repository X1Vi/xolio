import { beforeEach, describe, expect, it } from 'vitest';
import type { MarksBundle } from './marks';
import {
  clearLastBookId,
  clearReadingPosition,
  loadLastBookId,
  loadReadingPosition,
  resolveInitialJump,
  saveLastBookId,
  saveReadingPosition,
} from './positions';

const EMPTY: MarksBundle = { bookmarks: [], highlights: [] };

beforeEach(() => {
  window.localStorage.clear();
});

describe('reading positions', () => {
  it('round-trips the last book id', () => {
    expect(loadLastBookId()).toBeNull();
    saveLastBookId('book-1');
    expect(loadLastBookId()).toBe('book-1');
    clearLastBookId();
    expect(loadLastBookId()).toBeNull();
  });

  it('round-trips a location per book', () => {
    saveReadingPosition('book-1', { kind: 'pdf', page: 12, label: 'Page 12' });
    expect(loadReadingPosition('book-1')).toEqual({ kind: 'pdf', page: 12, label: 'Page 12' });
    expect(loadReadingPosition('book-2')).toBeNull();
    clearReadingPosition('book-1');
    expect(loadReadingPosition('book-1')).toBeNull();
  });

  it('ignores corrupt or unknown location shapes', () => {
    window.localStorage.setItem('reader-position:bad', 'not json');
    expect(loadReadingPosition('bad')).toBeNull();
    window.localStorage.setItem('reader-position:null', JSON.stringify(null));
    expect(loadReadingPosition('null')).toBeNull();
    window.localStorage.setItem(
      'reader-position:shape',
      JSON.stringify({ kind: 'epub', label: 'Chapter' }),
    );
    expect(loadReadingPosition('shape')).toBeNull();
  });

  it('prefers a pinned bookmark over the saved position', () => {
    saveReadingPosition('book-1', { kind: 'pdf', page: 2, label: 'Page 2' });
    const pinned: MarksBundle = {
      bookmarks: [
        {
          id: 'pinned',
          createdAt: 1,
          label: 'Pinned',
          location: { kind: 'pdf', page: 40, label: 'Page 40' },
          pinned: true,
        },
      ],
      highlights: [],
    };
    expect(resolveInitialJump('book-1', pinned)).toEqual({
      nonce: 1,
      location: { kind: 'pdf', page: 40, label: 'Page 40' },
    });
  });

  it('falls back to the saved position when no bookmark is pinned', () => {
    saveReadingPosition('book-1', { kind: 'markdown', page: 0, label: 'Reading position', scrollRatio: 0.5 });
    expect(resolveInitialJump('book-1', EMPTY)).toEqual({
      nonce: 1,
      location: { kind: 'markdown', page: 0, label: 'Reading position', scrollRatio: 0.5 },
    });
    expect(resolveInitialJump('book-2', EMPTY)).toBeNull();
  });
});
