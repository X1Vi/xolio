import { beforeEach, describe, expect, it } from 'vitest';
import {
  AI_PANEL_WIDTH_KEY,
  DEFAULT_AI_PANEL_WIDTH,
  MAX_AI_PANEL_WIDTH,
  MIN_AI_PANEL_WIDTH,
  clampAiPanelWidth,
  loadAiPanelWidth,
  maxAiPanelWidth,
  saveAiPanelWidth,
} from './panelWidth';

beforeEach(() => {
  window.localStorage.clear();
});

describe('clampAiPanelWidth', () => {
  it('keeps widths inside the allowed range', () => {
    expect(clampAiPanelWidth(MIN_AI_PANEL_WIDTH - 100, 1440)).toBe(MIN_AI_PANEL_WIDTH);
    expect(clampAiPanelWidth(MAX_AI_PANEL_WIDTH + 100, 1440)).toBe(MAX_AI_PANEL_WIDTH);
    expect(clampAiPanelWidth(500, 1440)).toBe(500);
  });

  it('leaves room for the reading area on narrow screens', () => {
    expect(clampAiPanelWidth(700, 900)).toBe(580);
    expect(clampAiPanelWidth(700, 500)).toBe(MIN_AI_PANEL_WIDTH);
  });

  it('falls back to the default for invalid numbers', () => {
    expect(clampAiPanelWidth(Number.NaN, 1440)).toBe(DEFAULT_AI_PANEL_WIDTH);
  });

  it('reports the current upper bound', () => {
    expect(maxAiPanelWidth(1440)).toBe(MAX_AI_PANEL_WIDTH);
    expect(maxAiPanelWidth(900)).toBe(580);
  });
});

describe('panel width persistence', () => {
  it('defaults when nothing is stored', () => {
    expect(loadAiPanelWidth()).toBe(DEFAULT_AI_PANEL_WIDTH);
  });

  it('round-trips a saved width', () => {
    saveAiPanelWidth(512);
    expect(window.localStorage.getItem(AI_PANEL_WIDTH_KEY)).toBe('512');
    expect(loadAiPanelWidth()).toBe(512);
  });

  it('ignores malformed stored values', () => {
    window.localStorage.setItem(AI_PANEL_WIDTH_KEY, 'not-a-number');
    expect(loadAiPanelWidth()).toBe(DEFAULT_AI_PANEL_WIDTH);
  });
});
