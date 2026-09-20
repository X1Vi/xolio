import { useEffect, useMemo, useRef, useState } from 'react';
import type { LibraryEntry } from '../lib/library';
import { APP_NAME, APP_VERSION } from '../version';

type LibraryView = 'grid' | 'list';
type LibraryFilter = 'all' | 'favorites';

const VIEW_STORAGE_KEY = 'reader-library-view';
const FILTER_STORAGE_KEY = 'reader-library-filter';

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
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<LibraryView>(loadView);
  const [filter, setFilter] = useState<LibraryFilter>(loadFilter);

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

  const visibleEntries = useMemo(
    () =>
      filter === 'favorites' && entries !== null
        ? entries.filter((entry) => entry.favorite === true)
        : entries,
    [entries, filter],
  );

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
          <button type="button" className="primary-button" onClick={addBook}>
            Add book
          </button>
        </div>
      </header>

      {error !== null && <p className="landing-error">{error}</p>}

      {entries === null ? (
        <p className="library-empty">Loading library…</p>
      ) : entries.length === 0 ? (
        <div className="library-empty">
          <p>No books yet. Add a PDF, EPUB, or Markdown file, or drop one here.</p>
          {canPick && (
            <p className="ai-hint">
              Files added with “Add book” stay linked to their location on disk when your browser
              supports it; otherwise a copy is stored in this browser.
            </p>
          )}
        </div>
      ) : visibleEntries !== null && visibleEntries.length === 0 ? (
        <div className="library-empty">
          <p>No favorites yet. Open All and tap the star on a book to add it here.</p>
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
    </main>
  );
}
