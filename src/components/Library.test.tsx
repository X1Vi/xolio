import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
};

const favoriteEntry: LibraryEntry = {
  ...entry,
  id: 'entry-2',
  name: 'Favorite.epub',
  format: 'epub',
  favorite: true,
};

function renderLibrary(
  entries: readonly LibraryEntry[] = [entry],
  onToggleFavorite: (entry: LibraryEntry) => void = () => undefined,
): void {
  render(
    <Library
      entries={entries}
      busy={false}
      error={null}
      canPick={false}
      onOpen={() => undefined}
      onDelete={() => undefined}
      onToggleFavorite={onToggleFavorite}
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

describe('Library favorites', () => {
  it('toggles a book into favorites', () => {
    const onToggleFavorite = vi.fn();
    renderLibrary([entry], onToggleFavorite);

    fireEvent.click(screen.getByRole('button', { name: 'Add Book.pdf to favorites' }));
    expect(onToggleFavorite).toHaveBeenCalledWith(entry);
  });

  it('filters to only favorite books', () => {
    renderLibrary([entry, favoriteEntry]);

    fireEvent.click(screen.getByRole('button', { name: '★ Favorites' }));

    expect(screen.queryByText('Book.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('Favorite.epub')).toBeInTheDocument();
  });

  it('shows an empty state when there are no favorites', () => {
    renderLibrary([entry]);

    fireEvent.click(screen.getByRole('button', { name: '★ Favorites' }));

    expect(screen.getByText(/No favorites yet/)).toBeInTheDocument();
  });
});

describe('LaunchFree listing', () => {
  it('links to the Xolio listing with locally hosted theme badges', () => {
    renderLibrary();

    const link = screen.getByRole('link', { name: 'View Xolio on LaunchFree.io' });
    expect(link).toHaveAttribute('href', 'https://launchfree.io/listings/xolio.html');
    expect(link).toHaveAttribute('target', '_blank');

    const images = link.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', '/badges/launchfree-light.svg');
    expect(images[1]).toHaveAttribute('src', '/badges/launchfree-dark.svg');
  });

  it('starts collapsed and toggles open and closed', () => {
    renderLibrary();
    const expandButton = screen.getByRole('button', { name: 'Expand LaunchFree badge' });
    expect(expandButton).toHaveTextContent('LaunchFree');

    fireEvent.click(expandButton);
    const collapseButton = screen.getByRole('button', { name: 'Collapse LaunchFree badge' });
    expect(collapseButton).toHaveTextContent('−');

    fireEvent.click(collapseButton);
    expect(screen.getByRole('button', { name: 'Expand LaunchFree badge' })).toBeInTheDocument();
  });
});
