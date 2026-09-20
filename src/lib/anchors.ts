import { findTextRanges } from './textSearch';

export interface TextContext {
  readonly prefix: string;
  readonly suffix: string;
}

export function contextAroundRange(range: Range, length: number): TextContext {
  const startText = range.startContainer.textContent ?? '';
  const endText = range.endContainer.textContent ?? '';
  const prefix = startText.slice(Math.max(0, range.startOffset - length), range.startOffset);
  const suffix = endText.slice(range.endOffset, range.endOffset + length);
  return { prefix, suffix };
}

function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let index = 0;
  while (index < limit && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

function commonSuffixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let count = 0;
  while (count < limit && a[a.length - 1 - count] === b[b.length - 1 - count]) {
    count += 1;
  }
  return count;
}

function scoreRange(range: Range, prefix: string, suffix: string): number {
  const context = contextAroundRange(range, Math.max(prefix.length, suffix.length, 1));
  return commonSuffixLength(context.prefix, prefix) + commonPrefixLength(context.suffix, suffix);
}

export function findAnchoredRange(
  root: ParentNode,
  quote: string,
  prefix: string,
  suffix: string,
): Range | null {
  const matches = findTextRanges(root, quote);
  const first = matches[0];
  if (first === undefined) {
    return null;
  }
  if (matches.length === 1) {
    return first;
  }
  let best = first;
  let bestScore = scoreRange(first, prefix, suffix);
  for (const match of matches.slice(1)) {
    const score = scoreRange(match, prefix, suffix);
    if (score > bestScore) {
      best = match;
      bestScore = score;
    }
  }
  return best;
}
