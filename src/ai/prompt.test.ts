import { describe, expect, it } from 'vitest';
import { PROMPT_ACTIONS, buildSelectionPrompt, normalizeSelection } from './prompt';

describe('normalizeSelection', () => {
  it('collapses horizontal whitespace and extra blank lines', () => {
    expect(normalizeSelection('  hello   world\r\n\r\n\r\n\r\nnext  ')).toBe('hello world\n\nnext');
  });

  it('trims the result', () => {
    expect(normalizeSelection('\n\n  text  \n\n')).toBe('text');
  });
});

describe('buildSelectionPrompt', () => {
  it('includes the passage and the task', () => {
    const { prompt } = buildSelectionPrompt({
      selection: 'quantum physics',
      instructions: 'Explain it.',
      question: '',
    });
    expect(prompt).toContain('quantum physics');
    expect(prompt).toContain('Explain it.');
  });

  it('appends an optional question', () => {
    const { prompt } = buildSelectionPrompt({
      selection: 'some text',
      instructions: 'Explain.',
      question: 'Why?',
    });
    expect(prompt).toContain('Also answer this question: Why?');
  });

  it('truncates very long selections', () => {
    const { prompt } = buildSelectionPrompt({
      selection: 'a'.repeat(20000),
      instructions: 'Summarize.',
      question: '',
    });
    expect(prompt).toContain('[passage truncated]');
    expect(prompt.length).toBeLessThan(15000);
  });

  it('tells the model to use markdown, LaTeX math, and mhchem', () => {
    const { system } = buildSelectionPrompt({ selection: 'x', instructions: 'y', question: '' });
    expect(system).toMatch(/Markdown/);
    expect(system).toContain('$$');
    expect(system).toContain('\\ce');
  });
});

describe('PROMPT_ACTIONS', () => {
  it('ships the requested variants with concrete instructions', () => {
    const labels = PROMPT_ACTIONS.map((action) => action.label);
    expect(labels).toEqual(
      expect.arrayContaining(['Simplify', 'Explain', 'Summarize', 'Key points', 'Stress test']),
    );
    for (const action of PROMPT_ACTIONS) {
      expect(action.instruction.length).toBeGreaterThan(10);
    }
  });
});
