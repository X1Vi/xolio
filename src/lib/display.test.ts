import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DISPLAY_SETTINGS,
  displayCssVars,
  epubDisplayStyles,
  isReaderDisplaySettings,
  loadDisplaySettings,
  readerTextColor,
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
    const settings = {
      fontSize: 'xl',
      lineSpacing: 'relaxed',
      width: 'narrow',
      textColor: '#e8e8ea',
    } as const;
    saveDisplaySettings(settings);
    expect(loadDisplaySettings()).toEqual(settings);
  });

  it('loads settings stored before text color existed', () => {
    window.localStorage.setItem(
      'reader-display',
      JSON.stringify({ fontSize: 'sm', lineSpacing: 'compact', width: 'wide' }),
    );
    expect(loadDisplaySettings()).toEqual({
      fontSize: 'sm',
      lineSpacing: 'compact',
      width: 'wide',
      textColor: null,
    });
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
    expect(
      isReaderDisplaySettings({
        fontSize: 'sm',
        lineSpacing: 'normal',
        width: 'wide',
        textColor: null,
      }),
    ).toBe(true);
    expect(
      isReaderDisplaySettings({
        fontSize: 'sm',
        lineSpacing: 'normal',
        width: 'wide',
        textColor: 'red',
      }),
    ).toBe(false);
  });

  it('exposes css variables for reflowable content', () => {
    const vars = displayCssVars({
      fontSize: 'lg',
      lineSpacing: 'compact',
      width: 'wide',
      textColor: '#f5f5f5',
    });
    expect(vars).toMatchObject({
      '--reader-font-size': '1.14rem',
      '--reader-line-height': '1.45',
      '--reader-width': '58rem',
      '--reader-text-color': '#f5f5f5',
    });
    expect(displayCssVars(DEFAULT_DISPLAY_SETTINGS)).not.toHaveProperty('--reader-text-color');
  });

  it('builds light and dark epub styles that follow the settings', () => {
    const display = {
      fontSize: 'sm',
      lineSpacing: 'normal',
      width: 'narrow',
      textColor: null,
    } as const;
    const light = epubDisplayStyles('light', display);
    const dark = epubDisplayStyles('dark', display);
    expect(light['body']?.['padding']).toBe('0 11%');
    expect(light['body']?.['font-size']).toBe('92%');
    expect(light['body']?.['line-height']).toBe('1.7');
    expect(light['body']?.['color']).toBe('#1b1b1f !important');
    expect(dark['body']?.['background']).toBe('#1b1d22');
    expect(dark['body']?.['color']).toBe('#e8e8ea !important');
    expect(dark['a, a:link, a:visited']?.['color']).toBe('#9db7ff !important');
    expect(dark['a:hover, a:focus, a:active']?.['color']).toBe('#c3d4ff !important');
  });

  it('applies a custom epub text color and never red link hovers', () => {
    const display = {
      fontSize: 'md',
      lineSpacing: 'normal',
      width: 'normal',
      textColor: '#f0f0f0',
    } as const;
    const styles = epubDisplayStyles('dark', display);
    expect(styles['body']?.['color']).toBe('#f0f0f0 !important');
    expect(styles['a:hover, a:focus, a:active']?.['color']).not.toContain('red');
    expect(readerTextColor('dark', display)).toBe('#f0f0f0');
    expect(readerTextColor('dark', DEFAULT_DISPLAY_SETTINGS)).toBe('#e8e8ea');
    expect(readerTextColor('light', DEFAULT_DISPLAY_SETTINGS)).toBe('#1b1b1f');
  });
});
