import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage, LLMConfig, LLMStreamChunk } from './types';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    const client = new Anthropic({ apiKey: config.apiKey });
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      system: systemMessage?.content || '',
      messages: chatMessages,
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text || '';
  }

  async *stream(messages: LLMMessage[], config: LLMConfig): AsyncIterable<LLMStreamChunk> {
    const client = new Anthropic({ apiKey: config.apiKey });
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const stream = client.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      system: systemMessage?.content || '',
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield { type: 'text', content: delta.text };
        }
      }
    }
    yield { type: 'done' };
  }
}
