import type { LanguageModel } from 'ai';
import type { AiConfig, ProviderId } from './types';

export interface ProviderPreset {
  readonly id: ProviderId;
  readonly label: string;
  readonly defaultModel: string;
  readonly suggestedModels: readonly string[];
  readonly requiresApiKey: boolean;
  readonly requiresBaseUrl: boolean;
  readonly baseUrlEditable: boolean;
  readonly defaultBaseUrl: string;
  readonly apiKeyHint: string;
  readonly corsNote?: string;
}

export const PROVIDERS: readonly ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
    requiresApiKey: true,
    requiresBaseUrl: false,
    baseUrlEditable: false,
    defaultBaseUrl: '',
    apiKeyHint: 'sk-…',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-sonnet-4-5',
    suggestedModels: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1'],
    requiresApiKey: true,
    requiresBaseUrl: false,
    baseUrlEditable: false,
    defaultBaseUrl: '',
    apiKeyHint: 'sk-ant-…',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    suggestedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    requiresApiKey: true,
    requiresBaseUrl: false,
    baseUrlEditable: false,
    defaultBaseUrl: '',
    apiKeyHint: 'AIza…',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultModel: 'deepseek-v4-flash',
    suggestedModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    requiresApiKey: true,
    requiresBaseUrl: false,
    baseUrlEditable: true,
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    apiKeyHint: 'sk-…',
    corsNote:
      'DeepSeek does not send CORS headers, so a static web app cannot call api.deepseek.com directly. Enter a proxy or gateway base URL, or use OpenRouter with a DeepSeek model instead.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
    suggestedModels: [
      'openai/gpt-4o-mini',
      'anthropic/claude-sonnet-4.5',
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    requiresApiKey: true,
    requiresBaseUrl: false,
    baseUrlEditable: false,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    apiKeyHint: 'sk-or-…',
  },
  {
    id: 'groq',
    label: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    requiresApiKey: true,
    requiresBaseUrl: false,
    baseUrlEditable: false,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    apiKeyHint: 'gsk_…',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    defaultModel: 'llama3.1',
    suggestedModels: ['llama3.1', 'qwen3', 'mistral', 'gemma3'],
    requiresApiKey: false,
    requiresBaseUrl: false,
    baseUrlEditable: false,
    defaultBaseUrl: 'http://localhost:11434/v1',
    apiKeyHint: 'not required',
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-compatible',
    defaultModel: '',
    suggestedModels: [],
    requiresApiKey: false,
    requiresBaseUrl: true,
    baseUrlEditable: true,
    defaultBaseUrl: '',
    apiKeyHint: 'optional',
  },
];

const CUSTOM_PRESET: ProviderPreset = {
  id: 'custom',
  label: 'Custom OpenAI-compatible',
  defaultModel: '',
  suggestedModels: [],
  requiresApiKey: false,
  requiresBaseUrl: true,
  baseUrlEditable: true,
  defaultBaseUrl: '',
  apiKeyHint: 'optional',
};

export function getPreset(id: ProviderId): ProviderPreset {
  const preset = PROVIDERS.find((candidate) => candidate.id === id);
  return preset ?? CUSTOM_PRESET;
}

export function resolveModelName(config: AiConfig): string {
  return config.model.trim() !== '' ? config.model.trim() : getPreset(config.providerId).defaultModel;
}

export function resolveBaseUrl(config: AiConfig): string {
  return config.baseUrl.trim() !== '' ? config.baseUrl.trim() : getPreset(config.providerId).defaultBaseUrl;
}

export async function createLanguageModel(config: AiConfig): Promise<LanguageModel> {
  const model = resolveModelName(config);
  const apiKey = config.apiKey.trim();

  switch (config.providerId) {
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({ apiKey })(model);
    }
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      return createAnthropic({
        apiKey,
        headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
      })(model);
    }
    case 'google': {
      const { createGoogle } = await import('@ai-sdk/google');
      return createGoogle({ apiKey })(model);
    }
    case 'deepseek':
    case 'openrouter':
    case 'groq':
    case 'ollama':
    case 'custom': {
      const { createOpenAICompatible } = await import('@ai-sdk/openai-compatible');
      const preset = getPreset(config.providerId);
      const baseURL = resolveBaseUrl(config);
      if (baseURL === '') {
        throw new Error(`Add a base URL for ${preset.label}.`);
      }
      const provider = createOpenAICompatible({
        name: preset.id,
        baseURL,
        ...(apiKey !== '' ? { apiKey } : {}),
      });
      return provider(model);
    }
  }
}
