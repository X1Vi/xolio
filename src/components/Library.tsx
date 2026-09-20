import { useEffect, useRef, useState } from 'react';
import type { LibraryEntry } from '../lib/library';
import { APP_NAME, APP_VERSION } from '../version';

type LibraryView = 'grid' | 'list';

const VIEW_STORAGE_KEY = 'reader-library-view';

function loadView(): LibraryView {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

interface LibraryProps {
  readonly entries: readonly LibraryEntry[] | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly canPick: boolean;
  readonly onOpen: (entry: LibraryEntry) => void;
  readonly onDelete: (entry: LibraryEntry) => void;
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
  const { entries, busy, error, canPick, onOpen, onDelete, onAddFile, onAddViaPicker } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<LibraryView>(loadView);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // storage can be unavailable; the view still works for this session
    }
  }, [view]);

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
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            Add from file
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
      ) : (
        <ul
          className={view === 'grid' ? 'library-list library-grid' : 'library-list'}
          data-view={view}
        >
          {entries.map((entry) => (
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
