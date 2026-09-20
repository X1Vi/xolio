interface HighlightRegistry {
  set(name: string, highlight: object): void;
  delete(name: string): void;
}

type HighlightConstructor = new (...ranges: Range[]) => object;

function getHighlightApi(): {
  Highlight: HighlightConstructor;
  highlights: HighlightRegistry;
} | null {
  const globalScope = globalThis as {
    Highlight?: unknown;
    CSS?: { highlights?: unknown };
  };
  const Constructor = globalScope.Highlight;
  const registry = globalScope.CSS?.highlights;
  if (typeof Constructor !== 'function' || registry === undefined || registry === null) {
    return null;
  }
  return {
    Highlight: Constructor as HighlightConstructor,
    highlights: registry as HighlightRegistry,
  };
}

export function applyHighlights(name: string, ranges: readonly Range[]): void {
  const api = getHighlightApi();
  if (api === null) {
    return;
  }
  if (ranges.length === 0) {
    api.highlights.delete(name);
    return;
  }
  api.highlights.set(name, new api.Highlight(...ranges));
}

export function clearHighlights(name: string): void {
  const api = getHighlightApi();
  if (api === null) {
    return;
  }
  api.highlights.delete(name);
}

export function scrollRangeIntoView(range: Range): void {
  const element = range.startContainer.parentElement;
  element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
