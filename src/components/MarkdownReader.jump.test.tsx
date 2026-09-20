import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarkdownBook } from '../lib/books';
import type { ReaderHandle, ReaderLocation } from '../lib/marks';
import { MarkdownReader } from './MarkdownReader';

const book: MarkdownBook = {
  format: 'markdown',
  name: 'notes.md',
  text: '# Title\n\nSome long text here.\n\nMore text.\n',
};

function mockLayout(viewport: HTMLElement): void {
  Object.defineProperty(viewport, 'scrollHeight', { value: 2000, configurable: true });
  Object.defineProperty(viewport, 'clientHeight', { value: 500, configurable: true });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('MarkdownReader bookmark loop', () => {
  it('reports the scroll ratio and jumps back to it', () => {
    vi.useFakeTimers();
    const onLocationChange = vi.fn();
    const { container, rerender } = render(
      <MarkdownReader
        book={book}
        highlights={[]}
        jumpRequest={null}
        onSelectionChange={() => undefined}
        onLocationChange={onLocationChange}
      />,
    );
    const viewport = container.querySelector('.md-viewport');
    expect(viewport).not.toBeNull();
    if (viewport === null || !(viewport instanceof HTMLElement)) {
      throw new Error('viewport missing');
    }
    mockLayout(viewport);

    expect(onLocationChange).toHaveBeenCalledWith({
      kind: 'markdown',
      page: 0,
      label: 'Reading position · 0%',
      scrollRatio: 0,
    } satisfies ReaderLocation);

    viewport.scrollTop = 750;
    fireEvent.scroll(viewport);
    vi.advanceTimersByTime(400);
    expect(onLocationChange).toHaveBeenLastCalledWith({
      kind: 'markdown',
      page: 0,
      label: 'Reading position · 50%',
      scrollRatio: 0.5,
    } satisfies ReaderLocation);

    viewport.scrollTop = 0;
    rerender(
      <MarkdownReader
        book={book}
        highlights={[]}
        jumpRequest={{
          nonce: 1,
          location: {
            kind: 'markdown',
            page: 0,
            label: 'Reading position',
            scrollRatio: 0.5,
          },
        }}
        onSelectionChange={() => undefined}
        onLocationChange={onLocationChange}
      />,
    );
    expect(viewport.scrollTop).toBe(750);
  });

  it('exposes the fresh scroll position through the reader handle', () => {
    const onLocationChange = vi.fn();
    const handleRef: { current: ReaderHandle | null } = { current: null };
    const { container } = render(
      <MarkdownReader
        book={book}
        highlights={[]}
        jumpRequest={null}
        onSelectionChange={() => undefined}
        onLocationChange={onLocationChange}
        ref={handleRef}
      />,
    );
    const viewport = container.querySelector('.md-viewport');
    if (viewport === null || !(viewport instanceof HTMLElement)) {
      throw new Error('viewport missing');
    }
    mockLayout(viewport);
    viewport.scrollTop = 1500;
    expect(handleRef.current?.getLocation()).toEqual({
      kind: 'markdown',
      page: 0,
      label: 'Reading position · 100%',
      scrollRatio: 1,
    } satisfies ReaderLocation);
  });
});
