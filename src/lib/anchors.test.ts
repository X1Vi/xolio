import { describe, expect, it } from 'vitest';
import { findAnchoredRange } from './anchors';

function render(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('findAnchoredRange', () => {
  it('finds a unique quote', () => {
    const root = render('<p>alpha beta gamma</p>');
    expect(findAnchoredRange(root, 'beta', '', '')?.toString()).toBe('beta');
  });

  it('returns null when the quote is missing', () => {
    const root = render('<p>alpha beta</p>');
    expect(findAnchoredRange(root, 'missing', '', '')).toBeNull();
  });

  it('uses context to disambiguate repeated quotes', () => {
    const root = render('<p>alpha target omega</p><p>beta target delta</p>');
    const range = findAnchoredRange(root, 'target', 'beta ', ' delta');
    expect(range).not.toBeNull();
    expect(range?.startContainer.parentElement?.textContent).toBe('beta target delta');
  });
});
