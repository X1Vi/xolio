import { describe, expect, it } from 'vitest';
import { findTextRanges } from './textSearch';

function render(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('findTextRanges', () => {
  it('finds case-insensitive matches', () => {
    const container = render('<p>The Quick Brown Fox</p>');
    expect(findTextRanges(container, 'quick')).toHaveLength(1);
    expect(findTextRanges(container, 'QUICK BROWN')).toHaveLength(1);
  });

  it('finds every occurrence in a block', () => {
    const container = render('<p>one two one two one</p>');
    expect(findTextRanges(container, 'one')).toHaveLength(3);
    expect(findTextRanges(container, 'two')).toHaveLength(2);
  });

  it('matches across inline elements', () => {
    const container = render('<p>hello <em>dark</em> world</p>');
    expect(findTextRanges(container, 'hello dark world')).toHaveLength(1);
  });

  it('does not match across block boundaries', () => {
    const container = render('<p>alpha</p><p>beta</p>');
    expect(findTextRanges(container, 'alpha beta')).toHaveLength(0);
  });

  it('normalizes whitespace inside the document', () => {
    const container = render('<p>line one\n      line two</p>');
    expect(findTextRanges(container, 'line one line two')).toHaveLength(1);
  });

  it('ignores script and style content', () => {
    const container = render('<p>visible</p><script>visible</script><style>visible</style>');
    expect(findTextRanges(container, 'visible')).toHaveLength(1);
  });

  it('returns no ranges for a blank query', () => {
    const container = render('<p>alpha</p>');
    expect(findTextRanges(container, '   ')).toHaveLength(0);
  });

  it('selects the exact matched text', () => {
    const container = render('<p>the quick fox</p>');
    const [range] = findTextRanges(container, 'quick');
    expect(range?.toString()).toBe('quick');
  });
});
