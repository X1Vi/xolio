import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_DISPLAY_SETTINGS } from '../lib/display';
import { DisplaySettings } from './DisplaySettings';

describe('DisplaySettings', () => {
  it('marks the active options pressed', () => {
    render(
      <DisplaySettings
        settings={{ fontSize: 'lg', lineSpacing: 'normal', width: 'wide', textColor: null }}
        theme="dark"
        onChange={() => undefined}
        onReset={() => undefined}
      />,
    );

    expect(
      within(screen.getByRole('group', { name: 'Text size' })).getByRole('button', { name: 'Large' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Text color' })).getByRole('button', { name: 'Theme' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Text size' })).getByRole('button', { name: 'Medium' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      within(screen.getByRole('group', { name: 'Line spacing' })).getByRole('button', {
        name: 'Normal',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Page width' })).getByRole('button', { name: 'Wide' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports changes for every control and resets', () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    render(
      <DisplaySettings
        settings={DEFAULT_DISPLAY_SETTINGS}
        theme="dark"
        onChange={onChange}
        onReset={onReset}
      />,
    );

    fireEvent.click(
      within(screen.getByRole('group', { name: 'Text size' })).getByRole('button', { name: 'Extra large' }),
    );
    expect(onChange).toHaveBeenCalledWith({ fontSize: 'xl' });

    fireEvent.click(
      within(screen.getByRole('group', { name: 'Line spacing' })).getByRole('button', { name: 'Relaxed' }),
    );
    expect(onChange).toHaveBeenCalledWith({ lineSpacing: 'relaxed' });

    fireEvent.click(
      within(screen.getByRole('group', { name: 'Page width' })).getByRole('button', { name: 'Narrow' }),
    );
    expect(onChange).toHaveBeenCalledWith({ width: 'narrow' });

    fireEvent.change(screen.getByLabelText('Custom text color'), {
      target: { value: '#f0f0f0' },
    });
    expect(onChange).toHaveBeenCalledWith({ textColor: '#f0f0f0' });

    fireEvent.click(
      within(screen.getByRole('group', { name: 'Text color' })).getByRole('button', { name: 'Theme' }),
    );
    expect(onChange).toHaveBeenCalledWith({ textColor: null });

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
