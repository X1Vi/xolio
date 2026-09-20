import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LibraryEntry } from '../lib/library';
import { Library } from './Library';

const entry: LibraryEntry = {
  id: 'entry-1',
  kind: 'copy',
  name: 'Book.pdf',
  format: 'pdf',
  size: 2048,
  addedAt: 0,
  lastOpenedAt: 0,
  data: new ArrayBuffer(4),
};

function renderLibrary(): void {
  render(
    <Library
      entries={[entry]}
      busy={false}
      error={null}
      canPick={false}
      onOpen={() => undefined}
      onDelete={() => undefined}
      onAddFile={() => undefined}
      onAddViaPicker={() => undefined}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('Library view toggle', () => {
  it('starts in grid view and toggles to list and back', () => {
    renderLibrary();
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('data-view', 'grid');

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(list).toHaveAttribute('data-view', 'list');

    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    expect(list).toHaveAttribute('data-view', 'grid');
  });

  it('remembers the chosen view', () => {
    window.localStorage.setItem('reader-library-view', 'list');
    renderLibrary();
    expect(screen.getByRole('list')).toHaveAttribute('data-view', 'list');
  });
});
