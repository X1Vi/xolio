export const SHARE_TARGET_IDS = [
  'native',
  'copy',
  'copy-link',
  'whatsapp',
  'telegram',
  'bluesky',
  'skyforge',
  'reddit',
] as const

export type ShareTarget = (typeof SHARE_TARGET_IDS)[number]

export interface SharePayload {
  title: string
  url: string
  text?: string
  tags?: string[]
  source?: string
}

export interface ShareConfig {
  skyforgeUrl: string
}

export const SKYFORGE_URL =
  import.meta.env.VITE_SKYFORGE_URL ?? 'https://skyforge.x1vi.workers.dev/'

export const DEFAULT_SHARE_CONFIG: ShareConfig = { skyforgeUrl: SKYFORGE_URL }

export interface ShareTargetInfo {
  id: ShareTarget
  label: string
  description: string
}

export const SHARE_TARGETS: ShareTargetInfo[] = [
  { id: 'native', label: 'Share', description: 'Open the system share sheet' },
  { id: 'copy', label: 'Copy post', description: 'Copy text and link' },
  { id: 'copy-link', label: 'Copy link', description: 'Copy only the link' },
  { id: 'whatsapp', label: 'WhatsApp', description: 'Send in a chat' },
  { id: 'telegram', label: 'Telegram', description: 'Send in a chat' },
  { id: 'bluesky', label: 'Bluesky', description: 'Compose directly on Bluesky' },
  { id: 'skyforge', label: 'Skyforge', description: 'Compose with hashtag suggestions' },
  { id: 'reddit', label: 'Reddit', description: 'Submit to a subreddit' },
]

export type ShareOutcome =
  | { status: 'shared'; target: ShareTarget }
  | { status: 'copied'; target: ShareTarget }
  | { status: 'opened'; target: ShareTarget; url: string }

export function shareText(payload: SharePayload): string {
  const trimmed = payload.text?.trim();
  const body = trimmed !== undefined && trimmed.length > 0 ? trimmed : payload.title
  const tags = (payload.tags ?? [])
    .map((tag) => `#${tag.replace(/^#+/, '').replace(/\s+/g, '')}`)
    .filter((tag) => tag.length > 1)
    .join(' ')

  return [body, tags].filter((part) => part.length > 0).join('\n\n')
}

export function fullShareText(payload: SharePayload): string {
  return `${shareText(payload)}\n\n${payload.url}`
}

function httpsBase(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl)
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocal)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function buildShareUrl(
  target: ShareTarget,
  payload: SharePayload,
  config: ShareConfig = DEFAULT_SHARE_CONFIG,
): string | null {
  const text = shareText(payload)

  switch (target) {
    case 'native':
    case 'copy':
    case 'copy-link':
      return null
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(fullShareText(payload))}`
    case 'telegram':
      return `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(text)}`
    case 'bluesky':
      return `https://bsky.app/intent/compose?text=${encodeURIComponent(fullShareText(payload))}`
    case 'skyforge': {
      const base = httpsBase(config.skyforgeUrl)
      if (base === null) {
        return null
      }
      const url = new URL(base)
      url.searchParams.set('text', text)
      url.searchParams.set('url', payload.url)
      if (payload.tags && payload.tags.length > 0) {
        url.searchParams.set('tags', payload.tags.join(','))
      }
      if (payload.source) {
        url.searchParams.set('source', payload.source)
      }
      return url.toString()
    }
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodeURIComponent(payload.url)}&title=${encodeURIComponent(payload.title)}`
    default:
      return null
  }
}

export interface ShareDeps {
  config?: ShareConfig
  clipboard?: { writeText(text: string): Promise<void> }
  navigatorShare?: ((data: { title?: string; text?: string; url?: string }) => Promise<void>) | null
  open?: (url: string) => void
}

export async function share(
  target: ShareTarget,
  payload: SharePayload,
  deps: ShareDeps = {},
): Promise<ShareOutcome> {
  if (target === 'native') {
    const nativeShare =
      deps.navigatorShare ??
      (typeof navigator !== 'undefined' && typeof navigator.share === 'function'
        ? navigator.share.bind(navigator)
        : null)
    if (nativeShare !== null) {
      await nativeShare({ title: payload.title, text: shareText(payload), url: payload.url })
      return { status: 'shared', target }
    }
    target = 'copy'
  }

  if (target === 'copy') {
    const clipboard =
      deps.clipboard ?? (typeof navigator !== 'undefined' ? navigator.clipboard : undefined)
    if (clipboard === undefined) {
      throw new Error('Clipboard is not available')
    }
    await clipboard.writeText(fullShareText(payload))
    return { status: 'copied', target }
  }

  if (target === 'copy-link') {
    const clipboard =
      deps.clipboard ?? (typeof navigator !== 'undefined' ? navigator.clipboard : undefined)
    if (clipboard === undefined) {
      throw new Error('Clipboard is not available')
    }
    await clipboard.writeText(payload.url)
    return { status: 'copied', target }
  }

  const url = buildShareUrl(target, payload, deps.config)
  if (url === null) {
    throw new Error(`No share URL available for target: ${target}`)
  }

  if (deps.open) {
    deps.open(url)
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return { status: 'opened', target, url }
}
