import { beforeEach, describe, expect, it } from 'vitest';
import { createBookmark, createHighlight, loadMarks, saveMarks } from './marks';
import { useMarks } from './marks';
import { act, renderHook } from '@testing-library/react';

beforeEach(() => {
  window.localStorage.clear();
});

describe('marks storage', () => {
  it('round-trips multiple bookmarks and highlights', () => {
    const first = createBookmark('Page 1', { kind: 'pdf', page: 1, label: 'Page 1' });
    const second = createBookmark('Page 5', { kind: 'pdf', page: 5, label: 'Page 5' });
    const highlight = createHighlight({
      text: 'quote',
      prefix: 'before ',
      suffix: ' after',
      location: { kind: 'markdown', page: 0, label: 'Reading position', scrollRatio: 0 },
    });
    saveMarks('book-1', { bookmarks: [first, second], highlights: [highlight] });
    expect(loadMarks('book-1')).toEqual({
      bookmarks: [first, second],
      highlights: [highlight],
    });
  });

  it('migrates the old single-bookmark format to a list', () => {
    const only = createBookmark('Old', { kind: 'pdf', page: 2, label: 'Page 2' });
    window.localStorage.setItem(
      'reader-marks:legacy',
      JSON.stringify({ bookmark: only, highlights: [] }),
    );
    expect(loadMarks('legacy').bookmarks).toEqual([only]);
  });

  it('returns empty marks for unknown books', () => {
    expect(loadMarks('missing').bookmarks).toHaveLength(0);
    expect(loadMarks('missing').highlights).toHaveLength(0);
  });

  it('survives corrupt data', () => {
    window.localStorage.setItem('reader-marks:bad', 'not json');
    expect(loadMarks('bad').bookmarks).toHaveLength(0);
  });
});

describe('useMarks bookmarks', () => {
  it('adds, renames, and removes bookmarks', () => {
    const { result } = renderHook(() => useMarks('book-2'));
    act(() => {
      result.current.addBookmark('First', { kind: 'pdf', page: 1, label: 'Page 1' });
    });
    act(() => {
      result.current.addBookmark('Second', { kind: 'pdf', page: 9, label: 'Page 9' });
    });
    expect(result.current.marks.bookmarks).toHaveLength(2);

    const [newest] = result.current.marks.bookmarks;
    if (newest === undefined) {
      throw new Error('expected a bookmark');
    }
    act(() => {
      result.current.renameBookmark(newest.id, '  Renamed  ');
    });
    expect(result.current.marks.bookmarks[0]?.label).toBe('Renamed');

    act(() => {
      result.current.renameBookmark(newest.id, '   ');
    });
    expect(result.current.marks.bookmarks[0]?.label).toBe('Renamed');

    act(() => {
      result.current.removeBookmark(newest.id);
    });
    expect(result.current.marks.bookmarks).toHaveLength(1);
  });
});
