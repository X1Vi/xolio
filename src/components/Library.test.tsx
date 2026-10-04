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

const alphaEntry: LibraryEntry = {
  id: 'entry-3',
  kind: 'copy',
  name: 'Alpha.epub',
  format: 'epub',
  size: 100,
  addedAt: 10,
  lastOpenedAt: 30,
};

const betaEntry: LibraryEntry = {
  id: 'entry-4',
  kind: 'copy',
  name: 'Beta.pdf',
  format: 'pdf',
  size: 300,
  addedAt: 30,
  lastOpenedAt: 10,
};

const gammaEntry: LibraryEntry = {
  id: 'entry-5',
  kind: 'copy',
  name: 'Gamma.md',
  format: 'markdown',
  size: 200,
  addedAt: 20,
  lastOpenedAt: 20,
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
      onShowFreeBooks={() => undefined}
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

describe('Library search, format filter, and sort', () => {
  it('sorts by last opened, title, size, and added date', () => {
    renderLibrary([alphaEntry, betaEntry, gammaEntry]);
    const names = (): string[] =>
      screen.getAllByRole('listitem').map((item) => item.textContent);

    expect(names()[0]).toContain('Alpha.epub');
    expect(names()[2]).toContain('Beta.pdf');

    fireEvent.change(screen.getByLabelText('Sort library'), { target: { value: 'title' } });
    expect(names()[0]).toContain('Alpha.epub');
    expect(names()[1]).toContain('Beta.pdf');
    expect(names()[2]).toContain('Gamma.md');

    fireEvent.change(screen.getByLabelText('Sort library'), { target: { value: 'size' } });
    expect(names()[0]).toContain('Beta.pdf');

    fireEvent.change(screen.getByLabelText('Sort library'), { target: { value: 'added' } });
    expect(names()[0]).toContain('Beta.pdf');
  });

  it('filters by format and search text', () => {
    renderLibrary([alphaEntry, betaEntry, gammaEntry]);

    fireEvent.change(screen.getByLabelText('Filter by format'), { target: { value: 'markdown' } });
    expect(screen.getByText('Gamma.md')).toBeInTheDocument();
    expect(screen.queryByText('Beta.pdf')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by format'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search library'), { target: { value: 'beta' } });
    expect(screen.getByText('Beta.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Alpha.epub')).not.toBeInTheDocument();
  });

  it('shows a clearable empty state when nothing matches', () => {
    renderLibrary([alphaEntry]);

    fireEvent.change(screen.getByLabelText('Search library'), { target: { value: 'zzz' } });
    expect(screen.getByText('No books match this view.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(screen.getByText('Alpha.epub')).toBeInTheDocument();
  });

  it('remembers the chosen sort and format', () => {
    window.localStorage.setItem('reader-library-sort', 'title');
    window.localStorage.setItem('reader-library-format', 'pdf');
    renderLibrary([alphaEntry, betaEntry]);

    expect(screen.getByLabelText('Sort library')).toHaveValue('title');
    expect(screen.getByLabelText('Filter by format')).toHaveValue('pdf');
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
