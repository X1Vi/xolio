import { generateText } from 'ai';
import { useCallback, useRef, useState } from 'react';
import { describeAiError } from '../ai/errors';
import {
  CUSTOM_QUESTION_INSTRUCTION,
  PROMPT_ACTIONS,
  type PromptAction,
} from '../ai/prompt';
import { PROVIDERS, createLanguageModel, getPreset, resolveModelName } from '../ai/providers';
import { useAiConfig, validateConfig } from '../ai/settings';
import type { ProviderId } from '../ai/types';
import { useAiQuery } from '../ai/useAiQuery';
import type { SelectionInfo } from '../lib/marks';
import { MarkdownText } from './MarkdownText';

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

const CUSTOM_MODEL_VALUE = '__custom__';

interface AiPanelProps {
  readonly selection: SelectionInfo;
  readonly onClose: () => void;
}

export function AiPanel({ selection, onClose }: AiPanelProps) {
  const { config, updateConfig, resetConfig } = useAiConfig();
  const [settingsOpen, setSettingsOpen] = useState(() => validateConfig(config) !== null);
  const [question, setQuestion] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const answerRef = useRef<HTMLElement>(null);
  const { answer, status, error, ask, stop } = useAiQuery(config);
  const [trackedSelection, setTrackedSelection] = useState(selection.text);
  if (trackedSelection !== selection.text) {
    setTrackedSelection(selection.text);
    setQuestion('');
    setLastAction(null);
  }

  const preset = getPreset(config.providerId);
  const validation = validateConfig(config);
  const modelName = resolveModelName(config);
  const hasSelection = selection.text.trim() !== '';
  const modelOptions = preset.suggestedModels;
  const modelInList = modelOptions.includes(config.model);
  const selectValue = modelInList
    ? config.model
    : config.model === '' && modelOptions.includes(preset.defaultModel)
      ? preset.defaultModel
      : CUSTOM_MODEL_VALUE;

  const run = useCallback(
    (instructions: string, label: string, customQuestion = '') => {
      if (validateConfig(config) !== null) {
        setSettingsOpen(true);
        return;
      }
      setLastAction(label);
      answerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      void ask(selection.text, instructions, customQuestion);
    },
    [ask, config, selection.text],
  );

  const testConnection = useCallback(() => {
    const check = validateConfig(config);
    if (check !== null) {
      setTestStatus('error');
      setTestMessage(check);
      return;
    }
    setTestStatus('testing');
    setTestMessage(null);
    void (async () => {
      try {
        const model = await createLanguageModel(config);
        await generateText({
          model,
          prompt: 'Reply with the single word: OK',
          maxOutputTokens: 8,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(30_000),
        });
        setTestStatus('ok');
        setTestMessage('Connected.');
      } catch (cause) {
        setTestStatus('error');
        setTestMessage(describeAiError(cause));
      }
    })();
  }, [config]);

  return (
    <aside className="ai-panel" aria-label="Ask AI">
      <div className="ai-panel-header">
        <div className="ai-panel-title-block">
          <span className="ai-panel-title">Ask AI</span>
          <span className="ai-panel-subtitle">{`${preset.label} · ${modelName}`}</span>
        </div>
        <div className="toolbar-group">
          <button
            type="button"
            className="icon-button"
            aria-expanded={settingsOpen}
            onClick={() => {
              setSettingsOpen((open) => !open);
            }}
          >
            Settings
          </button>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close AI panel">
            Close
          </button>
        </div>
      </div>

      <div className="ai-panel-body">
        {settingsOpen && (
          <section className="ai-settings">
            <label className="ai-field">
              <span>Provider</span>
              <select
                value={config.providerId}
                onChange={(event) => {
                  updateConfig({ providerId: event.target.value as ProviderId, model: '' });
                  setTestStatus('idle');
                  setTestMessage(null);
                }}
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="ai-field">
              <span>Model</span>
              <select
                value={selectValue}
                onChange={(event) => {
                  const value = event.target.value;
                  updateConfig({ model: value === CUSTOM_MODEL_VALUE ? '' : value });
                }}
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                <option value={CUSTOM_MODEL_VALUE}>Custom model…</option>
              </select>
            </label>
            {selectValue === CUSTOM_MODEL_VALUE && (
              <label className="ai-field">
                <span>Custom model name</span>
                <input
                  value={config.model}
                  placeholder={preset.defaultModel === '' ? 'model name' : preset.defaultModel}
                  spellCheck={false}
                  onChange={(event) => {
                    updateConfig({ model: event.target.value });
                  }}
                />
              </label>
            )}

            <label className="ai-field">
              <span>API key {preset.requiresApiKey ? '' : '(optional)'}</span>
              <input
                type="password"
                value={config.apiKey}
                placeholder={preset.apiKeyHint}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  updateConfig({ apiKey: event.target.value });
                  setTestStatus('idle');
                  setTestMessage(null);
                }}
              />
            </label>

            {(preset.requiresBaseUrl || preset.baseUrlEditable) && (
              <label className="ai-field">
                <span>Base URL</span>
                <input
                  value={config.baseUrl}
                  placeholder={preset.defaultBaseUrl}
                  spellCheck={false}
                  onChange={(event) => {
                    updateConfig({ baseUrl: event.target.value });
                    setTestStatus('idle');
                    setTestMessage(null);
                  }}
                />
              </label>
            )}

            {preset.corsNote !== undefined && <p className="ai-hint ai-warning">{preset.corsNote}</p>}

            <label className="ai-checkbox">
              <input
                type="checkbox"
                checked={config.remember}
                onChange={(event) => {
                  updateConfig({ remember: event.target.checked });
                }}
              />
              <span>Remember on this device</span>
            </label>

            <div className="ai-settings-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  stop();
                  resetConfig();
                  setTestStatus('idle');
                  setTestMessage(null);
                }}
              >
                Clear AI settings
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={testConnection}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' ? 'Testing…' : 'Test connection'}
              </button>
              {testStatus === 'ok' && testMessage !== null && (
                <span className="ai-ok">{testMessage}</span>
              )}
              {testStatus === 'error' && testMessage !== null && (
                <span className="ai-inline-error">{testMessage}</span>
              )}
            </div>

            <p className="ai-hint">
              Your selected passage and question are sent to the chosen provider or endpoint when
              you ask. Keys are kept in memory unless you enable Remember, which saves them
              unencrypted in this browser. Only use an endpoint you trust. Changing it clears the key.
            </p>
          </section>
        )}

        <section className="ai-selection">
          <span className="ai-section-label">Selected text</span>
          {hasSelection ? (
            <>
              <blockquote className="ai-quote">{selection.text}</blockquote>
              <p className="ai-hint">{`${selection.text.length.toLocaleString()} characters selected.`}</p>
            </>
          ) : (
            <p className="ai-hint">Select a passage in the book to ask about it.</p>
          )}
        </section>

        <section className="ai-question">
          <span className="ai-section-label">Ask about this passage</span>
          <div className="ai-action-grid">
            {PROMPT_ACTIONS.map((action: PromptAction) => (
              <button
                key={action.id}
                type="button"
                className="icon-button"
                disabled={!hasSelection}
                onClick={() => {
                  run(action.instruction, action.label, question);
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
          <label className="ai-field">
            <span>Custom question (optional)</span>
            <textarea
              rows={2}
              value={question}
              placeholder="e.g. Which assumptions does this argument rely on?"
              onChange={(event) => {
                setQuestion(event.target.value);
              }}
            />
          </label>
          <div className="ai-actions">
            {status === 'streaming' ? (
              <button type="button" className="icon-button" onClick={stop}>
                Stop
              </button>
            ) : (
              <button
                type="button"
                className="primary-button ai-ask"
                onClick={() => {
                  run(CUSTOM_QUESTION_INSTRUCTION, 'Custom question', question);
                }}
                disabled={!hasSelection || question.trim() === ''}
              >
                Ask
              </button>
            )}
            {validation !== null && <span className="ai-inline-error">{validation}</span>}
          </div>
        </section>

        <section ref={answerRef} className="ai-answer-section" aria-live="polite">
          <span className="ai-section-label">
            {lastAction === null ? 'Answer' : `Answer · ${lastAction}`}
          </span>
          {error !== null && <div className="ai-error">{error}</div>}
          {answer === '' && error === null && (
            <p className="ai-hint">
              {status === 'streaming' ? 'Waiting for the model…' : 'The answer will appear here.'}
            </p>
          )}
          {answer !== '' && <MarkdownText text={answer} className="ai-answer" />}
        </section>
      </div>
    </aside>
  );
}
