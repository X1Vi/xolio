import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import * as pdfjs from 'pdfjs-dist';
import {
  EventBus,
  FindState,
  PDFFindController,
  PDFLinkService,
  PDFViewer,
} from 'pdfjs-dist/web/pdf_viewer.mjs';
import 'pdfjs-dist/web/pdf_viewer.css';
import { usePageTurnKeys } from '../hooks/usePageTurnKeys';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { contextAroundRange, findAnchoredRange } from '../lib/anchors';
import type { PdfBook } from '../lib/books';
import { applyHighlights } from '../lib/highlight';
import type { Highlight, JumpRequest, ReaderHandle, ReaderLocation, SelectionInfo } from '../lib/marks';
import '../lib/pdf';
import { SearchBar, type SearchStatus } from './SearchBar';

type FindEventType = '' | 'again' | 'highlightallchange';

const USER_HIGHLIGHT = 'reader-user-highlights';
const CONTEXT_LENGTH = 40;

interface PdfReaderProps {
  readonly book: PdfBook;
  readonly highlights: readonly Highlight[];
  readonly jumpRequest: JumpRequest | null;
  readonly onSelectionChange: (selection: SelectionInfo) => void;
  readonly onLocationChange: (location: ReaderLocation) => void;
  readonly ref?: Ref<ReaderHandle> | undefined;
}

function readMatchesCount(event: unknown): { current: number; total: number } | null {
  if (typeof event !== 'object' || event === null) {
    return null;
  }
  const matchesCount = (event as { matchesCount?: unknown }).matchesCount;
  if (typeof matchesCount !== 'object' || matchesCount === null) {
    return null;
  }
  const current = (matchesCount as { current?: unknown }).current;
  const total = (matchesCount as { total?: unknown }).total;
  if (typeof current !== 'number' || typeof total !== 'number') {
    return null;
  }
  return { current, total };
}

function readFindState(event: unknown): number | null {
  if (typeof event !== 'object' || event === null) {
    return null;
  }
  const state = (event as { state?: unknown }).state;
  return typeof state === 'number' ? state : null;
}

export function PdfReader(props: PdfReaderProps) {
  const { book, highlights, jumpRequest, onSelectionChange, onLocationChange, ref } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerElementRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PDFViewer | null>(null);
  const eventBusRef = useRef<EventBus | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightsRef = useRef<readonly Highlight[]>(highlights);
  const numPagesRef = useRef(0);
  const pendingPageRef = useRef<number | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [current, setCurrent] = useState(-1);
  const [total, setTotal] = useState(0);

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

  const paintUserHighlights = useCallback(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const ranges: Range[] = [];
    for (const highlight of highlightsRef.current) {
      if (highlight.location.kind !== 'pdf') {
        continue;
      }
      const pageElement = container.querySelector(
        `.page[data-page-number="${String(highlight.location.page)}"]`,
      );
      if (pageElement === null) {
        continue;
      }
      const range = findAnchoredRange(pageElement, highlight.quote, highlight.prefix, highlight.suffix);
      if (range !== null) {
        ranges.push(range);
      }
    }
    applyHighlights(USER_HIGHLIGHT, ranges);
  }, []);

  useEffect(() => {
    highlightsRef.current = highlights;
    paintUserHighlights();
  }, [highlights, paintUserHighlights]);

  useEffect(() => {
    const container = containerRef.current;
    const viewerElement = viewerElementRef.current;
    if (container === null || viewerElement === null) {
      return;
    }

    let disposed = false;
    const eventBus = new EventBus();
    const linkService = new PDFLinkService({ eventBus });
    const findController = new PDFFindController({ eventBus, linkService });
    const viewer = new PDFViewer({
      container,
      viewer: viewerElement,
      eventBus,
      linkService,
      findController,
      textLayerMode: 1,
      annotationMode: 1,
    });
    linkService.setViewer(viewer);
    eventBusRef.current = eventBus;
    viewerRef.current = viewer;

    const handlePagesInit = (): void => {
      viewer.currentScaleValue = 'page-width';
      const pending = pendingPageRef.current;
      if (pending !== null) {
        viewer.currentPageNumber = pending;
        pendingPageRef.current = null;
      }
    };
    const handlePageChanging = (event: unknown): void => {
      if (typeof event === 'object' && event !== null) {
        const page = (event as { pageNumber?: unknown }).pageNumber;
        if (typeof page === 'number') {
          setPageNumber(page);
        }
      }
    };
    const handleScaleChanging = (event: unknown): void => {
      if (typeof event === 'object' && event !== null) {
        const scale = (event as { scale?: unknown }).scale;
        if (typeof scale === 'number') {
          setZoom(Math.round(scale * 100));
        }
      }
    };
    const handleMatchesCount = (event: unknown): void => {
      const counts = readMatchesCount(event);
      if (counts !== null) {
        setTotal(counts.total);
        setCurrent(counts.current - 1);
      }
    };
    const handleFindState = (event: unknown): void => {
      const state = readFindState(event);
      if (state === FindState.PENDING) {
        setStatus('searching');
      } else if (state === FindState.NOT_FOUND) {
        setStatus('ready');
        setTotal(0);
        setCurrent(-1);
      } else if (state === FindState.FOUND || state === FindState.WRAPPED) {
        setStatus('ready');
      }
      const counts = readMatchesCount(event);
      if (counts !== null) {
        setTotal(counts.total);
        setCurrent(counts.current - 1);
      }
    };

    eventBus.on('pagesinit', handlePagesInit);
    eventBus.on('pagechanging', handlePageChanging);
    eventBus.on('scalechanging', handleScaleChanging);
    eventBus.on('updatefindmatchescount', handleMatchesCount);
    eventBus.on('updatefindcontrolstate', handleFindState);
    eventBus.on('textlayerrendered', paintUserHighlights);

    const loadingTask = pdfjs.getDocument({ data: book.data.slice(0), isEvalSupported: false });
    loadingTask.promise
      .then((pdfDocument) => {
        if (disposed) {
          void pdfDocument.destroy();
          return;
        }
        setNumPages(pdfDocument.numPages);
        viewer.setDocument(pdfDocument);
        linkService.setDocument(pdfDocument, null);
      })
      .catch((cause: unknown) => {
        if (!disposed) {
          setError(cause instanceof Error ? cause.message : 'Could not render this PDF.');
        }
      });

    return () => {
      disposed = true;
      eventBus.off('pagesinit', handlePagesInit);
      eventBus.off('pagechanging', handlePageChanging);
      eventBus.off('scalechanging', handleScaleChanging);
      eventBus.off('updatefindmatchescount', handleMatchesCount);
      eventBus.off('updatefindcontrolstate', handleFindState);
      eventBus.off('textlayerrendered', paintUserHighlights);
      viewer.cleanup();
      viewerRef.current = null;
      eventBusRef.current = null;
      void loadingTask.destroy();
    };
  }, [book, paintUserHighlights]);

  useEffect(() => {
    if (numPages === 0) {
      return;
    }
    onLocationChange({
      kind: 'pdf',
      page: pageNumber,
      label: `Page ${String(pageNumber)} / ${String(numPages)}`,
    });
  }, [pageNumber, numPages, onLocationChange]);

  useEffect(() => {
    numPagesRef.current = numPages;
  }, [numPages]);

  const getLocation = useCallback((): ReaderLocation | null => {
    const viewer = viewerRef.current;
    if (viewer === null || numPagesRef.current === 0) {
      return null;
    }
    const page = viewer.currentPageNumber;
    return { kind: 'pdf', page, label: `Page ${String(page)} / ${String(numPagesRef.current)}` };
  }, []);

  useImperativeHandle(ref, () => ({ getLocation }), [getLocation]);

  useEffect(() => {
    const handler = (): void => {
      const container = containerRef.current;
      const selection = window.getSelection();
      if (container === null || selection === null || selection.isCollapsed) {
        return;
      }
      const anchor = selection.anchorNode;
      const focus = selection.focusNode;
      if (anchor === null || focus === null || !container.contains(anchor) || !container.contains(focus)) {
        return;
      }
      const text = selection.toString().trim();
      if (text === '') {
        return;
      }
      const anchorElement = anchor instanceof Element ? anchor : anchor.parentElement;
      const pageElement = anchorElement?.closest('.page') ?? null;
      const pageAttribute = pageElement?.getAttribute('data-page-number') ?? '';
      const page = Number.parseInt(pageAttribute, 10);
      if (!Number.isFinite(page)) {
        return;
      }
      const range = selection.getRangeAt(0);
      const context = contextAroundRange(range, CONTEXT_LENGTH);
      onSelectionChange({
        text,
        prefix: context.prefix,
        suffix: context.suffix,
        location: { kind: 'pdf', page, label: `Page ${String(page)}` },
      });
    };
    document.addEventListener('selectionchange', handler);
    return () => {
      document.removeEventListener('selectionchange', handler);
    };
  }, [onSelectionChange]);

  useEffect(() => {
    if (jumpRequest?.location.kind !== 'pdf') {
      return;
    }
    const target = Math.min(
      numPages > 0 ? numPages : Number.MAX_SAFE_INTEGER,
      Math.max(1, jumpRequest.location.page),
    );
    pendingPageRef.current = target;
    const viewer = viewerRef.current;
    if (viewer !== null && numPages > 0) {
      viewer.currentPageNumber = target;
      pendingPageRef.current = null;
    }
  }, [jumpRequest, numPages]);

  const dispatchFind = useCallback(
    (type: FindEventType, findPrevious: boolean, searchQuery: string) => {
      eventBusRef.current?.dispatch('find', {
        source: null,
        type,
        query: searchQuery,
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious,
        matchDiacritics: false,
      });
    },
    [],
  );

  const runSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        setSubmitted('');
        setStatus('idle');
        setTotal(0);
        setCurrent(-1);
        eventBusRef.current?.dispatch('findbarclose', { source: null });
        return;
      }
      setSubmitted(trimmed);
      setStatus('searching');
      setTotal(0);
      setCurrent(-1);
      dispatchFind('', false, trimmed);
    },
    [dispatchFind],
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
    setSubmitted('');
    setStatus('idle');
    setTotal(0);
    setCurrent(-1);
    eventBusRef.current?.dispatch('findbarclose', { source: null });
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

  usePageTurnKeys(
    useCallback(() => {
      viewerRef.current?.previousPage();
    }, []),
    useCallback(() => {
      viewerRef.current?.nextPage();
    }, []),
  );

  return (
    <div className="reader-body">
      <div className="reader-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              viewerRef.current?.previousPage();
            }}
            disabled={numPages === 0}
            aria-label="Previous page"
          >
            Prev
          </button>
          <span className="toolbar-label">
            {pageNumber} / {numPages === 0 ? '–' : numPages}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              viewerRef.current?.nextPage();
            }}
            disabled={numPages === 0}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
        <div className="toolbar-group">
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              viewerRef.current?.decreaseScale();
            }}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="toolbar-label">{zoom}%</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              viewerRef.current?.increaseScale();
            }}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              const viewer = viewerRef.current;
              if (viewer !== null) {
                viewer.currentScaleValue = 'page-width';
              }
            }}
          >
            Fit width
          </button>
        </div>
        <div className="toolbar-group toolbar-end">
          <button type="button" className="icon-button" onClick={openSearch}>
            Search
          </button>
        </div>
      </div>

      {error !== null && <div className="reader-error">{error}</div>}
      <div className="pdf-stage">
        <div className="pdf-host" ref={containerRef}>
          <div className="pdfViewer" ref={viewerElementRef} />
        </div>
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
              dispatchFind('again', false, submitted);
            }
          }}
          onNext={() => {
            if (total === 0 || query.trim() !== submitted) {
              runSearch(query);
            } else {
              dispatchFind('again', false, submitted);
            }
          }}
          onPrevious={() => {
            if (total === 0 || query.trim() !== submitted) {
              runSearch(query);
            } else {
              dispatchFind('again', true, submitted);
            }
          }}
          onClose={closeSearch}
        />
      )}
    </div>
  );
}
