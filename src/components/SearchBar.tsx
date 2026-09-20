import type { RefObject } from 'react';

export type SearchStatus = 'idle' | 'searching' | 'ready';

interface SearchBarProps {
  readonly query: string;
  readonly status: SearchStatus;
  readonly current: number;
  readonly total: number;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onQueryChange: (query: string) => void;
  readonly onSubmit: () => void;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onClose: () => void;
}

export function SearchBar(props: SearchBarProps) {
  const {
    query,
    status,
    current,
    total,
    inputRef,
    onQueryChange,
    onSubmit,
    onNext,
    onPrevious,
    onClose,
  } = props;

  const statusLabel =
    status === 'searching'
      ? 'Searching…'
      : status === 'ready'
        ? total === 0
          ? 'No results'
          : `${String(current + 1)} of ${String(total)}`
        : '';

  return (
    <div className="search-bar" role="search">
      <input
        ref={inputRef}
        className="search-input"
        type="search"
        value={query}
        placeholder="Search in book"
        aria-label="Search in book"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          onQueryChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) {
              onPrevious();
            } else {
              onSubmit();
            }
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      />
      <span className="search-status" aria-live="polite">
        {statusLabel}
      </span>
      <button
        type="button"
        className="icon-button"
        onClick={onPrevious}
        disabled={total === 0}
        aria-label="Previous match"
      >
        Prev
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={onNext}
        disabled={total === 0}
        aria-label="Next match"
      >
        Next
      </button>
      <button type="button" className="icon-button" onClick={onClose} aria-label="Close search">
        Close
      </button>
    </div>
  );
}
