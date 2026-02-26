import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAllProviders, isCustomProviderEntry } from '@/lib/llm/providers';

export async function GET() {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      // Migrate from env vars if available
      const initialKeys: Record<string, string> = {};
      if (process.env.ANTHROPIC_API_KEY) initialKeys.anthropic = process.env.ANTHROPIC_API_KEY;
      if (process.env.OPENAI_API_KEY) initialKeys.openai = process.env.OPENAI_API_KEY;

      settings = await prisma.userSettings.create({
        data: {
          id: 'default',
          anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
          openaiApiKey: process.env.OPENAI_API_KEY || '',
          providerKeys: JSON.stringify(initialKeys),
        },
      });
    }

    // Build providerKeys: merge legacy fields into JSON
    const rawKeys = parseProviderKeys(settings);

    // Build masked response + configuredProviders
    const maskedKeys: Record<string, unknown> = {};
    const configuredProviders: string[] = [];

    for (const [id, value] of Object.entries(rawKeys)) {
      const masked = maskEntry(value);
      if (masked !== undefined) {
        maskedKeys[id] = masked;
        configuredProviders.push(id);
      }
    }

    // Return merged provider list (builtin + custom)
    const allProviders = getAllProviders(rawKeys);

    return NextResponse.json({
      providerKeys: maskedKeys,
      configuredProviders,
      defaultProvider: settings.defaultProvider,
      defaultModel: settings.defaultModel,
      language: settings.language,
      autoPlaySpeed: settings.autoPlaySpeed,
      providers: allProviders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取设置失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    // Handle providerKeys update
    if (body.providerKeys && typeof body.providerKeys === 'object') {
      // Get existing keys
      const existing = await prisma.userSettings.findUnique({
        where: { id: 'default' },
      });
      const existingKeys = existing ? parseProviderKeys(existing) : {};

      // Merge: skip masked values, update real ones
      const newKeys: Record<string, unknown> = { ...existingKeys };

      for (const [id, value] of Object.entries(body.providerKeys as Record<string, unknown>)) {
        if (value === null) {
          // Explicit delete
          delete newKeys[id];
        } else if (isCustomProviderEntry(value)) {
          // Custom provider entry (has name)
          mergeCustomEntry(newKeys, existingKeys, id, value);
        } else if (typeof value === 'object' && value !== null && 'key' in value) {
          // Builtin override entry: { key, baseUrl? }
          mergeBuiltinObjectEntry(newKeys, existingKeys, id, value as { key: string; baseUrl?: string });
        } else if (typeof value === 'string') {
          // Plain string key
          if (value === '') {
            delete newKeys[id];
          } else if (!value.includes('***')) {
            newKeys[id] = value;
          }
          // If masked, skip (keep existing)
        }
      }

      data.providerKeys = JSON.stringify(newKeys);

      // Keep legacy fields in sync
      const anthKey = getKeyFromEntry(newKeys.anthropic);
      const oaiKey = getKeyFromEntry(newKeys.openai);
      if (anthKey !== undefined) data.anthropicApiKey = anthKey || null;
      if (oaiKey !== undefined) data.openaiApiKey = oaiKey || null;
    }

    if (body.defaultProvider) data.defaultProvider = body.defaultProvider;
    if (body.defaultModel) data.defaultModel = body.defaultModel;
    if (body.language) data.language = body.language;
    if (body.autoPlaySpeed !== undefined) data.autoPlaySpeed = body.autoPlaySpeed;

    const settings = await prisma.userSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });

    const rawKeys = parseProviderKeys(settings);
    const maskedKeys: Record<string, unknown> = {};
    const configuredProviders: string[] = [];

    for (const [id, value] of Object.entries(rawKeys)) {
      const masked = maskEntry(value);
      if (masked !== undefined) {
        maskedKeys[id] = masked;
        configuredProviders.push(id);
      }
    }

    const allProviders = getAllProviders(rawKeys);

    return NextResponse.json({
      providerKeys: maskedKeys,
      configuredProviders,
      defaultProvider: settings.defaultProvider,
      defaultModel: settings.defaultModel,
      language: settings.language,
      autoPlaySpeed: settings.autoPlaySpeed,
      providers: allProviders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '保存设置失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ── helpers ──

/** Parse providerKeys JSON, merging legacy anthropicApiKey/openaiApiKey fields */
function parseProviderKeys(settings: {
  providerKeys: string;
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
}): Record<string, unknown> {
  let keys: Record<string, unknown> = {};
  try {
    keys = JSON.parse(settings.providerKeys || '{}');
  } catch {
    keys = {};
  }
  if (settings.anthropicApiKey && !keys.anthropic) {
    keys.anthropic = settings.anthropicApiKey;
  }
  if (settings.openaiApiKey && !keys.openai) {
    keys.openai = settings.openaiApiKey;
  }
  return keys;
}

/** Extract the raw key string from any entry format */
function getKeyFromEntry(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry !== null && 'key' in entry) return (entry as { key: string }).key;
  return undefined;
}

/** Mask an entry for the GET response. Returns undefined if entry has no key. */
function maskEntry(value: unknown): unknown {
  if (isCustomProviderEntry(value)) {
    if (!value.key) return undefined;
    const v = value as { name: string; baseUrl: string; key: string; model?: string };
    return {
      name: v.name, baseUrl: v.baseUrl, key: maskKey(v.key),
      ...(v.model ? { model: v.model } : {}),
    };
  }
  if (typeof value === 'object' && value !== null && 'key' in value) {
    const obj = value as { key: string; baseUrl?: string; model?: string };
    if (!obj.key) return undefined;
    return {
      key: maskKey(obj.key),
      ...(obj.baseUrl ? { baseUrl: obj.baseUrl } : {}),
      ...(obj.model ? { model: obj.model } : {}),
    };
  }
  if (typeof value === 'string' && value) {
    return maskKey(value);
  }
  return undefined;
}

/** Merge a custom provider entry (with name) into newKeys */
function mergeCustomEntry(
  newKeys: Record<string, unknown>,
  existingKeys: Record<string, unknown>,
  id: string,
  value: { name: string; baseUrl: string; key: string; model?: string }
) {
  const existingKey = getKeyFromEntry(existingKeys[id]);
  const entry = {
    name: value.name,
    baseUrl: value.baseUrl,
    key: '',
    ...(value.model ? { model: value.model } : {}),
  };
  if (value.key && value.key.includes('***') && existingKey) {
    entry.key = existingKey;
    newKeys[id] = entry;
  } else if (value.key && !value.key.includes('***')) {
    entry.key = value.key;
    newKeys[id] = entry;
  }
}

/** Merge a builtin override entry { key, baseUrl?, model? } into newKeys */
function mergeBuiltinObjectEntry(
  newKeys: Record<string, unknown>,
  existingKeys: Record<string, unknown>,
  id: string,
  value: { key: string; baseUrl?: string; model?: string }
) {
  const existingKey = getKeyFromEntry(existingKeys[id]);
  let realKey: string;

  if (value.key.includes('***') && existingKey) {
    realKey = existingKey;
  } else if (value.key && !value.key.includes('***')) {
    realKey = value.key;
  } else {
    return; // no usable key
  }

  const hasExtras = value.baseUrl || value.model;
  if (hasExtras) {
    newKeys[id] = {
      key: realKey,
      ...(value.baseUrl ? { baseUrl: value.baseUrl } : {}),
      ...(value.model ? { model: value.model } : {}),
    };
  } else {
    newKeys[id] = realKey; // no override, store as plain string
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return '***';
  return key.slice(0, 4) + '***' + key.slice(-4);
}
