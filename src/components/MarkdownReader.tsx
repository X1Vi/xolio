import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { contextAroundRange, findAnchoredRange } from '../lib/anchors';
import type { MarkdownBook } from '../lib/books';
import { applyHighlights, clearHighlights } from '../lib/highlight';
import type { Highlight, JumpRequest, ReaderHandle, ReaderLocation, SelectionInfo } from '../lib/marks';
import { findTextRanges } from '../lib/textSearch';
import { MarkdownText } from './MarkdownText';
import { SearchBar, type SearchStatus } from './SearchBar';

const ALL_HIGHLIGHT = 'reader-search-all';
const CURRENT_HIGHLIGHT = 'reader-search-current';
const USER_HIGHLIGHT = 'reader-user-highlights';
const CONTEXT_LENGTH = 40;

interface MarkdownReaderProps {
  readonly book: MarkdownBook;
  readonly highlights: readonly Highlight[];
  readonly jumpRequest: JumpRequest | null;
  readonly onSelectionChange: (selection: SelectionInfo) => void;
  readonly onLocationChange: (location: ReaderLocation) => void;
  readonly ref?: Ref<ReaderHandle> | undefined;
}

export function MarkdownReader(props: MarkdownReaderProps) {
  const { book, highlights, jumpRequest, onSelectionChange, onLocationChange, ref } = props;
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rangesRef = useRef<readonly Range[]>([]);
  const indexRef = useRef(-1);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [current, setCurrent] = useState(-1);
  const [total, setTotal] = useState(0);

  const content = useMemo(() => <MarkdownText text={book.text} />, [book.text]);

  const getLocation = useCallback((): ReaderLocation | null => {
    const viewport = viewportRef.current;
    if (viewport === null) {
      return null;
    }
    const maxTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const scrollRatio = maxTop === 0 ? 0 : viewport.scrollTop / maxTop;
    const percent = Math.round(scrollRatio * 100);
    return {
      kind: 'markdown',
      page: 0,
      label: `Reading position · ${String(percent)}%`,
      scrollRatio,
    };
  }, []);

  useImperativeHandle(ref, () => ({ getLocation }), [getLocation]);

  const reportScrollPosition = useCallback(() => {
    const location = getLocation();
    if (location !== null) {
      onLocationChange(location);
    }
  }, [getLocation, onLocationChange]);

  useEffect(() => {
    reportScrollPosition();
  }, [reportScrollPosition, book.text]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) {
      return;
    }
    let timeout = 0;
    const handler = (): void => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(reportScrollPosition, 400);
    };
    viewport.addEventListener('scroll', handler, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', handler);
      window.clearTimeout(timeout);
    };
  }, [reportScrollPosition]);

  useEffect(() => {
    const contentElement = contentRef.current;
    if (contentElement === null) {
      return;
    }
    const ranges: Range[] = [];
    for (const highlight of highlights) {
      if (highlight.location.kind !== 'markdown') {
        continue;
      }
      const range = findAnchoredRange(contentElement, highlight.quote, highlight.prefix, highlight.suffix);
      if (range !== null) {
        ranges.push(range);
      }
    }
    applyHighlights(USER_HIGHLIGHT, ranges);
    return () => {
      clearHighlights(USER_HIGHLIGHT);
    };
  }, [highlights, book.text]);

  useEffect(() => {
    const handler = (): void => {
      const contentElement = contentRef.current;
      const selection = window.getSelection();
      if (contentElement === null || selection === null || selection.isCollapsed) {
        return;
      }
      const anchor = selection.anchorNode;
      const focus = selection.focusNode;
      if (
        anchor === null ||
        focus === null ||
        !contentElement.contains(anchor) ||
        !contentElement.contains(focus)
      ) {
        return;
      }
      const text = selection.toString().trim();
      if (text === '') {
        return;
      }
      const range = selection.getRangeAt(0);
      const context = contextAroundRange(range, CONTEXT_LENGTH);
      const position = getLocation();
      onSelectionChange({
        text,
        prefix: context.prefix,
        suffix: context.suffix,
        location: position ?? { kind: 'markdown', page: 0, label: 'Reading position' },
      });
    };
    document.addEventListener('selectionchange', handler);
    return () => {
      document.removeEventListener('selectionchange', handler);
    };
  }, [getLocation, onSelectionChange]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);
  useSearchShortcut(openSearch);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [searchOpen]);

  const revealRange = useCallback((range: Range) => {
    range.startContainer.parentElement?.scrollIntoView({ block: 'center' });
  }, []);

  const paint = useCallback(
    (ranges: readonly Range[], active: number) => {
      applyHighlights(ALL_HIGHLIGHT, ranges);
      const range = ranges[active];
      applyHighlights(CURRENT_HIGHLIGHT, range ? [range] : []);
      if (range) {
        revealRange(range);
      }
    },
    [revealRange],
  );

  const runSearch = useCallback(
    (value: string) => {
      const contentElement = contentRef.current;
      if (contentElement === null) {
        return;
      }
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        rangesRef.current = [];
        indexRef.current = -1;
        setSubmitted('');
        setStatus('idle');
        setCurrent(-1);
        setTotal(0);
        clearHighlights(ALL_HIGHLIGHT);
        clearHighlights(CURRENT_HIGHLIGHT);
        return;
      }
      const ranges = findTextRanges(contentElement, trimmed);
      rangesRef.current = ranges;
      indexRef.current = ranges.length > 0 ? 0 : -1;
      setSubmitted(trimmed);
      setStatus('ready');
      setCurrent(ranges.length > 0 ? 0 : -1);
      setTotal(ranges.length);
      paint(ranges, 0);
    },
    [paint],
  );

  const go = useCallback(
    (delta: number) => {
      const ranges = rangesRef.current;
      if (ranges.length === 0) {
        return;
      }
      const base = indexRef.current < 0 ? 0 : indexRef.current;
      const next = (base + delta + ranges.length) % ranges.length;
      indexRef.current = next;
      setCurrent(next);
      paint(ranges, next);
    },
    [paint],
  );

  const closeSearch = useCallback(() => {
    rangesRef.current = [];
    indexRef.current = -1;
    setSearchOpen(false);
    setQuery('');
    setSubmitted('');
    setStatus('idle');
    setCurrent(-1);
    setTotal(0);
    clearHighlights(ALL_HIGHLIGHT);
    clearHighlights(CURRENT_HIGHLIGHT);
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    if (jumpRequest?.location.kind !== 'markdown') {
      return;
    }
    const contentElement = contentRef.current;
    const viewport = viewportRef.current;
    if (contentElement === null || viewport === null) {
      return;
    }
    if (jumpRequest.quote !== undefined) {
      const range = findAnchoredRange(contentElement, jumpRequest.quote, '', '');
      range?.startContainer.parentElement?.scrollIntoView({ block: 'center' });
      return;
    }
    const ratio = jumpRequest.location.scrollRatio ?? 0;
    const maxTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    viewport.scrollTop = ratio * maxTop;
  }, [jumpRequest]);

  useEffect(
    () => () => {
      clearHighlights(ALL_HIGHLIGHT);
      clearHighlights(CURRENT_HIGHLIGHT);
      clearHighlights(USER_HIGHLIGHT);
    },
    [],
  );

  return (
    <div className="reader-body">
      <div className="reader-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Markdown</span>
        </div>
        <div className="toolbar-group toolbar-end">
          <button type="button" className="icon-button" onClick={openSearch}>
            Search
          </button>
        </div>
      </div>

      <div className="md-viewport" ref={viewportRef}>
        <article className="md-content" ref={contentRef}>
          {content}
        </article>
      </div>

      {searchOpen && (
        <SearchBar
          query={query}
          status={status}
          current={current}
          total={total}
          inputRef={inputRef}
          onQueryChange={setQuery}
          onSubmit={() => {
            if (query.trim() !== submitted) {
              runSearch(query);
            } else {
              go(1);
            }
          }}
          onNext={() => {
            go(1);
          }}
          onPrevious={() => {
            if (rangesRef.current.length === 0) {
              runSearch(query);
            } else {
              go(-1);
            }
          }}
          onClose={closeSearch}
        />
      )}
    </div>
  );
}
