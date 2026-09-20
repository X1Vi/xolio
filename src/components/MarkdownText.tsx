import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem.mjs';
import rehypeKatex from 'rehype-katex';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface MarkdownTextProps {
  readonly text: string;
  readonly className?: string | undefined;
}

export function MarkdownText({ text, className }: MarkdownTextProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { trust: false, maxExpand: 1000 }]]}
        components={{
          img: ({ alt }) => <span className="ai-hint">[Image: {alt ?? 'external image blocked'}]</span>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
