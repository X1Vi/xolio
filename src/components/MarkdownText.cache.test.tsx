import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMarkdownCache } from '../lib/markdownCache';

const { parseCount } = vi.hoisted(() => ({ parseCount: { value: 0 } }));

vi.mock('../lib/markdownCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/markdownCache')>();
  return {
    ...actual,
    getOrCreateMarkdown: (key: string, create: () => ReactElement): ReactElement =>
      actual.getOrCreateMarkdown(key, () => {
        parseCount.value += 1;
        return create();
      }),
  };
});

import { MarkdownText } from './MarkdownText';

beforeEach(() => {
  clearMarkdownCache();
  parseCount.value = 0;
});

describe('MarkdownText caching', () => {
  it('does not re-parse when re-rendered with the same text', () => {
    const { rerender } = render(<MarkdownText text="# Title" cache />);
    rerender(<MarkdownText text="# Title" cache />);
    expect(parseCount.value).toBe(1);
  });

  it('reuses the cached parse after a remount', () => {
    const first = render(<MarkdownText text="# Cached" cache />);
    first.unmount();
    render(<MarkdownText text="# Cached" cache />);
    expect(parseCount.value).toBe(1);
  });

  it('parses new text again', () => {
    render(<MarkdownText text="# One" cache />);
    render(<MarkdownText text="# Two" cache />);
    expect(parseCount.value).toBe(2);
  });
});
