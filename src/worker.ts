import freeBooksJson from './data/free-books.json'

interface AssetsBinding {
  fetch(request: Request): Promise<Response>
}

interface Env {
  ASSETS: AssetsBinding
}

interface FreeBookRecord {
  source: string
  source_id: string
  download_url: string
}

const books = freeBooksJson as FreeBookRecord[]
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: CORS_HEADERS })
}

async function downloadFreeBook(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (request.method !== 'GET') {
    return jsonError('Method not allowed', 405)
  }

  const url = new URL(request.url)
  const source = url.searchParams.get('source')
  const id = url.searchParams.get('id')
  const book = books.find((candidate) => candidate.source === source && candidate.source_id === id)
  if (book?.source !== 'gutenberg') {
    return jsonError('Book not found', 404)
  }

  const upstream = await fetch(book.download_url, {
    headers: { 'User-Agent': 'Xolio/0.6 (+https://github.com/X1Vi)' },
    redirect: 'follow',
  })
  if (!upstream.ok || upstream.body === null) {
    return jsonError('Upstream download failed', 502)
  }

  const headers = new Headers(CORS_HEADERS)
  headers.set('Content-Type', 'application/epub+zip')
  headers.set('Content-Disposition', `attachment; filename="gutenberg-${book.source_id}.epub"`)
  headers.set('Cache-Control', 'public, max-age=86400')
  return new Response(upstream.body, { status: 200, headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/free-books/download') {
      try {
        return await downloadFreeBook(request)
      } catch {
        return jsonError('Download service unavailable', 502)
      }
    }
    return env.ASSETS.fetch(request)
  },
}
