import type { CSSProperties } from 'react';
import type { Theme } from '../hooks/useTheme';

export type ReaderFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type ReaderLineSpacing = 'compact' | 'normal' | 'relaxed';
export type ReaderWidth = 'narrow' | 'normal' | 'wide';

export interface ReaderDisplaySettings {
  readonly fontSize: ReaderFontSize;
  readonly lineSpacing: ReaderLineSpacing;
  readonly width: ReaderWidth;
}

export const DEFAULT_DISPLAY_SETTINGS: ReaderDisplaySettings = {
  fontSize: 'md',
  lineSpacing: 'normal',
  width: 'normal',
};

const DISPLAY_STORAGE_KEY = 'reader-display';

const FONT_SIZES: Record<ReaderFontSize, { readonly rem: string; readonly percent: string }> = {
  sm: { rem: '0.94rem', percent: '92%' },
  md: { rem: '1.02rem', percent: '100%' },
  lg: { rem: '1.14rem', percent: '112%' },
  xl: { rem: '1.28rem', percent: '126%' },
};

const LINE_SPACINGS: Record<ReaderLineSpacing, string> = {
  compact: '1.45',
  normal: '1.7',
  relaxed: '1.95',
};

const WIDTHS: Record<ReaderWidth, { readonly measure: string; readonly padding: string }> = {
  narrow: { measure: '38rem', padding: '11%' },
  normal: { measure: '46rem', padding: '6%' },
  wide: { measure: '58rem', padding: '2.5%' },
};

export const FONT_SIZE_OPTIONS: readonly {
  readonly value: ReaderFontSize;
  readonly label: string;
}[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
];

export const LINE_SPACING_OPTIONS: readonly {
  readonly value: ReaderLineSpacing;
  readonly label: string;
}[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
];

export const WIDTH_OPTIONS: readonly {
  readonly value: ReaderWidth;
  readonly label: string;
}[] = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isReaderDisplaySettings(value: unknown): value is ReaderDisplaySettings {
  if (!isRecord(value)) {
    return false;
  }
  return (
    FONT_SIZE_OPTIONS.some((option) => option.value === value['fontSize']) &&
    LINE_SPACING_OPTIONS.some((option) => option.value === value['lineSpacing']) &&
    WIDTH_OPTIONS.some((option) => option.value === value['width'])
  );
}

export function loadDisplaySettings(): ReaderDisplaySettings {
  try {
    const raw = window.localStorage.getItem(DISPLAY_STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_DISPLAY_SETTINGS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isReaderDisplaySettings(parsed) ? parsed : DEFAULT_DISPLAY_SETTINGS;
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

export function saveDisplaySettings(settings: ReaderDisplaySettings): void {
  try {
    window.localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage can be unavailable; the settings still work for this session
  }
}

/** CSS variables applied to the reader shell so reflowable content follows the display settings. */
export function displayCssVars(settings: ReaderDisplaySettings): CSSProperties {
  return {
    '--reader-font-size': FONT_SIZES[settings.fontSize].rem,
    '--reader-line-height': LINE_SPACINGS[settings.lineSpacing],
    '--reader-width': WIDTHS[settings.width].measure,
  } as CSSProperties;
}

/** Styles injected into the EPUB iframe document. */
export function epubDisplayStyles(
  theme: Theme,
  display: ReaderDisplaySettings,
): Record<string, Record<string, string>> {
  const dark = theme === 'dark';
  return {
    body: {
      background: dark ? '#1b1d22' : '#ffffff',
      color: dark ? '#e8e8ea' : '#1b1b1f',
      'font-size': FONT_SIZES[display.fontSize].percent,
      'line-height': LINE_SPACINGS[display.lineSpacing],
      padding: `0 ${WIDTHS[display.width].padding}`,
    },
    'p, li, blockquote': {
      'line-height': 'inherit',
    },
    a: {
      color: dark ? '#9db7ff' : '#2f6fed',
    },
  };
}
