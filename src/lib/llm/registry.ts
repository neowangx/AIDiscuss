import { LLMProvider, LLMMessage, LLMConfig, LLMStreamChunk } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { getProviderById } from './providers';

class LLMRegistry {
  private anthropicProvider = new AnthropicProvider();
  private openaiProvider = new OpenAIProvider();

  resolveProvider(providerId: string): { provider: LLMProvider; baseUrl?: string } {
    const config = getProviderById(providerId);

    if (!config) {
      // Unknown provider (custom) — assume OpenAI-compatible
      // baseUrl will be provided via LLMConfig from the caller
      return { provider: this.openaiProvider };
    }

    if (config.type === 'anthropic') {
      return { provider: this.anthropicProvider };
    }

    // openai-compatible: use OpenAI provider with custom baseUrl
    return { provider: this.openaiProvider, baseUrl: config.baseUrl };
  }

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    const { provider, baseUrl } = this.resolveProvider(config.provider);
    return provider.chat(messages, { ...config, baseUrl: config.baseUrl || baseUrl });
  }

  stream(messages: LLMMessage[], config: LLMConfig): AsyncIterable<LLMStreamChunk> {
    const { provider, baseUrl } = this.resolveProvider(config.provider);
    return provider.stream(messages, { ...config, baseUrl: config.baseUrl || baseUrl });
  }
}

export const llm = new LLMRegistry();
export type { LLMMessage, LLMConfig, LLMStreamChunk };
