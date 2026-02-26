export interface ProviderConfig {
  id: string;
  name: string;
  type: 'anthropic' | 'openai-compatible';
  baseUrl?: string;
  defaultModel: string;
  keyPlaceholder: string;
}

/** A custom provider entry stored in providerKeys JSON (has `name`) */
export interface CustomProviderEntry {
  name: string;
  baseUrl: string;
  key: string;
}

/** Resolved provider config — either builtin or custom */
export interface ResolvedProvider {
  id: string;
  name: string;
  type: 'anthropic' | 'openai-compatible';
  baseUrl?: string;
  defaultModel: string;
  keyPlaceholder: string;
  isCustom: boolean;
}

export const BUILTIN_PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    type: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    keyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    type: 'openai-compatible',
    defaultModel: 'gpt-4o',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-4',
    keyPlaceholder: 'sk-or-...',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    type: 'openai-compatible',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
    keyPlaceholder: 'xxx.yyy',
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    type: 'openai-compatible',
    baseUrl: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k2.5',
    keyPlaceholder: 'sk-kimi-...',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    type: 'openai-compatible',
    baseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'MiniMax-Text-01',
    keyPlaceholder: 'eyJ...',
  },
  {
    id: 'qwen',
    name: '通义千问',
    type: 'openai-compatible',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    type: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    keyPlaceholder: 'ollama (任意值即可)',
  },
];

export function getProviderById(id: string): ProviderConfig | undefined {
  return BUILTIN_PROVIDERS.find(p => p.id === id);
}

export function getDefaultModelForProvider(providerId: string): string {
  const provider = getProviderById(providerId);
  return provider?.defaultModel || 'gpt-4o';
}

/** Custom provider: has name + baseUrl + key */
export function isCustomProviderEntry(value: unknown): value is CustomProviderEntry {
  return typeof value === 'object' && value !== null && 'name' in value && 'baseUrl' in value && 'key' in value;
}

/**
 * Extract key + baseUrl from any stored entry format:
 * - string: legacy API key only
 * - { key, baseUrl? }: builtin with optional baseUrl override
 * - { key, baseUrl, name }: custom provider
 */
export function extractProviderEntry(
  providerId: string,
  value: unknown
): { key: string; baseUrl?: string; model?: string } | undefined {
  if (typeof value === 'string' && value) {
    const builtin = getProviderById(providerId);
    return { key: value, baseUrl: builtin?.baseUrl };
  }
  if (typeof value === 'object' && value !== null && 'key' in value) {
    const obj = value as { key: string; baseUrl?: string; model?: string };
    if (!obj.key) return undefined;
    // Use explicit baseUrl from entry; fall back to builtin default
    const builtin = getProviderById(providerId);
    return {
      key: obj.key,
      baseUrl: obj.baseUrl || builtin?.baseUrl,
      ...(obj.model ? { model: obj.model } : {}),
    };
  }
  return undefined;
}

/** Parse the providerKeys JSON into a structured map of provider configs */
export function parseProviderConfigs(
  providerKeysJson: Record<string, unknown>
): Record<string, { key: string; baseUrl?: string; model?: string }> {
  const result: Record<string, { key: string; baseUrl?: string; model?: string }> = {};
  for (const [id, value] of Object.entries(providerKeysJson)) {
    const entry = extractProviderEntry(id, value);
    if (entry) result[id] = entry;
  }
  return result;
}

/** Get all providers (builtin + custom) for display */
export function getAllProviders(
  providerKeysJson: Record<string, unknown>
): ResolvedProvider[] {
  const providers: ResolvedProvider[] = BUILTIN_PROVIDERS.map(p => ({
    ...p,
    isCustom: false,
  }));

  // Add custom providers
  for (const [id, value] of Object.entries(providerKeysJson)) {
    if (isCustomProviderEntry(value)) {
      providers.push({
        id,
        name: value.name,
        type: 'openai-compatible',
        baseUrl: value.baseUrl,
        defaultModel: '',
        keyPlaceholder: 'API Key',
        isCustom: true,
      });
    }
  }

  return providers;
}
