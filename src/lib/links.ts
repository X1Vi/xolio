/** Shared X1VI feedback desk. Every app sends its visitors here. */
export const FEEDBACK_URL = 'https://feedback.x1vi.workers.dev/'

export function feedbackUrl(page?: string): string {
  const url = new URL(FEEDBACK_URL)
  url.searchParams.set('site', 'xolio')
  const target = page ?? (typeof window === 'undefined' ? '' : window.location.href)
  if (target.length > 0) {
    url.searchParams.set('page', target)
  }
  return url.toString()
}
