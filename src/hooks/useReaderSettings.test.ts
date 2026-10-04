import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DISPLAY_SETTINGS, loadDisplaySettings } from '../lib/display';
import { useReaderSettings } from './useReaderSettings';

beforeEach(() => {
  window.localStorage.clear();
});

describe('useReaderSettings', () => {
  it('persists changes and reloads them', () => {
    const { result } = renderHook(() => useReaderSettings());

    act(() => {
      result.current.updateSettings({ fontSize: 'xl', width: 'narrow' });
    });

    expect(result.current.settings).toEqual({
      fontSize: 'xl',
      lineSpacing: 'normal',
      width: 'narrow',
    });
    expect(loadDisplaySettings().fontSize).toBe('xl');

    act(() => {
      result.current.resetSettings();
    });
    expect(result.current.settings).toEqual(DEFAULT_DISPLAY_SETTINGS);
    expect(loadDisplaySettings()).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  it('starts from the stored settings', () => {
    window.localStorage.setItem(
      'reader-display',
      JSON.stringify({ fontSize: 'sm', lineSpacing: 'compact', width: 'wide' }),
    );
    const { result } = renderHook(() => useReaderSettings());
    expect(result.current.settings).toEqual({
      fontSize: 'sm',
      lineSpacing: 'compact',
      width: 'wide',
    });
  });
});
