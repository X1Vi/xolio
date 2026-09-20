import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem.mjs';
import type { ReactElement } from 'react';
import Markdown, { type Components, type Options } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { getOrCreateMarkdown } from './markdownCache';
import { normalizeMathDelimiters } from './mathDelimiters';

const REMARK_PLUGINS: NonNullable<Options['remarkPlugins']> = [remarkGfm, remarkMath];
const REHYPE_PLUGINS: NonNullable<Options['rehypePlugins']> = [
  [rehypeKatex, { trust: false, maxExpand: 1000 }],
];

const COMPONENTS: Components = {
  img: ({ alt }) => <span className="ai-hint">[Image: {alt ?? 'external image blocked'}]</span>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

export function renderMarkdownElement(source: string): ReactElement {
  return Markdown({
    skipHtml: true,
    remarkPlugins: REMARK_PLUGINS,
    rehypePlugins: REHYPE_PLUGINS,
    components: COMPONENTS,
    children: source,
  });
}

export function renderMarkdown(text: string): ReactElement {
  return getOrCreateMarkdown(text, () => renderMarkdownElement(normalizeMathDelimiters(text)));
}

export function warmMarkdown(text: string): void {
  renderMarkdown(text);
}
