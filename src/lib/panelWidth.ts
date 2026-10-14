export const AI_PANEL_WIDTH_KEY = 'reader-ai-panel-width';

/** Default width of the Ask AI panel in pixels (24rem at the default root size). */
export const DEFAULT_AI_PANEL_WIDTH = 384;

/** Smallest width the Ask AI panel can be dragged to (20rem). */
export const MIN_AI_PANEL_WIDTH = 320;

/** Largest width the Ask AI panel can grow to (45rem). */
export const MAX_AI_PANEL_WIDTH = 720;

/** Space the reading area always keeps available next to the panel, in pixels. */
const READER_MIN_WIDTH = 320;

/**
 * Clamps a desired panel width to the allowed range, also making sure the
 * reading area keeps a usable minimum on narrow screens.
 */
export function clampAiPanelWidth(
  width: number,
  viewportWidth: number = window.innerWidth,
): number {
  if (!Number.isFinite(width)) {
    return DEFAULT_AI_PANEL_WIDTH;
  }
  const roomForPanel = Math.max(MIN_AI_PANEL_WIDTH, viewportWidth - READER_MIN_WIDTH);
  const upper = Math.min(MAX_AI_PANEL_WIDTH, roomForPanel);
  return Math.round(Math.min(Math.max(width, MIN_AI_PANEL_WIDTH), upper));
}

/** Upper bound the panel can currently be resized to, used for ARIA hints. */
export function maxAiPanelWidth(viewportWidth: number = window.innerWidth): number {
  return clampAiPanelWidth(MAX_AI_PANEL_WIDTH, viewportWidth);
}

export function loadAiPanelWidth(): number {
  try {
    const raw = window.localStorage.getItem(AI_PANEL_WIDTH_KEY);
    if (raw === null) {
      return DEFAULT_AI_PANEL_WIDTH;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return DEFAULT_AI_PANEL_WIDTH;
    }
    return clampAiPanelWidth(parsed);
  } catch {
    return DEFAULT_AI_PANEL_WIDTH;
  }
}

export function saveAiPanelWidth(width: number): void {
  try {
    window.localStorage.setItem(AI_PANEL_WIDTH_KEY, String(clampAiPanelWidth(width)));
  } catch {
    // storage can be unavailable; the width still applies for this session
  }
}
