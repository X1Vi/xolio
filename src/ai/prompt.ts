export interface PromptAction {
  readonly id: string;
  readonly label: string;
  readonly instruction: string;
}

export const PROMPT_ACTIONS: readonly PromptAction[] = [
  {
    id: 'simplify',
    label: 'Simplify',
    instruction:
      'Rewrite the passage in plain, simple language. Keep every fact and the original meaning intact.',
  },
  {
    id: 'explain',
    label: 'Explain',
    instruction:
      'Explain the passage clearly, defining any jargon, symbols, or terms a general reader may not know.',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    instruction:
      'Summarize the passage in a few bullet points, preserving the key claims, names, and numbers.',
  },
  {
    id: 'keypoints',
    label: 'Key points',
    instruction:
      'List the key points of the passage as short bullets, then one sentence on why they matter.',
  },
  {
    id: 'stresstest',
    label: 'Stress test',
    instruction:
      'Stress-test the passage: state its strongest claim, then list weaknesses, missing evidence, counterexamples, and the questions a critical reader should ask.',
  },
];

export const CUSTOM_QUESTION_INSTRUCTION =
  'Answer the question about the selected passage accurately and concisely.';

const MAX_SELECTION_CHARS = 12000;

const SYSTEM_PROMPT = [
  'You are a reading assistant inside an ebook reader.',
  'Treat the passage as the primary source. If it does not contain the answer, say so briefly and then answer from general knowledge, clearly marked as such.',
  'Format your answer as Markdown.',
  'Write mathematics in LaTeX inside $...$ or $$...$$ so it can be rendered by KaTeX.',
  'Write chemical formulas and equations with mhchem syntax, for example \\ce{H2O} or \\ce{2H2 + O2 -> 2H2O}.',
  'Be concise and use plain language.',
].join(' ');

export function normalizeSelection(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface SelectionPromptInput {
  readonly selection: string;
  readonly instructions: string;
  readonly question: string;
}

export interface SelectionPrompt {
  readonly system: string;
  readonly prompt: string;
}

export function buildSelectionPrompt(input: SelectionPromptInput): SelectionPrompt {
  const normalized = normalizeSelection(input.selection);
  const passage =
    normalized.length > MAX_SELECTION_CHARS
      ? `${normalized.slice(0, MAX_SELECTION_CHARS)}\n[passage truncated]`
      : normalized;
  const question = input.question.trim();
  const extra = question === '' ? '' : `\n\nAlso answer this question: ${question}`;
  return {
    system: SYSTEM_PROMPT,
    prompt: `Passage:\n"""\n${passage}\n"""\n\nTask: ${input.instructions}${extra}`,
  };
}
