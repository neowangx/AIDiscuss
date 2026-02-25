import { NextResponse } from 'next/server';
import { generateSummary } from '@/lib/orchestrator/summary-generator';
import prisma from '@/lib/db';
import { extractProviderEntry } from '@/lib/llm/providers';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json(
        { error: '请先配置 API Key' },
        { status: 400 }
      );
    }

    const summary = await generateSummary(id, apiKey, provider, settings?.defaultModel, baseUrl);
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: '生成摘要失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
