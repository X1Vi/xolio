import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { contextAroundRange, findAnchoredRange } from '../lib/anchors';
import type { MarkdownBook } from '../lib/books';
import { applyHighlights, clearHighlights } from '../lib/highlight';
import type { Highlight, JumpRequest, ReaderHandle, ReaderLocation, SelectionInfo } from '../lib/marks';
import { warmMarkdown } from '../lib/markdownRenderer';
import {
  computeMarkdownWindow,
  ESTIMATED_PAGE_HEIGHT,
  MAX_WINDOW_PAGES,
  PAGE_OVERSCAN,
  pageOffset,
  paginateMarkdown,
} from '../lib/pagination';
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
  const pendingPageRef = useRef<number | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [current, setCurrent] = useState(-1);
  const [total, setTotal] = useState(0);
  const [range, setRange] = useState({ start: 0, end: MAX_WINDOW_PAGES - 1 });
  const [currentPage, setCurrentPage] = useState(0);
  const [heights, setHeights] = useState<readonly (number | null)[]>([]);
  const [trackedText, setTrackedText] = useState(book.text);
  const [trackedJump, setTrackedJump] = useState(0);

  const pages = useMemo(() => paginateMarkdown(book.text), [book.text]);
  const pageCount = pages.length;
  const virtual = pageCount > MAX_WINDOW_PAGES;

  if (trackedText !== book.text) {
    setTrackedText(book.text);
    setRange({ start: 0, end: MAX_WINDOW_PAGES - 1 });
    setCurrentPage(0);
  }

  if (heights.length !== pageCount) {
    setHeights(new Array<number | null>(pageCount).fill(null));
  }

  const effectiveHeights = useMemo(() => {
    const resolved = new Array<number>(pageCount);
    let measuredTotal = 0;
    let measuredCount = 0;
    for (let index = 0; index < pageCount; index += 1) {
      const height = heights[index];
      if (typeof height === 'number') {
        resolved[index] = height;
        measuredTotal += height;
        measuredCount += 1;
      }
    }
    const estimate = measuredCount > 0 ? measuredTotal / measuredCount : ESTIMATED_PAGE_HEIGHT;
    for (let index = 0; index < pageCount; index += 1) {
      resolved[index] ??= estimate;
    }
    return resolved;
  }, [heights, pageCount]);

  if (
    jumpRequest !== null &&
    jumpRequest.location.kind === 'markdown' &&
    jumpRequest.nonce !== trackedJump
  ) {
    setTrackedJump(jumpRequest.nonce);
    if (virtual) {
      const index = Math.max(0, Math.min(pageCount - 1, jumpRequest.location.page - 1));
      setCurrentPage(index);
      setRange({
        start: Math.max(0, index - PAGE_OVERSCAN),
        end: Math.min(pageCount - 1, index + PAGE_OVERSCAN),
      });
    }
  }

  const windowStart = virtual ? range.start : 0;
  const windowEnd = virtual ? Math.min(range.end, pageCount - 1) : pageCount - 1;

  const pageIndexes = useMemo(() => {
    const result: number[] = [];
    for (let index = windowStart; index <= windowEnd; index += 1) {
      result.push(index);
    }
    return result;
  }, [windowStart, windowEnd]);

  const paddingTop = virtual ? pageOffset(effectiveHeights, windowStart) : 0;
  const paddingBottom = virtual
    ? Math.max(0, pageOffset(effectiveHeights, pageCount) - pageOffset(effectiveHeights, windowEnd + 1))
    : 0;

  const effectiveHeightsRef = useRef<number[]>(effectiveHeights);
  useLayoutEffect(() => {
    effectiveHeightsRef.current = effectiveHeights;
  }, [effectiveHeights]);

  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (viewport === null || !virtual) {
      return;
    }
    const next = computeMarkdownWindow(effectiveHeights, viewport.scrollTop, viewport.clientHeight);
    setRange((current) =>
      current.start === next.start && current.end === next.end
        ? current
        : { start: next.start, end: next.end },
    );
    setCurrentPage((page) => (page === next.firstVisible ? page : next.firstVisible));
  }, [virtual, effectiveHeights]);

  useEffect(() => {
    if (!virtual) {
      return;
    }
    const container = contentRef.current;
    if (container === null || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      setHeights((current) => {
        let changed = false;
        const next = current.slice();
        for (const entry of entries) {
          const element = entry.target;
          if (!(element instanceof HTMLElement)) {
            continue;
          }
          const index = Number(element.dataset['page']);
          if (!Number.isFinite(index)) {
            continue;
          }
          const height = entry.contentRect.height;
          if (height <= 0) {
            continue;
          }
          const previous = next[index];
          if (previous === null || previous === undefined || Math.abs(previous - height) > 1) {
            next[index] = height;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
    for (const element of container.querySelectorAll<HTMLElement>('[data-page]')) {
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [virtual, windowStart, windowEnd]);

  useEffect(() => {
    if (!virtual) {
      return;
    }
    const targets: number[] = [];
    if (windowEnd + 1 < pageCount) {
      targets.push(windowEnd + 1);
    }
    if (windowStart - 1 >= 0) {
      targets.push(windowStart - 1);
    }
    if (targets.length === 0) {
      return;
    }
    const warm = (): void => {
      for (const index of targets) {
        const text = pages[index];
        if (text !== undefined) {
          warmMarkdown(text);
        }
      }
    };
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(warm, { timeout: 1500 });
      return () => {
        window.cancelIdleCallback(handle);
      };
    }
    const timeout = window.setTimeout(warm, 250);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [virtual, windowStart, windowEnd, pageCount, pages]);

  const getLocation = useCallback((): ReaderLocation | null => {
    if (virtual) {
      const page = currentPage + 1;
      return {
        kind: 'markdown',
        page,
        label: `Page ${String(page)} / ${String(pageCount)}`,
      };
    }
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
  }, [virtual, currentPage, pageCount]);

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

  useLayoutEffect(() => {
    if (!virtual) {
      return;
    }
    const viewport = viewportRef.current;
    if (viewport !== null) {
      viewport.scrollTop = 0;
    }
  }, [virtual, book.text]);

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
  }, [highlights, book.text, windowStart, windowEnd]);

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

  useLayoutEffect(() => {
    if (jumpRequest?.location.kind !== 'markdown') {
      return;
    }
    const viewport = viewportRef.current;
    if (viewport === null) {
      return;
    }
    if (virtual) {
      const index = Math.max(0, Math.min(pageCount - 1, jumpRequest.location.page - 1));
      pendingPageRef.current = index;
      viewport.scrollTop = pageOffset(effectiveHeightsRef.current, index);
      return;
    }
    const contentElement = contentRef.current;
    if (contentElement === null) {
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
  }, [jumpRequest, virtual, pageCount]);

  useLayoutEffect(() => {
    const pending = pendingPageRef.current;
    if (!virtual || pending === null) {
      return;
    }
    const viewport = viewportRef.current;
    if (viewport === null) {
      return;
    }
    viewport.scrollTop = pageOffset(effectiveHeights, pending);
    const start = Math.max(0, pending - PAGE_OVERSCAN);
    const end = Math.min(pageCount - 1, pending + PAGE_OVERSCAN);
    let settled = true;
    for (let index = start; index <= end; index += 1) {
      if (heights[index] === null || heights[index] === undefined) {
        settled = false;
        break;
      }
    }
    if (settled) {
      pendingPageRef.current = null;
    }
  }, [effectiveHeights, heights, pageCount, virtual]);

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
          <span className="toolbar-label">
            {virtual ? `Page ${String(currentPage + 1)} / ${String(pageCount)}` : 'Markdown'}
          </span>
        </div>
        <div className="toolbar-group toolbar-end">
          <button type="button" className="icon-button" onClick={openSearch}>
            Search
          </button>
        </div>
      </div>

      <div className="md-viewport" ref={viewportRef} onScroll={handleScroll}>
        <article className="md-content" ref={contentRef}>
          {virtual && <div className="md-spacer" style={{ height: paddingTop }} aria-hidden />}
          {pageIndexes.map((index) => (
            <div key={index} className="md-page" data-page={index}>
              <MarkdownText text={pages[index] ?? ''} cache />
            </div>
          ))}
          {virtual && <div className="md-spacer" style={{ height: paddingBottom }} aria-hidden />}
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
