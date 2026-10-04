import freeBooksJson from '../data/free-books.json'
import { STORE_ORIGIN } from './store'

export type FreeBookSource = 'standard_ebooks' | 'gutenberg'

export interface FreeBook {
  id: string
  title: string
  author: string
  source: FreeBookSource
  source_id: string
  source_label: string
  page_url: string
  download_url: string
  format: 'epub'
  license: string
  tags: string[]
}

export const freeBooks = freeBooksJson as unknown as FreeBook[]

export interface FreeBookShelf {
  readonly id: string;
  readonly label: string;
  readonly tags: readonly string[];
}

export const FREE_BOOK_SHELVES: readonly FreeBookShelf[] = [
  { id: 'all', label: 'All', tags: [] },
  { id: 'fiction', label: 'Fiction', tags: ['fiction'] },
  { id: 'adventure', label: 'Adventure', tags: ['adventure'] },
  { id: 'mystery', label: 'Mystery', tags: ['mystery'] },
  { id: 'scifi', label: 'Sci-Fi', tags: ['science fiction'] },
  { id: 'horror', label: 'Horror', tags: ['horror'] },
  { id: 'romance', label: 'Romance', tags: ['romance'] },
  { id: 'poetry', label: 'Poetry', tags: ['poetry'] },
  { id: 'philosophy', label: 'Philosophy', tags: ['philosophy'] },
  { id: 'history', label: 'History', tags: ['history'] },
  { id: 'children', label: 'Children', tags: ['children'] },
  { id: 'short-stories', label: 'Short stories', tags: ['short stories'] },
];

export function matchesShelf(book: FreeBook, shelf: FreeBookShelf): boolean {
  return shelf.tags.length === 0 || shelf.tags.some((tag) => book.tags.includes(tag));
}

export type FreeBookSortId = 'title' | 'author' | 'source';

export const FREE_BOOK_SORTS: readonly { readonly id: FreeBookSortId; readonly label: string }[] = [
  { id: 'title', label: 'Title A–Z' },
  { id: 'author', label: 'Author A–Z' },
  { id: 'source', label: 'Source' },
];

export function sortFreeBooks(books: readonly FreeBook[], sort: FreeBookSortId): FreeBook[] {
  const sorted = [...books];
  if (sort === 'author') {
    sorted.sort(
      (a, b) => a.author.localeCompare(b.author) || a.title.localeCompare(b.title),
    );
  } else if (sort === 'source') {
    sorted.sort(
      (a, b) => a.source_label.localeCompare(b.source_label) || a.title.localeCompare(b.title),
    );
  } else {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sorted;
}

function fileNameFor(book: FreeBook): string {
  const base = `${book.title} - ${book.author}`
    .replace(/[/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${base}.epub`
}

/**
 * Project Gutenberg blocks cross-origin reads, so downloads go through the
 * store worker proxy (strict source/id allowlist). Standard Ebooks allows
 * direct downloads.
 */
export function downloadUrl(book: FreeBook): string {
  if (book.source === 'gutenberg') {
    const params = new URLSearchParams({ source: 'gutenberg', id: book.source_id })
    return `/api/free-books/download?${params.toString()}`
  }
  const url = new URL(book.download_url)
  url.searchParams.set('source', 'download')
  return url.toString()
}

/** A normal browser download that does not require cross-origin fetch access. */
export function directDownloadUrl(book: FreeBook): string {
  if (book.source === 'standard_ebooks') {
    const url = new URL(book.download_url)
    url.searchParams.set('source', 'download')
    return url.toString()
  }
  return book.download_url
}

export function storeSearchUrl(book: FreeBook): string {
  const params = new URLSearchParams({ q: book.title })
  return `${STORE_ORIGIN}/store/books?${params.toString()}`
}

export async function fetchFreeBook(
  book: FreeBook,
  fetchImpl: typeof fetch = fetch,
): Promise<File> {
  const response = await fetchImpl(downloadUrl(book), {
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`Download failed (${String(response.status)})`)
  }
  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('html')) {
    throw new Error('Download returned a web page instead of an EPUB')
  }
  const blob = await response.blob()
  return new File([blob], fileNameFor(book), { type: 'application/epub+zip' })
}

export function matchesFreeBook(book: FreeBook, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (term.length === 0) {
    return true
  }
  const haystack = [book.title, book.author, ...book.tags].join(' ').toLowerCase()
  return haystack.includes(term)
}
