import { describe, expect, it } from 'vitest';
import { normalizeMathDelimiters } from './mathDelimiters';

describe('normalizeMathDelimiters', () => {
  it('converts LaTeX bracket delimiters to display math', () => {
    expect(normalizeMathDelimiters('\\[\nE = mc^2\n\\]')).toBe('\n$$\n\nE = mc^2\n\n$$\n');
  });

  it('converts LaTeX parenthesis delimiters to inline math', () => {
    expect(normalizeMathDelimiters('value \\(x^2\\) here')).toBe('value $x^2$ here');
  });

  it('wraps dollar display math in its own fences', () => {
    expect(normalizeMathDelimiters('$$c+d$$')).toBe('\n$$\nc+d\n$$\n');
  });

  it('leaves single-dollar inline math unchanged', () => {
    const input = 'Inline $a+b$ math';
    expect(normalizeMathDelimiters(input)).toBe(input);
  });

  it('fixes display math whose closing fence is not at the line start', () => {
    const input = '$$f_t = x,\n\\qquad (2)$$';
    expect(normalizeMathDelimiters(input)).toBe('\n$$\nf_t = x,\n\\qquad (2)\n$$\n');
  });

  it('does not touch delimiters inside fenced code', () => {
    const input = '```\n\\(x\\)\n```';
    expect(normalizeMathDelimiters(input)).toBe(input);
  });

  it('does not touch delimiters inside inline code', () => {
    const input = 'use `\\[x\\]` and `$$y$$` literally';
    expect(normalizeMathDelimiters(input)).toBe(input);
  });

  it('keeps LaTeX line breaks before a bracket intact', () => {
    const input = String.raw`$$M=\begin{pmatrix}a\\[2pt]b\end{pmatrix}$$`;
    const body = String.raw`M=\begin{pmatrix}a\\[2pt]b\end{pmatrix}`;
    expect(normalizeMathDelimiters(input)).toBe(`\n$$\n${body}\n$$\n`);
  });
});
