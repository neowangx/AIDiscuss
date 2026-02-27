import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { analyzeGoals, refineGoals } from '@/lib/orchestrator/goal-analyzer';
import { generateSmartRoles } from '@/lib/orchestrator/smart-role-generator';
import { parseProviderConfigs } from '@/lib/llm/providers';
import { LLMConfig } from '@/lib/llm/types';
import { DiscussionGoals } from '@/types';

async function getLlmConfig(): Promise<LLMConfig | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { id: 'default' },
  });

  let rawKeys: Record<string, unknown> = {};
  try {
    rawKeys = JSON.parse(settings?.providerKeys || '{}');
  } catch {
    rawKeys = {};
  }

  // Legacy + env fallback
  if (settings?.anthropicApiKey && !rawKeys.anthropic) rawKeys.anthropic = settings.anthropicApiKey;
  if (settings?.openaiApiKey && !rawKeys.openai) rawKeys.openai = settings.openaiApiKey;
  if (!rawKeys.anthropic && process.env.ANTHROPIC_API_KEY) rawKeys.anthropic = process.env.ANTHROPIC_API_KEY;
  if (!rawKeys.openai && process.env.OPENAI_API_KEY) rawKeys.openai = process.env.OPENAI_API_KEY;

  const providerConfigs = parseProviderConfigs(
    rawKeys as Record<string, string | { name: string; baseUrl: string; key: string }>
  );

  // Use default provider from settings, or find any available
  const defaultProvider = settings?.defaultProvider || 'anthropic';
  const defaultModel = settings?.defaultModel || 'claude-sonnet-4-20250514';

  if (providerConfigs[defaultProvider]) {
    return {
      provider: defaultProvider,
      model: defaultModel,
      apiKey: providerConfigs[defaultProvider].key,
      baseUrl: providerConfigs[defaultProvider].baseUrl,
    };
  }

  // Fallback to any available
  for (const [id, config] of Object.entries(providerConfigs)) {
    if (config.key) {
      return {
        provider: id,
        model: config.model || defaultModel,
        apiKey: config.key,
        baseUrl: config.baseUrl,
      };
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, clarificationAnswer, existingGoals } = body;

    if (!topic) {
      return NextResponse.json({ error: '请输入讨论主题' }, { status: 400 });
    }

    const llmConfig = await getLlmConfig();
    if (!llmConfig) {
      return NextResponse.json({ error: '请先配置 API Key' }, { status: 400 });
    }

    // If this is a refinement call (user answered a clarification question)
    if (clarificationAnswer && existingGoals) {
      const result = await refineGoals(
        topic,
        existingGoals as DiscussionGoals,
        clarificationAnswer,
        llmConfig
      );

      // If goals are now clarified, also generate roles
      if (result.goals.clarified || !result.needsClarification) {
        const rolesResult = await generateSmartRoles(topic, result.goals, llmConfig);
        return NextResponse.json({
          ...result,
          roles: rolesResult,
        });
      }

      return NextResponse.json(result);
    }

    // First-time analysis
    const result = await analyzeGoals(topic, llmConfig);

    // If goals are already clear, generate roles immediately
    if (!result.needsClarification) {
      const rolesResult = await generateSmartRoles(topic, result.goals, llmConfig);
      return NextResponse.json({
        ...result,
        roles: rolesResult,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: '目标分析失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
