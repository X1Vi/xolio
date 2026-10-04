import { describe, expect, it, vi } from 'vitest'
import {
  FREE_BOOK_SHELVES,
  directDownloadUrl,
  downloadUrl,
  fetchFreeBook,
  freeBooks,
  matchesFreeBook,
  matchesShelf,
  sortFreeBooks,
  storeSearchUrl,
} from './freeBooks'
import { STORE_ORIGIN } from './store'

function firstOrThrow<T>(items: readonly T[]): T {
  const [first] = items
  if (first === undefined) {
    throw new Error('expected at least one item')
  }
  return first
}

describe('free book catalogue', () => {
  it('has unique ids and https source urls', () => {
    const ids = freeBooks.map((book) => book.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(freeBooks.length).toBeGreaterThan(60)
    for (const book of freeBooks) {
      expect(book.download_url).toMatch(/^https:\/\//)
      expect(book.page_url).toMatch(/^https:\/\//)
      expect(['gutenberg', 'standard_ebooks']).toContain(book.source)
    }
  })

  it('routes Gutenberg downloads through the Xolio proxy', () => {
    const book = firstOrThrow(freeBooks.filter((candidate) => candidate.source === 'gutenberg'))
    expect(downloadUrl(book)).toBe(`/api/free-books/download?source=gutenberg&id=${book.source_id}`)
  })

  it('uses direct downloads for Standard Ebooks', () => {
    const book = firstOrThrow(
      freeBooks.filter((candidate) => candidate.source === 'standard_ebooks'),
    )
    expect(downloadUrl(book)).toBe(`${book.download_url}?source=download`)
    expect(directDownloadUrl(book)).toBe(`${book.download_url}?source=download`)
  })

  it('offers the original Gutenberg URL as a browser download fallback', () => {
    const book = firstOrThrow(freeBooks.filter((candidate) => candidate.source === 'gutenberg'))
    expect(directDownloadUrl(book)).toBe(book.download_url)
  })

  it('builds a store search URL for print editions', () => {
    const book = firstOrThrow(freeBooks)
    const params = new URLSearchParams({ q: book.title })
    expect(storeSearchUrl(book)).toBe(`${STORE_ORIGIN}/store/books?${params.toString()}`)
  })

  it('matches by title, author and tag', () => {
    const book = firstOrThrow(freeBooks)
    expect(matchesFreeBook(book, '')).toBe(true)
    expect(matchesFreeBook(book, book.title.slice(0, 6))).toBe(true)
    expect(matchesFreeBook(book, book.author)).toBe(true)
    expect(matchesFreeBook(book, 'definitely-not-a-tag')).toBe(false)
  })

  it('fetches a book as an EPUB file', async () => {
    const book = firstOrThrow(freeBooks)
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response('epub-bytes', {
        status: 200,
        headers: { 'Content-Type': 'application/epub+zip' },
      })),
    )
    const file = await fetchFreeBook(book, fetchMock)
    expect(file.name).toBe(`${book.title} - ${book.author}.epub`)
    expect(file.type).toBe('application/epub+zip')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('throws when the download fails', async () => {
    const book = firstOrThrow(freeBooks)
    const fetchMock = vi.fn(() => Promise.resolve(new Response('nope', { status: 500 })))
    await expect(
      fetchFreeBook(book, fetchMock),
    ).rejects.toThrow('Download failed (500)')
  })

  it('rejects an HTML download response', async () => {
    const book = firstOrThrow(freeBooks)
    const fetchMock = vi.fn(() => Promise.resolve(new Response('<html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })))
    await expect(fetchFreeBook(book, fetchMock)).rejects.toThrow('instead of an EPUB')
  })
})

describe('free book shelves and sorting', () => {
  function shelfById(id: string) {
    const shelf = FREE_BOOK_SHELVES.find((candidate) => candidate.id === id)
    if (shelf === undefined) {
      throw new Error(`missing shelf ${id}`)
    }
    return shelf
  }

  it('exposes a unique shelf list that always includes All', () => {
    const ids = FREE_BOOK_SHELVES.map((shelf) => shelf.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(matchesShelf(firstOrThrow(freeBooks), shelfById('all'))).toBe(true)
  })

  it('matches shelves by their underlying tags', () => {
    const scifi = shelfById('scifi')
    const horror = shelfById('horror')
    const frankenstein = firstOrThrow(freeBooks.filter((book) => book.title === 'Frankenstein'))
    const gitanjali = firstOrThrow(freeBooks.filter((book) => book.title === 'Gitanjali'))
    expect(matchesShelf(frankenstein, scifi)).toBe(true)
    expect(matchesShelf(frankenstein, horror)).toBe(true)
    expect(matchesShelf(gitanjali, scifi)).toBe(false)
    expect(matchesShelf(gitanjali, horror)).toBe(false)
  })

  it('sorts by title, author, and source without mutating the catalogue', () => {
    const titles = sortFreeBooks(freeBooks, 'title').map((book) => book.title)
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))

    const authors = sortFreeBooks(freeBooks, 'author').map((book) => book.author)
    expect(authors).toEqual([...authors].sort((a, b) => a.localeCompare(b)))

    const sources = sortFreeBooks(freeBooks, 'source').map((book) => book.source_label)
    expect(sources).toEqual([...sources].sort((a, b) => a.localeCompare(b)))

    expect(sortFreeBooks(freeBooks, 'title')).not.toBe(freeBooks)
    expect(freeBooks[0]?.title).toBe('Pride and Prejudice')
  })
})
