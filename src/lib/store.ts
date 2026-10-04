/**
 * Common Goods store deep links.
 *
 * Xolio never links to an external reader. Free books are downloaded as EPUB
 * files and read in Xolio; paid and print editions open in the store.
 */
export const STORE_ORIGIN =
  import.meta.env.VITE_STORE_ORIGIN ?? 'https://x1vi-store.x1vi.workers.dev'

const BOOK_EXTENSION = /\.(pdf|epub|md|markdown|mdown)$/i

export function cleanBookTitle(fileName: string): string {
  const base = fileName
    .replace(BOOK_EXTENSION, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return base.length > 0 ? base : fileName
}

export function learnTopicUrl(topic: string): string {
  const query = topic.trim().replace(/\s+/g, ' ').slice(0, 140)
  const params = new URLSearchParams({ q: query })
  return `${STORE_ORIGIN}/store/learning?${params.toString()}`
}
