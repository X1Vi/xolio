import { memo, useMemo } from 'react';
import { normalizeMathDelimiters } from '../lib/mathDelimiters';
import { renderMarkdown, renderMarkdownElement } from '../lib/markdownRenderer';

interface MarkdownTextProps {
  readonly text: string;
  readonly className?: string | undefined;
  readonly cache?: boolean | undefined;
}

export const MarkdownText = memo(function MarkdownText({
  text,
  className,
  cache = false,
}: MarkdownTextProps) {
  const element = useMemo(
    () => (cache ? renderMarkdown(text) : renderMarkdownElement(normalizeMathDelimiters(text))),
    [text, cache],
  );
  return <div className={className}>{element}</div>;
});
