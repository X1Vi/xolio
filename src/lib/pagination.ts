const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;
const MATH_FENCE_PATTERN = /^\s*(?:\$\$|\\\[|\\\])\s*$/;

export const LARGE_DOCUMENT_CHARS = 6_000;
export const ESTIMATED_PAGE_HEIGHT = 720;
export const PAGE_OVERSCAN = 1;
export const MAX_WINDOW_PAGES = 5;

export function paginateMarkdown(source: string, maxChars = LARGE_DOCUMENT_CHARS): string[] {
  if (source.length <= maxChars) {
    return [source];
  }

  const pages: string[] = [];
  let current: string[] = [];
  let currentLength = 0;
  let inFence = false;
  let fenceChar = '';
  let fenceOpenLine = '';
  let fenceClose = '';
  let inMath = false;
  const hardLimit = maxChars * 2;

  const flush = (): void => {
    if (current.length === 0) {
      return;
    }
    const reopen: string[] = [];
    if (inFence) {
      current.push(fenceClose);
      reopen.push(fenceOpenLine);
    }
    if (inMath) {
      current.push('$$');
      reopen.push('$$');
    }
    pages.push(current.join('\n'));
    current = reopen;
    currentLength = reopen.reduce((total, line) => total + line.length + 1, 0);
  };

  for (const line of source.split('\n')) {
    const fence = FENCE_PATTERN.exec(line);
    if (fence !== null) {
      const marker = fence[1] ?? '';
      if (!inFence) {
        inFence = true;
        fenceChar = marker.charAt(0);
        fenceOpenLine = line;
        fenceClose = marker;
      } else if (marker.startsWith(fenceChar)) {
        inFence = false;
      }
    } else if (!inFence && MATH_FENCE_PATTERN.test(line)) {
      inMath = !inMath;
    }

    current.push(line);
    currentLength += line.length + 1;

    const atBoundary = !inFence && !inMath && line.trim() === '';
    if (currentLength >= maxChars && (atBoundary || currentLength >= hardLimit)) {
      flush();
    }
  }

  flush();
  return pages.length > 0 ? pages : [source];
}

export function pageOffset(heights: readonly number[], index: number): number {
  let offset = 0;
  const limit = Math.min(Math.max(index, 0), heights.length);
  for (let position = 0; position < limit; position += 1) {
    offset += heights[position] ?? 0;
  }
  return offset;
}

export interface MarkdownWindow {
  readonly start: number;
  readonly end: number;
  readonly firstVisible: number;
  readonly paddingTop: number;
  readonly paddingBottom: number;
}

export function computeMarkdownWindow(
  heights: readonly number[],
  scrollTop: number,
  viewportHeight: number,
  overscan = PAGE_OVERSCAN,
  maxPages = MAX_WINDOW_PAGES,
): MarkdownWindow {
  const total = heights.length;
  if (total === 0) {
    return { start: 0, end: -1, firstVisible: 0, paddingTop: 0, paddingBottom: 0 };
  }

  const bottom = scrollTop + Math.max(viewportHeight, 1);
  let offset = 0;
  let firstVisible = total - 1;
  let lastVisible = 0;
  let seenFirst = false;
  for (let index = 0; index < total; index += 1) {
    const height = heights[index] ?? 0;
    if (!seenFirst && offset + height > scrollTop) {
      firstVisible = index;
      seenFirst = true;
    }
    if (offset < bottom) {
      lastVisible = index;
    }
    offset += height;
  }

  let start = Math.max(0, firstVisible - overscan);
  let end = Math.min(total - 1, lastVisible + overscan);
  if (end - start + 1 > maxPages) {
    start = Math.max(0, Math.min(firstVisible - Math.floor(maxPages / 2), total - maxPages));
    end = Math.min(total - 1, start + maxPages - 1);
  }

  return {
    start,
    end,
    firstVisible,
    paddingTop: pageOffset(heights, start),
    paddingBottom: pageOffset(heights, total) - pageOffset(heights, end + 1),
  };
}
