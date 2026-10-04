import { useMemo, useState } from 'react'
import {
  FREE_BOOK_SHELVES,
  FREE_BOOK_SORTS,
  directDownloadUrl,
  fetchFreeBook,
  freeBooks,
  matchesFreeBook,
  matchesShelf,
  sortFreeBooks,
  storeSearchUrl,
} from '../lib/freeBooks'
import type { FreeBook, FreeBookSortId } from '../lib/freeBooks'
import { ShareMenu } from './ShareMenu'

interface FreeBooksPanelProps {
  readonly onImport: (file: File) => void
  readonly onClose: () => void
}

type BookStatus = 'idle' | 'loading' | 'error'

function BookGlyph({ title }: { readonly title: string }) {
  const words = title.split(/\s+/).filter((word) => !['a', 'an', 'the', 'of'].includes(word.toLowerCase()))
  const monogram = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('')
  return <span>{monogram || title.slice(0, 1).toUpperCase()}</span>
}

export function FreeBooksPanel({ onImport, onClose }: FreeBooksPanelProps) {
  const [query, setQuery] = useState('')
  const [shelfId, setShelfId] = useState('all')
  const [sort, setSort] = useState<FreeBookSortId>('title')
  const [statuses, setStatuses] = useState<Record<string, BookStatus>>({})

  const visible = useMemo(() => {
    const shelf = FREE_BOOK_SHELVES.find((item) => item.id === shelfId) ?? FREE_BOOK_SHELVES[0]
    const matching = freeBooks.filter(
      (book) =>
        shelf !== undefined && matchesShelf(book, shelf) && matchesFreeBook(book, query),
    )
    return sortFreeBooks(matching, sort)
  }, [query, shelfId, sort])

  const setStatus = (id: string, status: BookStatus): void => {
    setStatuses((current) => ({ ...current, [id]: status }))
  }

  const download = (book: FreeBook): void => {
    void (async () => {
      setStatus(book.id, 'loading')
      try {
        const file = await fetchFreeBook(book)
        onImport(file)
      } catch {
        setStatus(book.id, 'error')
      }
    })()
  }

  return (
    <div className="free-books-backdrop">
      <aside className="free-books-panel" aria-label="Free books">
        <header className="free-books-header">
          <div className="free-books-heading">
            <span className="free-books-kicker">Xolio public library</span>
            <h2>Great books.<br /><em>Yours to keep.</em></h2>
            <p>{freeBooks.length} carefully formatted classics, free to download and read offline.</p>
          </div>
          <button type="button" className="free-books-close" onClick={onClose} aria-label="Back to library">
            <span aria-hidden="true">←</span><span>Library</span>
          </button>
        </header>

        <div className="free-books-tools">
          <label className="free-books-search-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
            <span className="visually-hidden">Search free books</span>
            <input className="free-books-search" type="search" value={query} placeholder="Search title, author, or subject" aria-label="Search free books" onChange={(event) => { setQuery(event.target.value) }} />
          </label>
          <div className="free-books-shelves" role="group" aria-label="Filter by shelf">
            {FREE_BOOK_SHELVES.map((item) => (
              <button key={item.id} type="button" aria-pressed={shelfId === item.id} onClick={() => { setShelfId(item.id) }}>{item.label}</button>
            ))}
          </div>
          <label className="free-books-sort">
            <span className="visually-hidden">Sort free books</span>
            <select
              value={sort}
              aria-label="Sort free books"
              onChange={(event) => { setSort(event.target.value as FreeBookSortId) }}
            >
              {FREE_BOOK_SORTS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="free-books-results">
          <span>{visible.length} {visible.length === 1 ? 'book' : 'books'}</span>
          <span>EPUB · Public domain</span>
        </div>

        <ul className="free-books-list">
          {visible.map((book, index) => {
            const status = statuses[book.id] ?? 'idle'
            return (
              <li key={book.id} className="free-book-item">
                <div className={`free-book-cover free-book-cover-${index % 5}`} aria-hidden="true">
                  <span className="free-book-cover-source">PUBLIC<br />DOMAIN</span>
                  <BookGlyph title={book.title} />
                  <span className="free-book-cover-line" />
                  <small>EPUB</small>
                </div>
                <div className="free-book-content">
                  <div className="free-book-text">
                    <span className="free-book-source">{book.source_label}</span>
                    <a className="free-book-title" href={book.page_url} target="_blank" rel="noopener noreferrer">{book.title}</a>
                    <span className="free-book-author">by {book.author}</span>
                    <div className="free-book-tags">{book.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  </div>
                  <div className="free-book-actions">
                    <button type="button" className="free-book-get" disabled={status === 'loading'} onClick={() => { download(book) }}>
                      <span>{status === 'loading' ? 'Adding…' : 'Read in Xolio'}</span><span aria-hidden="true">＋</span>
                    </button>
                    <div className="free-book-links">
                      <a className="free-book-download" href={directDownloadUrl(book)} target="_blank" rel="noopener noreferrer" download aria-label="Download EPUB">EPUB ↓</a>
                      <ShareMenu
                        label="Share"
                        payload={{ title: `${book.title} — ${book.author}`, url: book.page_url, text: `Free ebook: ${book.title} by ${book.author}`, tags: ['freebooks', 'classics', 'reading'], source: 'xolio' }}
                        onRead={() => {
                          download(book)
                        }}
                      />
                      <a className="free-book-print" href={storeSearchUrl(book)} target="_blank" rel="noopener noreferrer" title="Find a print edition">Print ↗</a>
                    </div>
                  </div>
                  {status === 'error' ? <p className="free-book-error">Couldn’t add it automatically. <a href={directDownloadUrl(book)} target="_blank" rel="noopener noreferrer">Download the EPUB</a> instead.</p> : null}
                </div>
              </li>
            )
          })}
          {visible.length === 0 ? <li className="free-book-empty"><span>Nothing on this shelf yet.</span><button type="button" onClick={() => { setQuery(''); setShelfId('all') }}>Clear filters</button></li> : null}
        </ul>

        <footer className="free-books-note"><span aria-hidden="true">◉</span><p>Files come from Project Gutenberg and Standard Ebooks. They’re public domain, DRM-free, and stay in your local Xolio library.</p></footer>
      </aside>
    </div>
  )
}
