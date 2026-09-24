import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../ai/settings';
import { useAiQuery } from '../ai/useAiQuery';
import { encryptVault } from '../ai/vault';
import type { SelectionInfo } from '../lib/marks';
import { AiPanel } from './AiPanel';

vi.mock('../ai/useAiQuery', () => ({ useAiQuery: vi.fn() }));

const ask = vi.fn(() => Promise.resolve());

const selection: SelectionInfo = {
  text: 'Some selected text',
  prefix: '',
  suffix: '',
  location: { kind: 'markdown', page: 0, label: 'Page 1' },
};

beforeEach(() => {
  window.localStorage.clear();
  ask.mockClear();
  vi.mocked(useAiQuery).mockReturnValue({
    answer: '',
    status: 'idle',
    error: null,
    ask,
    stop: vi.fn(),
    clear: vi.fn(),
  });
});

describe('AiPanel', () => {
  it('clears credentials and persistence when switching provider', () => {
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://example.com/v1' } });
    fireEvent.change(screen.getByLabelText(/API key/), { target: { value: 'test-credential' } });
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'deepseek' } });
    expect(screen.getByLabelText('API key')).toHaveValue('');
    expect(screen.getByLabelText('Base URL')).toHaveValue('');
    expect(window.localStorage.getItem('reader-ai-config')).toBeNull();
  });

  it('clears the key when a custom endpoint changes', () => {
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText(/API key/), { target: { value: 'test-credential' } });
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://example.com/v1' } });
    expect(screen.getByLabelText(/API key/)).toHaveValue('');
  });

  it('encrypts a saved key and clears the vault on request', async () => {
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'test-credential' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save key securely' }));
    fireEvent.change(screen.getByLabelText('Vault password'), {
      target: { value: 'a long local vault password' },
    });
    fireEvent.change(screen.getByLabelText('Confirm vault password'), {
      target: { value: 'a long local vault password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt and save' }));
    await waitFor(() => {
      expect(window.localStorage.getItem('reader-ai-vault')).not.toBeNull();
    });
    expect(window.localStorage.getItem('reader-ai-vault')).not.toContain('test-credential');
    fireEvent.click(screen.getByRole('button', { name: 'Clear AI settings' }));
    expect(screen.getByLabelText('API key')).toHaveValue('');
    expect(window.localStorage.getItem('reader-ai-config')).toBeNull();
    expect(window.localStorage.getItem('reader-ai-vault')).toBeNull();
  });

  it('unlocks a saved key once for the browser session', async () => {
    const password = 'a long local vault password';
    const envelope = await encryptVault({ ...defaultConfig(), apiKey: 'saved-secret' }, password);
    window.localStorage.setItem('reader-ai-vault', envelope);
    window.localStorage.setItem('reader-ai-config', JSON.stringify({
      providerId: 'openai', model: '', baseUrl: '', remember: true,
    }));

    render(<AiPanel selection={selection} onClose={() => undefined} />);
    expect(screen.getByText(/encrypted key is saved.*locked/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock saved key' }));
    fireEvent.change(screen.getByLabelText('Vault password'), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => {
      expect(screen.getByText(/unlocked for this session/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText('API key')).toHaveValue('saved-secret');
  });
  it('shows provider settings, prompt variants, and the selected text', () => {
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('API key')).toBeInTheDocument();
    expect(screen.getByText('Some selected text')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simplify' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stress test' })).toBeInTheDocument();
    expect(screen.getByText('OpenAI · gpt-4o-mini')).toBeInTheDocument();
  });

  it('warns about browser CORS when DeepSeek is selected', () => {
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'deepseek' } });
    expect(screen.getByText(/does not send CORS headers/)).toBeInTheDocument();
  });

  it('flags a missing API key when a prompt variant is clicked', () => {
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simplify' }));
    expect(screen.getByText(/Add an API key/)).toBeInTheDocument();
  });

  it('disables the custom Ask button until a question is typed', () => {
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    const ask = screen.getByRole('button', { name: 'Ask' });
    expect(ask).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Custom question (optional)'), {
      target: { value: 'Why?' },
    });
    expect(ask).toBeEnabled();
  });

  it('routes a preset action through the working custom-question path', () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    window.localStorage.setItem('reader-ai-config', JSON.stringify({
      providerId: 'openai',
      model: '',
      apiKey: 'test-credential',
      baseUrl: '',
      remember: true,
    }));
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Custom question (optional)'), {
      target: { value: 'Why?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simplify' }));
    expect(ask).toHaveBeenCalledWith(
      selection.text,
      expect.stringContaining('Rewrite the passage'),
      'Why?',
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    scrollIntoView.mockRestore();
  });

  it('lets a preset action replace a request whose stream is still open', () => {
    window.localStorage.setItem('reader-ai-config', JSON.stringify({
      providerId: 'deepseek',
      model: '',
      apiKey: 'test-credential',
      baseUrl: '',
      remember: true,
    }));
    vi.mocked(useAiQuery).mockReturnValue({
      answer: 'Previous answer',
      status: 'streaming',
      error: null,
      ask,
      stop: vi.fn(),
      clear: vi.fn(),
    });
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    const simplify = screen.getByRole('button', { name: 'Simplify' });
    expect(simplify).toBeEnabled();
    fireEvent.click(simplify);
    expect(ask).toHaveBeenCalledWith(
      selection.text,
      expect.stringContaining('Rewrite the passage'),
      '',
    );
  });

  it('includes nearby EPUB context only when simplifying', () => {
    window.localStorage.setItem('reader-ai-config', JSON.stringify({
      providerId: 'openai',
      model: '',
      apiKey: 'test-credential',
      baseUrl: '',
      remember: true,
    }));
    const epubSelection: SelectionInfo = {
      ...selection,
      aiContextBefore: 'Text from preceding pages.',
      aiContextAfter: 'Text from following pages.',
      location: { kind: 'epub', cfi: 'epubcfi(/6/2)', href: 'chapter.xhtml', label: 'Chapter' },
    };
    render(<AiPanel selection={epubSelection} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simplify' }));
    expect(ask).toHaveBeenCalledWith(
      expect.stringContaining('Text from preceding pages.'),
      expect.stringContaining('Rewrite only the marked passage'),
      '',
    );
    const calls = ask.mock.calls as unknown as readonly [string, string, string][];
    expect(calls[0]?.[0]).toContain('Text from following pages.');
    expect(calls[0]?.[0]).toContain(selection.text);
  });

  it('lets the model be chosen from a list', () => {
    render(<AiPanel selection={selection} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'gpt-4o' } });
    expect(screen.getByLabelText('Model')).toHaveValue('gpt-4o');
  });
});
