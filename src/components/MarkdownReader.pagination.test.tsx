import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MarkdownBook } from '../lib/books';
import type { ReaderHandle } from '../lib/marks';
import { MarkdownReader } from './MarkdownReader';

function buildLargeText(sections: number): string {
  return Array.from(
    { length: sections },
    (_, index) => `## Section ${String(index)}\n\n${'word '.repeat(40)}\n`,
  ).join('\n');
}

const largeBook: MarkdownBook = {
  format: 'markdown',
  name: 'big.md',
  text: buildLargeText(2000),
};

function renderedSections(): number[] {
  return Array.from(document.querySelectorAll('h2'))
    .map((heading) => /Section (\d+)/.exec(heading.textContent))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => Number(match[1]));
}

function mockViewport(container: HTMLElement, clientHeight = 800): HTMLElement {
  const viewport = container.querySelector('.md-viewport');
  if (!(viewport instanceof HTMLElement)) {
    throw new Error('viewport missing');
  }
  Object.defineProperty(viewport, 'clientHeight', { value: clientHeight, configurable: true });
  return viewport;
}

function renderReader(book: MarkdownBook = largeBook): {
  onLocationChange: ReturnType<typeof vi.fn>;
  handle: { current: ReaderHandle | null };
  container: HTMLElement;
} {
  const onLocationChange = vi.fn();
  const handle: { current: ReaderHandle | null } = { current: null };
  const { container } = render(
    <MarkdownReader
      book={book}
      highlights={[]}
      jumpRequest={null}
      onSelectionChange={() => undefined}
      onLocationChange={onLocationChange}
      ref={handle}
    />,
  );
  return { onLocationChange, handle, container };
}

describe('MarkdownReader virtual scrolling', () => {
  it('renders only a window of pages for large documents', () => {
    renderReader();
    const sections = renderedSections();
    expect(sections).toContain(0);
    expect(sections.length).toBeLessThan(700);
    expect(sections).not.toContain(1999);
    expect(screen.getByText(/Page 1 \/ \d+/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('renders later pages and dumps earlier ones when scrolling down', () => {
    const { container } = renderReader();
    const viewport = mockViewport(container);
    viewport.scrollTop = 10_000;
    fireEvent.scroll(viewport);

    const sections = renderedSections();
    expect(sections).not.toContain(0);
    expect(sections.length).toBeGreaterThan(0);
    expect(Math.min(...sections)).toBeGreaterThan(0);
    expect(sections).not.toContain(1999);
  });

  it('renders earlier pages and dumps later ones when scrolling up', () => {
    const { container } = renderReader();
    const viewport = mockViewport(container);
    viewport.scrollTop = 20_000;
    fireEvent.scroll(viewport);
    expect(renderedSections()).not.toContain(0);

    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    const sections = renderedSections();
    expect(sections).toContain(0);
    expect(sections.length).toBeLessThan(700);
  });

  it('reports a page-based reading location while scrolling', () => {
    const { container, handle } = renderReader();
    const viewport = mockViewport(container);
    viewport.scrollTop = 10_000;
    fireEvent.scroll(viewport);

    expect(screen.getByText(/Page 14 \/ \d+/)).toBeInTheDocument();
    expect(handle.current?.getLocation()).toEqual(
      expect.objectContaining({ kind: 'markdown', page: 14 }),
    );
  });

  it('keeps small documents on the scroll layout without page labels', () => {
    renderReader({ format: 'markdown', name: 'small.md', text: '# Title\n\nbody' });
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.queryByText(/Page \d+ \/ \d+/)).not.toBeInTheDocument();
  });
});
