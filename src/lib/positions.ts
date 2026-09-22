import {
  getPinnedBookmark,
  isReaderLocation,
  type JumpRequest,
  type MarksBundle,
  type ReaderLocation,
} from './marks';

const LAST_BOOK_KEY = 'reader-last-book';
const POSITION_PREFIX = 'reader-position:';

function positionKey(bookId: string): string {
  return `${POSITION_PREFIX}${bookId}`;
}

export function loadLastBookId(): string | null {
  try {
    const value = window.localStorage.getItem(LAST_BOOK_KEY);
    return value === null || value === '' ? null : value;
  } catch {
    return null;
  }
}

export function saveLastBookId(bookId: string): void {
  try {
    window.localStorage.setItem(LAST_BOOK_KEY, bookId);
  } catch {
    // storage can be unavailable; the library still works for this session
  }
}

export function clearLastBookId(): void {
  try {
    window.localStorage.removeItem(LAST_BOOK_KEY);
  } catch {
    // storage can be unavailable; nothing else to do
  }
}

export function loadReadingPosition(bookId: string): ReaderLocation | null {
  try {
    const raw = window.localStorage.getItem(positionKey(bookId));
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isReaderLocation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveReadingPosition(bookId: string, location: ReaderLocation): void {
  try {
    window.localStorage.setItem(positionKey(bookId), JSON.stringify(location));
  } catch {
    // storage can be unavailable; the position still works for this session
  }
}

export function clearReadingPosition(bookId: string): void {
  try {
    window.localStorage.removeItem(positionKey(bookId));
  } catch {
    // storage can be unavailable; nothing else to do
  }
}

/**
 * Where to open a book: a pinned bookmark wins over the last saved reading position.
 */
export function resolveInitialJump(entryId: string, marks: MarksBundle): JumpRequest | null {
  const pinned = getPinnedBookmark(marks);
  if (pinned !== undefined) {
    return { nonce: 1, location: pinned.location };
  }
  const saved = loadReadingPosition(entryId);
  return saved === null ? null : { nonce: 1, location: saved };
}
