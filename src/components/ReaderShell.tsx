import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Theme } from '../hooks/useTheme';
import type { Book } from '../lib/books';
import { APP_NAME } from '../version';
import { ErrorBoundary } from './ErrorBoundary';
import { useMarks, type JumpRequest, type ReaderHandle, type ReaderLocation, type SelectionInfo } from '../lib/marks';
import type { MarksJumpTarget } from './MarksPanel';

const PdfReader = lazy(() =>
  import('./PdfReader').then((module) => ({ default: module.PdfReader })),
);
const EpubReader = lazy(() =>
  import('./EpubReader').then((module) => ({ default: module.EpubReader })),
);
const MarkdownReader = lazy(() =>
  import('./MarkdownReader').then((module) => ({ default: module.MarkdownReader })),
);
const AiPanel = lazy(() => import('./AiPanel').then((module) => ({ default: module.AiPanel })));
const MarksPanel = lazy(() =>
  import('./MarksPanel').then((module) => ({ default: module.MarksPanel })),
);

interface ReaderShellProps {
  readonly entryId: string;
  readonly book: Book;
  readonly theme: Theme;
  readonly error: string | null;
  readonly onToggleTheme: () => void;
  readonly onClose: () => void;
  readonly onOpenFile: (file: File) => void;
}

export function ReaderShell(props: ReaderShellProps) {
  const { entryId, book, theme, error, onToggleTheme, onClose, onOpenFile } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<ReaderHandle | null>(null);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [location, setLocation] = useState<ReaderLocation | null>(null);
  const [jumpRequest, setJumpRequest] = useState<JumpRequest | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [marksOpen, setMarksOpen] = useState(false);
  const { marks, addBookmark, addHighlight, removeBookmark, renameBookmark, removeHighlight } =
    useMarks(entryId);

  useEffect(() => {
    document.title = `${book.name} · ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [book.name]);

  const handleSelection = useCallback((next: SelectionInfo) => {
    setSelection(next);
  }, []);

  const handleLocation = useCallback((next: ReaderLocation) => {
    setLocation(next);
  }, []);

  const jumpTo = useCallback((target: MarksJumpTarget) => {
    setJumpRequest((current) => ({
      nonce: (current?.nonce ?? 0) + 1,
      location: target.location,
      ...(target.quote === undefined ? {} : { quote: target.quote }),
    }));
  }, []);

  const markCount = marks.bookmarks.length + marks.highlights.length;
  const currentLocation = location;

  return (
    <div className="app-shell">
      <header className="app-header">
        <button type="button" className="icon-button" onClick={onClose}>
          Library
        </button>
        <h1 className="app-title" title={book.name}>
          {book.name}
        </h1>
        <div className="app-actions">
          <button
            type="button"
            className="icon-button"
            disabled={currentLocation === null}
            onClick={() => {
              const target = readerRef.current?.getLocation() ?? currentLocation;
              if (target !== null) {
                addBookmark(target.label, target);
              }
            }}
          >
            Bookmark
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={selection === null}
            onClick={() => {
              if (selection !== null) {
                addHighlight(selection);
              }
            }}
          >
            Highlight
          </button>
          <button
            type="button"
            className="icon-button"
            aria-expanded={marksOpen}
            onClick={() => {
              setMarksOpen((open) => !open);
            }}
          >
            Marks{markCount > 0 ? ` (${String(markCount)})` : ''}
          </button>
          <button
            type="button"
            className="icon-button ai-toggle"
            disabled={selection === null}
            onClick={() => {
              setAiOpen(true);
            }}
          >
            Ask AI
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            Open
          </button>
          <button type="button" className="icon-button" onClick={onToggleTheme}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".pdf,.epub,.md,.markdown,.mdown"
          onChange={(event) => {
            const file = event.target.files?.item(0) ?? null;
            if (file !== null) {
              onOpenFile(file);
            }
            event.target.value = '';
          }}
        />
      </header>
      {error !== null && <div className="reader-error">{error}</div>}
      <div className="app-body">
        {marksOpen && (
          <Suspense fallback={null}>
            <MarksPanel
              marks={marks}
              onJump={jumpTo}
              onRemoveBookmark={removeBookmark}
              onRenameBookmark={renameBookmark}
              onRemoveHighlight={removeHighlight}
              onClose={() => {
                setMarksOpen(false);
              }}
            />
          </Suspense>
        )}
        <Suspense fallback={<div className="reader-loading">Loading book…</div>}>
          <ErrorBoundary onReset={onClose}>
            {book.format === 'pdf' && (
              <PdfReader
                ref={readerRef}
                book={book}
                highlights={marks.highlights}
                jumpRequest={jumpRequest}
                onSelectionChange={handleSelection}
                onLocationChange={handleLocation}
              />
            )}
            {book.format === 'epub' && (
              <EpubReader
                ref={readerRef}
                book={book}
                theme={theme}
                highlights={marks.highlights}
                jumpRequest={jumpRequest}
                onSelectionChange={handleSelection}
                onLocationChange={handleLocation}
              />
            )}
            {book.format === 'markdown' && (
              <MarkdownReader
                ref={readerRef}
                book={book}
                highlights={marks.highlights}
                jumpRequest={jumpRequest}
                onSelectionChange={handleSelection}
                onLocationChange={handleLocation}
              />
            )}
          </ErrorBoundary>
        </Suspense>
        {aiOpen && selection !== null && (
          <Suspense fallback={null}>
            <AiPanel key={selection.text} selection={selection} onClose={() => { setAiOpen(false); }} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
