import { NextResponse } from 'next/server';
import { analyzeTopic } from '@/lib/orchestrator/topic-analyzer';
import prisma from '@/lib/db';
import { extractProviderEntry } from '@/lib/llm/providers';
import { getSession } from '@/lib/auth/session';

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

    // Get API key
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

    // 1. Analyze topic
    const analysis = await analyzeTopic(topic, apiKey, provider, settings?.defaultModel, baseUrl);

    // 2. Find framework
    const framework = await prisma.framework.findFirst({
      where: { name: analysis.recommendedFramework },
    });

    // 3. Create discussion with recommended config (spectator mode)
    const user = await getSession();

    const discussion = await prisma.discussion.create({
      data: {
        title: analysis.title || topic.slice(0, 50),
        topic,
        frameworkId: framework?.id || null,
        userId: user?.id || null,
        mode: 'spectator',
        status: 'created',
        roles: {
          create: analysis.suggestedRoles.map((role, i) => ({
            name: role.name,
            title: role.title,
            expertise: role.expertise,
            personality: role.personality,
            speakingStyle: role.speakingStyle,
            principles: role.principles,
            humanName: role.humanName || null,
            actionStyle: role.actionStyle || null,
            backgroundStory: role.backgroundStory || null,
            modelProvider: role.modelProvider || provider,
            modelId: role.modelId || settings?.defaultModel || 'claude-sonnet-4-20250514',
            color: role.color,
            orderIndex: i,
          })),
        },
      },
      include: {
        roles: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
    });

    return NextResponse.json({
      discussionId: discussion.id,
      title: discussion.title,
      rolesCount: discussion.roles.length,
      framework: framework?.displayName || analysis.recommendedFramework,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '快速启动失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
