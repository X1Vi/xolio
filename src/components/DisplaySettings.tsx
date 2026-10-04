import type { Theme } from '../hooks/useTheme';
import {
  FONT_SIZE_OPTIONS,
  LINE_SPACING_OPTIONS,
  WIDTH_OPTIONS,
  readerTextColor,
  type ReaderDisplaySettings,
} from '../lib/display';

interface DisplaySettingsProps {
  readonly settings: ReaderDisplaySettings;
  readonly theme: Theme;
  readonly onChange: (patch: Partial<ReaderDisplaySettings>) => void;
  readonly onReset: () => void;
}

export function DisplaySettings({ settings, theme, onChange, onReset }: DisplaySettingsProps) {
  return (
    <div className="display-settings" aria-label="Reader display settings">
      <div className="display-group" role="group" aria-label="Text size">
        <span className="display-group-label">Text size</span>
        <div className="view-toggle">
          {FONT_SIZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="icon-button"
              aria-pressed={settings.fontSize === option.value}
              onClick={() => {
                onChange({ fontSize: option.value });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="display-group" role="group" aria-label="Line spacing">
        <span className="display-group-label">Line spacing</span>
        <div className="view-toggle">
          {LINE_SPACING_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="icon-button"
              aria-pressed={settings.lineSpacing === option.value}
              onClick={() => {
                onChange({ lineSpacing: option.value });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="display-group" role="group" aria-label="Page width">
        <span className="display-group-label">Page width</span>
        <div className="view-toggle">
          {WIDTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="icon-button"
              aria-pressed={settings.width === option.value}
              onClick={() => {
                onChange({ width: option.value });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="display-group" role="group" aria-label="Text color">
        <span className="display-group-label">Text color</span>
        <input
          type="color"
          className="text-color-input"
          aria-label="Custom text color"
          value={readerTextColor(theme, settings)}
          onChange={(event) => {
            onChange({ textColor: event.target.value });
          }}
        />
        <button
          type="button"
          className="icon-button"
          aria-pressed={settings.textColor === null}
          onClick={() => {
            onChange({ textColor: null });
          }}
        >
          Theme
        </button>
      </div>
      <button type="button" className="icon-button display-reset" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
