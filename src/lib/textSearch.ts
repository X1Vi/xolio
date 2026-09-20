const BLOCK_SELECTOR = [
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
].join(',');

const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE']);

interface CharLocation {
  readonly node: Text;
  readonly offset: number;
}

interface TextIndex {
  readonly text: string;
  readonly locations: readonly CharLocation[];
}

function normalizeNode(value: string): { text: string; sourceIndexes: number[] } {
  const chars: string[] = [];
  const sourceIndexes: number[] = [];
  let pendingSpace = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === undefined) {
      continue;
    }
    if (/\s/.test(char)) {
      pendingSpace = chars.length > 0;
      continue;
    }
    if (pendingSpace) {
      chars.push(' ');
      sourceIndexes.push(index);
      pendingSpace = false;
    }
    chars.push(char);
    sourceIndexes.push(index);
  }
  return { text: chars.join(''), sourceIndexes };
}

function buildIndex(unit: Element): TextIndex {
  const walker = unit.ownerDocument.createTreeWalker(unit, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      const parent = node.parentElement;
      if (parent === null || IGNORED_TAGS.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let text = '';
  const locations: CharLocation[] = [];
  let previous: Text | null = null;
  let previousEndedWithSpace = false;

  let current = walker.nextNode();
  while (current !== null) {
    if (current instanceof Text && current.data.length > 0) {
      const node = current;
      const raw = node.data;
      const normalized = normalizeNode(raw);
      if (normalized.text.length > 0) {
        const startsWithSpace = /^\s/.test(raw);
        if (previous !== null && (previousEndedWithSpace || startsWithSpace)) {
          text += ' ';
          locations.push({ node: previous, offset: previous.data.length });
        }
        for (let index = 0; index < normalized.text.length; index += 1) {
          const char = normalized.text[index];
          const sourceIndex = normalized.sourceIndexes[index];
          if (char !== undefined && sourceIndex !== undefined) {
            text += char;
            locations.push({ node, offset: sourceIndex });
          }
        }
        previous = node;
      }
      previousEndedWithSpace = /\s$/.test(raw);
    }
    current = walker.nextNode();
  }

  return { text, locations };
}

function collectUnits(root: ParentNode): Element[] {
  const top: ParentNode = root instanceof Document ? root.body : root;
  const units: Element[] = [];
  const queue: Element[] = [...top.children];
  while (queue.length > 0) {
    const element = queue.pop();
    if (element === undefined) {
      continue;
    }
    if (element.querySelector(BLOCK_SELECTOR) === null) {
      units.push(element);
    } else {
      queue.push(...element.children);
    }
  }

  if (units.length === 0 && top instanceof Element) {
    units.push(top);
  }
  return units;
}

export function findTextRanges(root: ParentNode, query: string): Range[] {
  const needle = query.replace(/\s+/g, ' ').trim().toLowerCase();
  if (needle.length === 0) {
    return [];
  }

  const ranges: Range[] = [];
  for (const unit of collectUnits(root)) {
    const { text, locations } = buildIndex(unit);
    if (text.length === 0) {
      continue;
    }
    const haystack = text.toLowerCase();
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) {
        break;
      }
      const start = locations[at];
      const end = locations[at + needle.length - 1];
      if (start !== undefined && end !== undefined) {
        const range = unit.ownerDocument.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset + 1);
        ranges.push(range);
      }
      from = at + needle.length;
    }
  }
  return ranges;
}
