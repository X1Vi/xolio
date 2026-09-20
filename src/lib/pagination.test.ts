import { describe, expect, it } from 'vitest';
import { computeMarkdownWindow, LARGE_DOCUMENT_CHARS, paginateMarkdown } from './pagination';

function paragraph(label: string, repeat = 40): string {
  return `## ${label}\n\n${'word '.repeat(repeat)}\n`;
}

describe('paginateMarkdown', () => {
  it('keeps small documents on a single page', () => {
    const source = '# Title\n\nshort body\n';
    expect(paginateMarkdown(source)).toEqual([source]);
  });

  it('splits large documents without losing content', () => {
    const source = Array.from({ length: 200 }, (_, index) => paragraph(`Section ${String(index)}`)).join('\n');
    const pages = paginateMarkdown(source);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join('\n')).toBe(source);
    for (const page of pages) {
      expect(page.length).toBeLessThanOrEqual(LARGE_DOCUMENT_CHARS * 2 + 2000);
    }
  });

  it('keeps fenced code blocks balanced across pages', () => {
    const body = 'const value = 1;\n'.repeat(4000);
    const source = `# Intro\n\n${body}\n\`\`\`js\n${body}\`\`\`\n\nOutro\n`;
    const pages = paginateMarkdown(source);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      const fences = page.split('\n').filter((line) => /^\s*```/.test(line)).length;
      expect(fences % 2).toBe(0);
    }
  });

  it('keeps display math balanced across pages', () => {
    const body = 'x_1 + x_2 + x_3\n'.repeat(4000);
    const source = `Intro\n\n$$\n${body}$$\n\nOutro\n`;
    const pages = paginateMarkdown(source);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      const fences = page.split('\n').filter((line) => line.trim() === '$$').length;
      expect(fences % 2).toBe(0);
    }
  });
});

describe('computeMarkdownWindow', () => {
  const heights = new Array<number>(10).fill(100);

  it('renders the visible pages plus overscan and pads the rest', () => {
    expect(computeMarkdownWindow(heights, 0, 250, 1, 5)).toEqual({
      start: 0,
      end: 3,
      firstVisible: 0,
      paddingTop: 0,
      paddingBottom: 600,
    });
  });

  it('moves the window and padding while scrolling', () => {
    expect(computeMarkdownWindow(heights, 500, 250, 1, 5)).toEqual({
      start: 4,
      end: 8,
      firstVisible: 5,
      paddingTop: 400,
      paddingBottom: 100,
    });
  });

  it('caps the number of rendered pages', () => {
    const window = computeMarkdownWindow(heights, 500, 250, 2, 4);
    expect(window.end - window.start + 1).toBeLessThanOrEqual(4);
  });
});
