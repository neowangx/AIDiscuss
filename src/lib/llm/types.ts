export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMStreamChunk {
  type: 'text' | 'done' | 'error';
  content?: string;
  error?: string;
}

export interface LLMProvider {
  name: string;
  chat(messages: LLMMessage[], config: LLMConfig): Promise<string>;
  stream(messages: LLMMessage[], config: LLMConfig): AsyncIterable<LLMStreamChunk>;
}
