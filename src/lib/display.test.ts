import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DISPLAY_SETTINGS,
  displayCssVars,
  epubDisplayStyles,
  isReaderDisplaySettings,
  loadDisplaySettings,
  saveDisplaySettings,
} from './display';

beforeEach(() => {
  window.localStorage.clear();
});

describe('reader display settings', () => {
  it('loads defaults when nothing is stored', () => {
    expect(loadDisplaySettings()).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  it('round-trips valid settings through storage', () => {
    const settings = { fontSize: 'xl', lineSpacing: 'relaxed', width: 'narrow' } as const;
    saveDisplaySettings(settings);
    expect(loadDisplaySettings()).toEqual(settings);
  });

  it('falls back to defaults for malformed stored settings', () => {
    window.localStorage.setItem(
      'reader-display',
      JSON.stringify({ fontSize: 'huge', lineSpacing: 'normal', width: 'normal' }),
    );
    expect(loadDisplaySettings()).toEqual(DEFAULT_DISPLAY_SETTINGS);
    expect(isReaderDisplaySettings('nope')).toBe(false);
    expect(isReaderDisplaySettings(null)).toBe(false);
    expect(isReaderDisplaySettings({ fontSize: 'sm' })).toBe(false);
    expect(isReaderDisplaySettings({ fontSize: 'sm', lineSpacing: 'normal', width: 'wide' })).toBe(
      true,
    );
  });

  it('exposes css variables for reflowable content', () => {
    const vars = displayCssVars({ fontSize: 'lg', lineSpacing: 'compact', width: 'wide' });
    expect(vars).toMatchObject({
      '--reader-font-size': '1.14rem',
      '--reader-line-height': '1.45',
      '--reader-width': '58rem',
    });
  });

  it('builds light and dark epub styles that follow the settings', () => {
    const display = { fontSize: 'sm', lineSpacing: 'normal', width: 'narrow' } as const;
    const light = epubDisplayStyles('light', display);
    const dark = epubDisplayStyles('dark', display);
    expect(light['body']?.['padding']).toBe('0 11%');
    expect(light['body']?.['font-size']).toBe('92%');
    expect(light['body']?.['line-height']).toBe('1.7');
    expect(dark['body']?.['background']).toBe('#1b1d22');
    expect(dark['a']?.['color']).toBe('#9db7ff');
  });
});
