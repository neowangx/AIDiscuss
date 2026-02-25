import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMConfig, LLMStreamChunk } from './types';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';

  async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
    });
    const response = await client.chat.completions.create({
      model: config.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  async *stream(messages: LLMMessage[], config: LLMConfig): AsyncIterable<LLMStreamChunk> {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
    });
    const stream = await client.chat.completions.create({
      model: config.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: 'text', content };
      }
    }
    yield { type: 'done' };
  }
}
