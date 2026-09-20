import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText', () => {
  it('blocks images from books and AI responses without requesting their URLs', () => {
    const { container } = render(<MarkdownText text={'![tracking](https://example.com/pixel?passage=private)'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('tracking');
  });

  it('does not render raw HTML or executable links', () => {
    const { container } = render(<MarkdownText text={'<script>alert(1)</script>\n\n[click](javascript:alert%281%29)'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).not.toContain('javascript:');
  });
  it('renders standard markdown', () => {
    const { container } = render(<MarkdownText text={'# Title\n\n**bold**'} />);
    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.querySelector('strong')?.textContent).toBe('bold');
  });

  it('renders math with KaTeX', () => {
    const { container } = render(<MarkdownText text={'$a^2 + b^2 = c^2$'} />);
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('renders chemical equations with mhchem', () => {
    const { container } = render(<MarkdownText text={'$\\ce{2H2 + O2 -> 2H2O}$'} />);
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.textContent).toContain('H');
  });

  it('renders LaTeX bracket and parenthesis math delimiters', () => {
    const { container } = render(
      <MarkdownText text={'Before\n\n\\[\nE = mc^2 \\tag{1}\n\\]\n\nThe value \\(x^2\\) matters.'} />,
    );
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(container.querySelectorAll('.katex').length).toBe(2);
    expect(container.textContent).toContain('Before');
    expect(container.textContent).toContain('matters.');
  });

  it('leaves math delimiters inside code untouched', () => {
    const { container } = render(<MarkdownText text={'`\\[x\\]` and\n\n```\n\\(y\\)\n```'} />);
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.textContent).toContain('\\[x\\]');
    expect(container.textContent).toContain('\\(y\\)');
  });

  it('renders multi-line display math whose closing fence follows content', () => {
    const { container } = render(<MarkdownText text={'$$f_t = x,\n\\qquad (2)$$'} />);
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(container.querySelector('.katex-error')).toBeNull();
  });
});
