import { useEffect } from 'react';

export function usePageTurnKeys(previous: () => void, next: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        previous();
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        next();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [previous, next]);
}
