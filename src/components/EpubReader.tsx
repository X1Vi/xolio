import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { usePageTurnKeys } from '../hooks/usePageTurnKeys';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import type { EpubBookSource } from '../lib/books';
import {
  openEpub,
  type EpubBookHandle,
  type EpubContents,
  type EpubLocation,
  type EpubNavItem,
  type EpubRendition,
} from '../lib/epub';
import type { Highlight, JumpRequest, ReaderHandle, ReaderLocation, SelectionInfo } from '../lib/marks';
import { findTextRanges } from '../lib/textSearch';
import { SearchBar, type SearchStatus } from './SearchBar';
import type { Theme } from '../hooks/useTheme';

const HIGHLIGHT_ALL: Record<string, string> = {
  fill: 'rgba(255, 213, 0, 0.45)',
  'fill-opacity': '1',
  'mix-blend-mode': 'multiply',
};

const HIGHLIGHT_ACTIVE: Record<string, string> = {
  fill: 'rgba(255, 111, 0, 0.7)',
  'fill-opacity': '1',
  'mix-blend-mode': 'multiply',
};

const USER_HIGHLIGHT_STYLES: Record<string, string> = {
  fill: 'rgba(80, 200, 120, 0.45)',
  'fill-opacity': '1',
  'mix-blend-mode': 'multiply',
};

interface SearchHit {
  readonly cfi: string;
}

interface TocOption {
  readonly href: string;
  readonly label: string;
  readonly depth: number;
}

function flattenToc(items: readonly EpubNavItem[], depth = 0): TocOption[] {
  const options: TocOption[] = [];
  for (const item of items) {
    options.push({ href: item.href, label: item.label, depth });
    if (item.subitems !== undefined) {
      options.push(...flattenToc(item.subitems, depth + 1));
    }
  }
  return options;
}

function themeStyles(theme: Theme): Record<string, Record<string, string>> {
  const dark = theme === 'dark';
  return {
    body: {
      background: dark ? '#1b1d22' : '#ffffff',
      color: dark ? '#e8e8ea' : '#1b1b1f',
      'line-height': '1.6',
      padding: '0 6%',
    },
    'p, li, blockquote': {
      'line-height': 'inherit',
    },
    a: {
      color: dark ? '#9db7ff' : '#2f6fed',
    },
  };
}

function clearHitHighlights(rendition: EpubRendition, hits: readonly SearchHit[]): void {
  for (const hit of hits) {
    rendition.annotations.remove(hit.cfi, 'highlight');
  }
}

interface EpubReaderProps {
  readonly book: EpubBookSource;
  readonly theme: Theme;
  readonly highlights: readonly Highlight[];
  readonly jumpRequest: JumpRequest | null;
  readonly onSelectionChange: (selection: SelectionInfo) => void;
  readonly onLocationChange: (location: ReaderLocation) => void;
  readonly ref?: Ref<ReaderHandle> | undefined;
}

export function EpubReader(props: EpubReaderProps) {
  const { book, theme, highlights, jumpRequest, onSelectionChange, onLocationChange, ref } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bookRef = useRef<EpubBookHandle | null>(null);
  const renditionRef = useRef<EpubRendition | null>(null);
  const hitsRef = useRef<readonly SearchHit[]>([]);
  const activeIndexRef = useRef(-1);
  const searchTokenRef = useRef(0);
  const themeRef = useRef(theme);
  const currentHrefRef = useRef('');
  const userAnnotationCfisRef = useRef<readonly string[]>([]);
  const lastLocationRef = useRef<ReaderLocation | null>(null);

  const getLocation = useCallback((): ReaderLocation | null => lastLocationRef.current, []);

  useImperativeHandle(ref, () => ({ getLocation }), [getLocation]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [current, setCurrent] = useState(-1);
  const [total, setTotal] = useState(0);
  const [toc, setToc] = useState<readonly TocOption[]>([]);
  const [currentHref, setCurrentHref] = useState('');

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

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }
    let disposed = false;
    const epubBook = openEpub(book.data);
    const rendition = epubBook.renderTo(host, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none',
      allowScriptedContent: false,
    });
    bookRef.current = epubBook;
    renditionRef.current = rendition;
    rendition.themes.default(themeStyles(themeRef.current));

    rendition.hooks.content.register((contents: EpubContents) => {
      contents.document.addEventListener('keydown', (event: KeyboardEvent) => {
        const withModifier = event.ctrlKey || event.metaKey;
        if (withModifier && event.key.toLowerCase() === 'f') {
          event.preventDefault();
          setSearchOpen(true);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          void rendition.prev();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          void rendition.next();
        } else if (event.key === 'Escape') {
          setSearchOpen(false);
        }
      });

      let wheelLocked = false;
      contents.document.addEventListener(
        'wheel',
        (event: WheelEvent) => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || Math.abs(event.deltaY) < 4) {
            return;
          }
          event.preventDefault();
          if (wheelLocked) {
            return;
          }
          wheelLocked = true;
          window.setTimeout(() => {
            wheelLocked = false;
          }, 320);
          if (event.deltaY > 0) {
            void rendition.next();
          } else {
            void rendition.prev();
          }
        },
        { passive: false },
      );
    });

    rendition.on('relocated', (location: EpubLocation) => {
      currentHrefRef.current = location.start.href;
      setCurrentHref(location.start.href);
      const readerLocation: ReaderLocation = {
        kind: 'epub',
        cfi: location.start.cfi,
        href: location.start.href,
        label: location.start.href,
      };
      lastLocationRef.current = readerLocation;
      onLocationChange(readerLocation);
    });

    rendition.on('selected', (cfiRange: string, contents: EpubContents) => {
      const selectedText = contents.window.getSelection()?.toString().trim() ?? '';
      if (selectedText === '') {
        return;
      }
      onSelectionChange({
        text: selectedText,
        prefix: '',
        suffix: '',
        location: {
          kind: 'epub',
          cfi: cfiRange,
          href: currentHrefRef.current,
          label: currentHrefRef.current,
        },
      });
    });

    void rendition.display();
    void epubBook.loaded.navigation
      .then((navigation) => {
        if (!disposed) {
          setToc(flattenToc(navigation.toc));
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      searchTokenRef.current += 1;
      hitsRef.current = [];
      activeIndexRef.current = -1;
      userAnnotationCfisRef.current = [];
      rendition.destroy();
      epubBook.destroy();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [book, onSelectionChange, onLocationChange]);

  useEffect(() => {
    themeRef.current = theme;
    renditionRef.current?.themes.default(themeStyles(theme));
  }, [theme]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (rendition === null) {
      return;
    }
    for (const cfi of userAnnotationCfisRef.current) {
      rendition.annotations.remove(cfi, 'highlight');
    }
    const cfis: string[] = [];
    for (const highlight of highlights) {
      if (highlight.location.kind !== 'epub') {
        continue;
      }
      rendition.annotations.highlight(
        highlight.location.cfi,
        {},
        undefined,
        'user-highlight',
        USER_HIGHLIGHT_STYLES,
      );
      cfis.push(highlight.location.cfi);
    }
    userAnnotationCfisRef.current = cfis;
  }, [highlights]);

  useEffect(() => {
    if (jumpRequest?.location.kind !== 'epub') {
      return;
    }
    void renditionRef.current?.display(jumpRequest.location.cfi);
  }, [jumpRequest]);

  const showHit = useCallback(async (target: number) => {
    const rendition = renditionRef.current;
    const hits = hitsRef.current;
    if (rendition === null || hits.length === 0) {
      return;
    }
    const previous = hits[activeIndexRef.current];
    if (previous !== undefined) {
      rendition.annotations.remove(previous.cfi, 'highlight');
      rendition.annotations.highlight(previous.cfi, {}, undefined, undefined, HIGHLIGHT_ALL);
    }
    const hit = hits[target];
    if (hit === undefined) {
      return;
    }
    rendition.annotations.remove(hit.cfi, 'highlight');
    rendition.annotations.highlight(hit.cfi, {}, undefined, undefined, HIGHLIGHT_ACTIVE);
    activeIndexRef.current = target;
    setCurrent(target);
    await rendition.display(hit.cfi);
  }, []);

  const runSearch = useCallback(
    async (value: string) => {
      const epubBook = bookRef.current;
      const rendition = renditionRef.current;
      if (epubBook === null || rendition === null) {
        return;
      }
      searchTokenRef.current += 1;
      const token = searchTokenRef.current;
      clearHitHighlights(rendition, hitsRef.current);
      hitsRef.current = [];
      activeIndexRef.current = -1;
      setCurrent(-1);

      const trimmed = value.trim();
      if (trimmed.length === 0) {
        setSubmitted('');
        setStatus('idle');
        setTotal(0);
        return;
      }

      setSubmitted(trimmed);
      setStatus('searching');
      setTotal(0);

      const hits: SearchHit[] = [];
      for (const section of epubBook.spine.spineItems) {
        if (searchTokenRef.current !== token) {
          return;
        }
        try {
          await section.load(epubBook.load.bind(epubBook));
          const sectionDocument = section.document;
          if (sectionDocument !== undefined) {
            for (const range of findTextRanges(sectionDocument, trimmed)) {
              hits.push({ cfi: section.cfiFromRange(range) });
            }
          }
        } catch {
          // skip sections that fail to parse
        } finally {
          section.unload();
        }
        if (searchTokenRef.current !== token) {
          return;
        }
        setTotal(hits.length);
      }

      if (searchTokenRef.current !== token) {
        return;
      }
      hitsRef.current = hits;
      setTotal(hits.length);
      setStatus('ready');
      if (hits.length === 0) {
        return;
      }
      for (const hit of hits) {
        rendition.annotations.highlight(hit.cfi, {}, undefined, undefined, HIGHLIGHT_ALL);
      }
      await showHit(0);
    },
    [showHit],
  );

  const go = useCallback(
    (delta: number) => {
      const hits = hitsRef.current;
      if (hits.length === 0) {
        return;
      }
      const base = activeIndexRef.current < 0 ? 0 : activeIndexRef.current;
      const next = (base + delta + hits.length) % hits.length;
      void showHit(next);
    },
    [showHit],
  );

  const closeSearch = useCallback(() => {
    searchTokenRef.current += 1;
    const rendition = renditionRef.current;
    if (rendition !== null) {
      clearHitHighlights(rendition, hitsRef.current);
    }
    hitsRef.current = [];
    activeIndexRef.current = -1;
    setSearchOpen(false);
    setQuery('');
    setSubmitted('');
    setStatus('idle');
    setCurrent(-1);
    setTotal(0);
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
      void renditionRef.current?.prev();
    }, []),
    useCallback(() => {
      void renditionRef.current?.next();
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
              void renditionRef.current?.prev();
            }}
            aria-label="Previous page"
          >
            Prev
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              void renditionRef.current?.next();
            }}
            aria-label="Next page"
          >
            Next
          </button>
          <select
            className="toc-select"
            value={toc.some((option) => option.href === currentHref) ? currentHref : ''}
            onChange={(event) => {
              const href = event.target.value;
              if (href !== '') {
                void renditionRef.current?.display(href);
              }
            }}
            aria-label="Table of contents"
          >
            <option value="">Contents</option>
            {toc.map((option) => (
              <option key={`${String(option.depth)}-${option.href}`} value={option.href}>
                {`${'— '.repeat(option.depth)}${option.label}`}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-group toolbar-end">
          <button type="button" className="icon-button" onClick={openSearch}>
            Search
          </button>
        </div>
      </div>

      <div className="epub-host" ref={hostRef} />

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
              void runSearch(query);
            } else {
              go(1);
            }
          }}
          onNext={() => {
            go(1);
          }}
          onPrevious={() => {
            if (hitsRef.current.length === 0) {
              void runSearch(query);
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
