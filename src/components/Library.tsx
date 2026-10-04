import { useEffect, useMemo, useRef, useState } from 'react';
import type { BookFormat } from '../lib/books';
import type { LibraryEntry } from '../lib/library';
import { feedbackUrl } from '../lib/links';
import { APP_NAME, APP_VERSION } from '../version';

type LibraryView = 'grid' | 'list';
type LibraryFilter = 'all' | 'favorites';
type LibrarySort = 'recent' | 'added' | 'title' | 'size';
type LibraryFormatFilter = 'all' | BookFormat;

const VIEW_STORAGE_KEY = 'reader-library-view';
const FILTER_STORAGE_KEY = 'reader-library-filter';
const SORT_STORAGE_KEY = 'reader-library-sort';
const FORMAT_STORAGE_KEY = 'reader-library-format';

const SORT_OPTIONS: readonly { readonly value: LibrarySort; readonly label: string }[] = [
  { value: 'recent', label: 'Recently opened' },
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'size', label: 'Largest first' },
];

const FORMAT_OPTIONS: readonly { readonly value: LibraryFormatFilter; readonly label: string }[] = [
  { value: 'all', label: 'All formats' },
  { value: 'pdf', label: 'PDF' },
  { value: 'epub', label: 'EPUB' },
  { value: 'markdown', label: 'Markdown' },
];

function loadView(): LibraryView {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function loadFilter(): LibraryFilter {
  try {
    return window.localStorage.getItem(FILTER_STORAGE_KEY) === 'favorites' ? 'favorites' : 'all';
  } catch {
    return 'all';
  }
}

function loadSort(): LibrarySort {
  try {
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (stored === 'added' || stored === 'title' || stored === 'size') {
      return stored;
    }
  } catch {
    // storage can be unavailable; fall through to the default order
  }
  return 'recent';
}

function loadFormat(): LibraryFormatFilter {
  try {
    const stored = window.localStorage.getItem(FORMAT_STORAGE_KEY);
    if (stored === 'pdf' || stored === 'epub' || stored === 'markdown') {
      return stored;
    }
  } catch {
    // storage can be unavailable; fall through to all formats
  }
  return 'all';
}

function compareEntries(sort: LibrarySort): (a: LibraryEntry, b: LibraryEntry) => number {
  if (sort === 'title') {
    return (a, b) => a.name.localeCompare(b.name);
  }
  if (sort === 'added') {
    return (a, b) => b.addedAt - a.addedAt;
  }
  if (sort === 'size') {
    return (a, b) => b.size - a.size;
  }
  return (a, b) => b.lastOpenedAt - a.lastOpenedAt;
}

interface LibraryProps {
  readonly entries: readonly LibraryEntry[] | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly canPick: boolean;
  readonly onOpen: (entry: LibraryEntry) => void;
  readonly onDelete: (entry: LibraryEntry) => void;
  readonly onToggleFavorite: (entry: LibraryEntry) => void;
  readonly onAddFile: (file: File) => void;
  readonly onAddViaPicker: () => void;
  readonly onShowFreeBooks: () => void;
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${String(size)} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function Library(props: LibraryProps) {
  const {
    entries,
    busy,
    error,
    canPick,
    onOpen,
    onDelete,
    onToggleFavorite,
    onAddFile,
    onAddViaPicker,
    onShowFreeBooks,
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<LibraryView>(loadView);
  const [filter, setFilter] = useState<LibraryFilter>(loadFilter);
  const [sort, setSort] = useState<LibrarySort>(loadSort);
  const [format, setFormat] = useState<LibraryFormatFilter>(loadFormat);
  const [query, setQuery] = useState('');
  const [endorsementExpanded, setEndorsementExpanded] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // storage can be unavailable; the view still works for this session
    }
  }, [view]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, filter);
    } catch {
      // storage can be unavailable; the filter still works for this session
    }
  }, [filter]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, sort);
    } catch {
      // storage can be unavailable; the sort still works for this session
    }
  }, [sort]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FORMAT_STORAGE_KEY, format);
    } catch {
      // storage can be unavailable; the format filter still works for this session
    }
  }, [format]);

  const visibleEntries = useMemo(() => {
    if (entries === null) {
      return null;
    }
    const term = query.trim().toLowerCase();
    const matching = entries.filter((entry) => {
      if (filter === 'favorites' && entry.favorite !== true) {
        return false;
      }
      if (format !== 'all' && entry.format !== format) {
        return false;
      }
      if (term !== '' && !entry.name.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
    return [...matching].sort(compareEntries(sort));
  }, [entries, filter, format, query, sort]);

  const filtersActive = query.trim() !== '' || format !== 'all';
  const clearFilters = (): void => {
    setQuery('');
    setFormat('all');
  };

  const addBook = (): void => {
    if (canPick) {
      onAddViaPicker();
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <main
      className={dragging ? 'library library-dragging' : 'library'}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => {
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files.item(0);
        if (file !== null) {
          onAddFile(file);
        }
      }}
    >
      <header className="library-header">
        <h1 className="landing-title">{APP_NAME}</h1>
        <span className="library-version" title={`${APP_NAME} version`}>
          v{APP_VERSION}
        </span>
        <div className="library-actions">
          {busy && <span className="library-busy">Working…</span>}
          <div className="view-toggle" role="group" aria-label="Library filter">
            <button
              type="button"
              className="icon-button"
              aria-pressed={filter === 'all'}
              onClick={() => {
                setFilter('all');
              }}
            >
              All
            </button>
            <button
              type="button"
              className="icon-button"
              aria-pressed={filter === 'favorites'}
              onClick={() => {
                setFilter('favorites');
              }}
            >
              ★ Favorites
            </button>
          </div>
          <div className="view-toggle" role="group" aria-label="Library layout">
            <button
              type="button"
              className="icon-button"
              aria-pressed={view === 'grid'}
              onClick={() => {
                setView('grid');
              }}
            >
              Grid
            </button>
            <button
              type="button"
              className="icon-button"
              aria-pressed={view === 'list'}
              onClick={() => {
                setView('list');
              }}
            >
              List
            </button>
          </div>
          <button type="button" className="icon-button" onClick={onShowFreeBooks}>
            Free books
          </button>
          <button type="button" className="primary-button" onClick={addBook}>
            Add book
          </button>
        </div>
      </header>

      <div className="library-tools">
        <label className="library-search-wrap">
          <span className="visually-hidden">Search library</span>
          <input
            className="library-search"
            type="search"
            value={query}
            placeholder="Search your library"
            aria-label="Search library"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
        <label className="library-field">
          <span>Format</span>
          <select
            value={format}
            aria-label="Filter by format"
            onChange={(event) => {
              setFormat(event.target.value as LibraryFormatFilter);
            }}
          >
            {FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="library-field">
          <span>Sort</span>
          <select
            value={sort}
            aria-label="Sort library"
            onChange={(event) => {
              setSort(event.target.value as LibrarySort);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error !== null && <p className="landing-error">{error}</p>}

      {entries === null ? (
        <p className="library-empty">Loading library…</p>
      ) : entries.length === 0 ? (
        <div className="library-empty">
          <p>No books yet. Add a PDF, EPUB, or Markdown file, or drop one here.</p>
          <p className="ai-hint">
            Downloaded a DRM-free EPUB or PDF? Open it here, or use “Open with Xolio” from your
            file manager to import it straight into your library.
          </p>
          <button type="button" className="icon-button" onClick={onShowFreeBooks}>
            Browse free books
          </button>
          {canPick && (
            <p className="ai-hint">
              Files added with “Add book” stay linked to their location on disk when your browser
              supports it; otherwise a copy is stored in this browser.
            </p>
          )}
        </div>
      ) : visibleEntries !== null && visibleEntries.length === 0 ? (
        <div className="library-empty">
          {filter === 'favorites' && !filtersActive ? (
            <p>No favorites yet. Open All and tap the star on a book to add it here.</p>
          ) : (
            <>
              <p>No books match this view.</p>
              <button type="button" className="icon-button" onClick={clearFilters}>
                Clear search and filters
              </button>
            </>
          )}
        </div>
      ) : (
        <ul
          className={view === 'grid' ? 'library-list library-grid' : 'library-list'}
          data-view={view}
        >
          {visibleEntries?.map((entry) => (
            <li key={entry.id} className="library-item">
              <div className="library-item-main">
                <span className={`format-badge format-${entry.format}`}>
                  {entry.format.toUpperCase()}
                </span>
                <div className="library-item-text">
                  <span className="library-item-name" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="library-item-meta">
                    {formatBytes(entry.size)} · opened {formatDate(entry.lastOpenedAt)}
                  </span>
                  <span className="library-item-meta">
                    {entry.kind === 'handle' ? 'linked file' : 'stored copy'}
                  </span>
                </div>
              </div>
              <div className="library-item-actions">
                <button
                  type="button"
                  className="icon-button favorite-button"
                  aria-pressed={entry.favorite === true}
                  aria-label={
                    entry.favorite === true
                      ? `Remove ${entry.name} from favorites`
                      : `Add ${entry.name} to favorites`
                  }
                  title={entry.favorite === true ? 'Remove from favorites' : 'Add to favorites'}
                  disabled={busy}
                  onClick={() => {
                    onToggleFavorite(entry);
                  }}
                >
                  {entry.favorite === true ? '★' : '☆'}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  onClick={() => {
                    onOpen(entry);
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  onClick={() => {
                    onDelete(entry);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".pdf,.epub,.md,.markdown,.mdown"
        onChange={(event) => {
          const file = event.target.files?.item(0) ?? null;
          if (file !== null) {
            onAddFile(file);
          }
          event.target.value = '';
        }}
      />

      <aside
        className={
          endorsementExpanded
            ? 'library-endorsement'
            : 'library-endorsement library-endorsement-collapsed'
        }
        aria-label="Xolio listing"
      >
        <button
          type="button"
          className="endorsement-toggle"
          aria-expanded={endorsementExpanded}
          aria-controls="launchfree-badge"
          aria-label={endorsementExpanded ? 'Collapse LaunchFree badge' : 'Expand LaunchFree badge'}
          title={endorsementExpanded ? 'Collapse' : 'Expand LaunchFree badge'}
          onClick={() => {
            setEndorsementExpanded((expanded) => !expanded);
          }}
        >
          {endorsementExpanded ? '−' : 'LaunchFree'}
        </button>
        <a
          id="launchfree-badge"
          className="launchfree-link"
          href="https://launchfree.io/listings/xolio.html"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Xolio on LaunchFree.io"
        >
          <img
            className="launchfree-badge launchfree-badge-light"
            src="/badges/launchfree-light.svg"
            alt="Listed on The Runway - LaunchFree.io"
            width="250"
            height="56"
          />
          <img
            className="launchfree-badge launchfree-badge-dark"
            src="/badges/launchfree-dark.svg"
            alt=""
            width="250"
            height="56"
            aria-hidden="true"
          />
        </a>
      </aside>

      <footer className="library-footer">
        <span className="library-footer-note">Files and reading data stay on this device.</span>
        <nav className="library-footer-links" aria-label="Xolio links">
          <a
            href="https://product-catalogue.x1vi.workers.dev/?ref=xolio"
            target="_blank"
            rel="noopener noreferrer"
          >
            More from the creator ↗
          </a>
          <a href={feedbackUrl()} target="_blank" rel="noopener noreferrer">
            Send feedback ↗
          </a>
        </nav>
      </footer>
    </main>
  );
}
