import type { ReactNode } from 'react';

interface UiIconProps {
  readonly name:
    | 'arrow-left'
    | 'bookmark'
    | 'books'
    | 'grid'
    | 'highlight'
    | 'library'
    | 'list'
    | 'moon'
    | 'open'
    | 'plus'
    | 'search'
    | 'share'
    | 'sparkles'
    | 'sun'
    | 'trash'
    | 'tune';
  readonly size?: number;
}

const paths: Record<UiIconProps['name'], ReactNode> = {
  'arrow-left': <path d="m15 18-6-6 6-6" />,
  bookmark: <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.6L6 21Z" />,
  books: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H10v16H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H14v16h3.5a2.5 2.5 0 0 1 2.5 2.5Z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  highlight: <><path d="m9 11 4 4L21 7l-4-4Z" /><path d="m6 14-3 7 7-3" /><path d="M14 19h7" /></>,
  library: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
  open: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
  sparkles: <><path d="m12 3-1 3.5L7.5 8l3.5 1.5 1 3.5 1.5-3.5L17 8l-3.5-1.5Z" /><path d="m5 14-.7 2.3L2 17l2.3.7L5 20l.7-2.3L8 17l-2.3-.7Z" /><path d="m19 13-.5 1.5L17 15l1.5.5L19 17l.5-1.5L21 15l-1.5-.5Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
  tune: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
};

export function UiIcon({ name, size = 16 }: UiIconProps) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
