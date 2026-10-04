import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FreeBooksPanel } from './FreeBooksPanel';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FreeBooksPanel', () => {
  it('downloads a book and hands the EPUB to the importer', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response('epub', {
        status: 200,
        headers: { 'Content-Type': 'application/epub+zip' },
      })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onImport = vi.fn<(file: File) => void>();
    render(<FreeBooksPanel onImport={onImport} onClose={() => undefined} />);

    const [first] = screen.getAllByRole('button', { name: 'Read in Xolio' });
    if (first === undefined) throw new Error('missing get button');
    fireEvent.click(first);

    await waitFor(
      () => {
        expect(onImport).toHaveBeenCalledOnce();
      },
      { timeout: 3000 },
    );
    const file = onImport.mock.calls[0]?.[0];
    expect(file?.type).toBe('application/epub+zip');
  }, 10000);

  it('filters the catalogue by search', () => {
    render(<FreeBooksPanel onImport={() => undefined} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Search free books'), {
      target: { value: 'gitanjali' },
    });
    expect(screen.getByText('Gitanjali')).toBeInTheDocument();
    expect(screen.queryByText('Dracula')).not.toBeInTheDocument();
  });

  it('filters the catalogue by shelf', () => {
    render(<FreeBooksPanel onImport={() => undefined} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sci-Fi' }));

    expect(screen.getByText('Frankenstein')).toBeInTheDocument();
    expect(screen.queryByText('Gitanjali')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Horror' }));
    expect(screen.getByText('Dracula')).toBeInTheDocument();
    expect(screen.getByText('The Yellow Wallpaper')).toBeInTheDocument();
  });

  it('sorts the catalogue by title and author', () => {
    render(<FreeBooksPanel onImport={() => undefined} onClose={() => undefined} />);
    const firstTitle = (): string => screen.getAllByRole('listitem')[0]?.textContent ?? '';

    fireEvent.change(screen.getByLabelText('Sort free books'), { target: { value: 'author' } });
    expect(firstTitle()).toContain("Aesop's Fables");

    fireEvent.change(screen.getByLabelText('Sort free books'), { target: { value: 'title' } });
    expect(firstTitle()).toContain('A Christmas Carol');
  });

  it('shows a fallback link when a download fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('nope', { status: 500 }))),
    );
    render(<FreeBooksPanel onImport={() => undefined} onClose={() => undefined} />);

    const [first] = screen.getAllByRole('button', { name: 'Read in Xolio' });
    if (first === undefined) throw new Error('missing get button');
    fireEvent.click(first);

    await waitFor(
      () => {
        expect(screen.getByText(/Couldn’t add it automatically/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByRole('link', { name: 'Download the EPUB' })).toBeInTheDocument();
  }, 10000);
});
