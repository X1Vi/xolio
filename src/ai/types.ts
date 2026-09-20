export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'openrouter'
  | 'groq'
  | 'ollama'
  | 'custom';

export interface AiConfig {
  readonly providerId: ProviderId;
  readonly model: string;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly remember: boolean;
}
