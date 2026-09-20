import type { ReactElement } from 'react';

const MAX_ENTRIES = 12;
const MAX_CHARS = 90_000;

const cache = new Map<string, ReactElement>();
let cachedChars = 0;

function evict(): void {
  while (cache.size > MAX_ENTRIES || cachedChars > MAX_CHARS) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    cache.delete(oldest);
    cachedChars -= oldest.length;
  }
}

export function getOrCreateMarkdown(key: string, create: () => ReactElement): ReactElement {
  const cached = cache.get(key);
  if (cached !== undefined) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const element = create();
  cache.set(key, element);
  cachedChars += key.length;
  evict();
  return element;
}

export function clearMarkdownCache(): void {
  cache.clear();
  cachedChars = 0;
}

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => {
    clearMarkdownCache();
  });
}
