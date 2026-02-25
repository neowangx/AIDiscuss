import { NextResponse } from 'next/server';
import { analyzeTopic } from '@/lib/orchestrator/topic-analyzer';
import prisma from '@/lib/db';
import { getProviderById, extractProviderEntry } from '@/lib/llm/providers';

export async function POST(request: Request) {
  try {
    const { topic } = await request.json();
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: '请输入讨论主题' }, { status: 400 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { id: 'default' },
    });

    const provider = settings?.defaultProvider || 'anthropic';

    // Get API key from providerKeys JSON (with legacy fallback)
    let rawKeys: Record<string, unknown> = {};
    try {
      rawKeys = JSON.parse(settings?.providerKeys || '{}');
    } catch {
      rawKeys = {};
    }
    if (settings?.anthropicApiKey && !rawKeys.anthropic) {
      rawKeys.anthropic = settings.anthropicApiKey;
    }
    if (settings?.openaiApiKey && !rawKeys.openai) {
      rawKeys.openai = settings.openaiApiKey;
    }

    const entry = extractProviderEntry(provider, rawKeys[provider]);
    let apiKey = entry?.key;
    const baseUrl = entry?.baseUrl;

    apiKey = apiKey
      || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : undefined)
      || (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined);

    if (!apiKey) {
      const providerConfig = getProviderById(provider);
      const name = providerConfig?.name || provider;
      return NextResponse.json(
        { error: `请先在设置中配置 ${name} 的 API Key` },
        { status: 400 }
      );
    }

    const analysis = await analyzeTopic(topic, apiKey, provider, settings?.defaultModel, baseUrl);

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: '主题分析失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
