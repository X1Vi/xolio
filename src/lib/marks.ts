import { useCallback, useState } from 'react';

export type ReaderLocation =
  | { readonly kind: 'pdf'; readonly page: number; readonly label: string }
  | {
      readonly kind: 'epub';
      readonly cfi: string;
      readonly href: string;
      readonly label: string;
    }
  | {
      readonly kind: 'markdown';
      readonly page: number;
      readonly label: string;
      readonly scrollRatio?: number;
    };

export interface Bookmark {
  readonly id: string;
  readonly createdAt: number;
  readonly label: string;
  readonly location: ReaderLocation;
}

export interface Highlight {
  readonly id: string;
  readonly createdAt: number;
  readonly quote: string;
  readonly prefix: string;
  readonly suffix: string;
  readonly location: ReaderLocation;
}

export interface MarksBundle {
  readonly bookmarks: readonly Bookmark[];
  readonly highlights: readonly Highlight[];
}

export interface SelectionInfo {
  readonly text: string;
  readonly prefix: string;
  readonly suffix: string;
  readonly location: ReaderLocation;
}

export interface JumpRequest {
  readonly nonce: number;
  readonly location: ReaderLocation;
  readonly quote?: string;
}

export interface ReaderHandle {
  getLocation(): ReaderLocation | null;
}

const EMPTY_MARKS: MarksBundle = { bookmarks: [], highlights: [] };

function storageKey(bookId: string): string {
  return `reader-marks:${bookId}`;
}

function createId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isBookmark(value: unknown): value is Bookmark {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['id'] === 'string' && typeof record['location'] === 'object';
}

function isHighlight(value: unknown): value is Highlight {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['id'] === 'string' && typeof record['quote'] === 'string';
}

export function loadMarks(bookId: string): MarksBundle {
  try {
    const raw = window.localStorage.getItem(storageKey(bookId));
    if (raw === null) {
      return EMPTY_MARKS;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (parsed === null) {
      return EMPTY_MARKS;
    }
    const bookmarksValue = parsed['bookmarks'];
    const singleValue = parsed['bookmark'];
    const highlightsValue = parsed['highlights'];
    let bookmarks: Bookmark[] = [];
    if (Array.isArray(bookmarksValue)) {
      bookmarks = (bookmarksValue as unknown[]).filter(isBookmark);
    } else if (isBookmark(singleValue)) {
      bookmarks = [singleValue];
    }
    return {
      bookmarks,
      highlights: Array.isArray(highlightsValue)
        ? (highlightsValue as unknown[]).filter(isHighlight)
        : [],
    };
  } catch {
    return EMPTY_MARKS;
  }
}

export function saveMarks(bookId: string, marks: MarksBundle): void {
  try {
    window.localStorage.setItem(storageKey(bookId), JSON.stringify(marks));
  } catch {
    // storage can be unavailable or full; marks stay in memory for this session
  }
}

export function createBookmark(label: string, location: ReaderLocation): Bookmark {
  return { id: createId(), createdAt: Date.now(), label, location };
}

export function createHighlight(selection: SelectionInfo): Highlight {
  return {
    id: createId(),
    createdAt: Date.now(),
    quote: selection.text,
    prefix: selection.prefix,
    suffix: selection.suffix,
    location: selection.location,
  };
}

export interface MarksState {
  readonly marks: MarksBundle;
  readonly addBookmark: (label: string, location: ReaderLocation) => void;
  readonly addHighlight: (selection: SelectionInfo) => void;
  readonly removeBookmark: (id: string) => void;
  readonly renameBookmark: (id: string, title: string) => void;
  readonly removeHighlight: (id: string) => void;
}

export function useMarks(bookId: string): MarksState {
  const [marks, setMarks] = useState<MarksBundle>(() => loadMarks(bookId));

  const addBookmark = useCallback(
    (label: string, location: ReaderLocation) => {
      setMarks((current) => {
        const next: MarksBundle = {
          bookmarks: [createBookmark(label, location), ...current.bookmarks],
          highlights: current.highlights,
        };
        saveMarks(bookId, next);
        return next;
      });
    },
    [bookId],
  );

  const addHighlight = useCallback(
    (selection: SelectionInfo) => {
      setMarks((current) => {
        const next: MarksBundle = {
          bookmarks: current.bookmarks,
          highlights: [createHighlight(selection), ...current.highlights],
        };
        saveMarks(bookId, next);
        return next;
      });
    },
    [bookId],
  );

  const removeBookmark = useCallback(
    (id: string) => {
      setMarks((current) => {
        const next: MarksBundle = {
          bookmarks: current.bookmarks.filter((bookmark) => bookmark.id !== id),
          highlights: current.highlights,
        };
        saveMarks(bookId, next);
        return next;
      });
    },
    [bookId],
  );

  const renameBookmark = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (trimmed === '') {
        return;
      }
      setMarks((current) => {
        const next: MarksBundle = {
          bookmarks: current.bookmarks.map((bookmark) =>
            bookmark.id === id ? { ...bookmark, label: trimmed } : bookmark,
          ),
          highlights: current.highlights,
        };
        saveMarks(bookId, next);
        return next;
      });
    },
    [bookId],
  );

  const removeHighlight = useCallback(
    (id: string) => {
      setMarks((current) => {
        const next: MarksBundle = {
          bookmarks: current.bookmarks,
          highlights: current.highlights.filter((highlight) => highlight.id !== id),
        };
        saveMarks(bookId, next);
        return next;
      });
    },
    [bookId],
  );

  return { marks, addBookmark, addHighlight, removeBookmark, renameBookmark, removeHighlight };
}
