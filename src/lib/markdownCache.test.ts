import { createElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearMarkdownCache, getOrCreateMarkdown } from './markdownCache';
import { renderMarkdown } from './markdownRenderer';

function countingCreate(counter: { calls: number }): () => ReactElement {
  return () => {
    counter.calls += 1;
    return createElement('span');
  };
}

describe('markdown cache', () => {
  beforeEach(() => {
    clearMarkdownCache();
  });

  it('reuses the parsed element for the same text', () => {
    const first = renderMarkdown('# Title');
    const second = renderMarkdown('# Title');
    expect(second).toBe(first);
  });

  it('parses different text separately', () => {
    expect(renderMarkdown('# One')).not.toBe(renderMarkdown('# Two'));
  });

  it('evicts the oldest entries when full', () => {
    const counter = { calls: 0 };
    const create = countingCreate(counter);
    for (let index = 0; index < 13; index += 1) {
      getOrCreateMarkdown(`key-${String(index)}`, create);
    }
    expect(counter.calls).toBe(13);
    getOrCreateMarkdown('key-0', create);
    expect(counter.calls).toBe(14);
  });

  it('evicts by total characters', () => {
    const counter = { calls: 0 };
    const create = countingCreate(counter);
    const bigKey = 'x'.repeat(30_000);
    getOrCreateMarkdown(bigKey, create);
    getOrCreateMarkdown(`${bigKey}y`, create);
    getOrCreateMarkdown(`${bigKey}yz`, create);
    expect(counter.calls).toBe(3);
    getOrCreateMarkdown(bigKey, create);
    expect(counter.calls).toBe(4);
  });
});
