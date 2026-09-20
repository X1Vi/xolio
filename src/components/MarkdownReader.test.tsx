import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MarkdownBook } from '../lib/books';
import { MarkdownReader } from './MarkdownReader';

const book: MarkdownBook = {
  format: 'markdown',
  name: 'notes.md',
  text: '# Title\n\nhello **dark** world\n\nhello again',
};

function renderReader(): void {
  render(
    <MarkdownReader
      book={book}
      highlights={[]}
      jumpRequest={null}
      onSelectionChange={() => undefined}
      onLocationChange={() => undefined}
    />,
  );
}

function openSearch(): HTMLInputElement {
  fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
  return screen.getByLabelText('Search in book');
}

describe('MarkdownReader search', () => {
  it('opens the search bar with Ctrl+F', () => {
    renderReader();
    expect(screen.queryByLabelText('Search in book')).not.toBeInTheDocument();
    const input = openSearch();
    expect(input).toBeInTheDocument();
  });

  it('counts matches across inline elements and paragraphs', () => {
    renderReader();
    const input = openSearch();
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('steps forward and backward through matches', () => {
    renderReader();
    const input = openSearch();
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('reports when nothing matches', () => {
    renderReader();
    const input = openSearch();
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('closes the search bar with Escape', () => {
    renderReader();
    const input = openSearch();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByLabelText('Search in book')).not.toBeInTheDocument();
  });
});
