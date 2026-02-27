import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { runDiscussionRound } from '@/lib/orchestrator/discussion-engine';
import { runSmartRound } from '@/lib/orchestrator/smart-engine';
import { FrameworkDefinition, DiscussionGoals, SmartConfig } from '@/types';
import { parseProviderConfigs } from '@/lib/llm/providers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const userInstruction = body.instruction as string | undefined;

    // Get discussion with all related data
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      include: {
        roles: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
    });

    if (!discussion) {
      return NextResponse.json({ error: '讨论不存在' }, { status: 404 });
    }

    // Get API keys from providerKeys JSON (with legacy fallback)
    const settings = await prisma.userSettings.findUnique({
      where: { id: 'default' },
    });

    let rawKeys: Record<string, unknown> = {};
    try {
      rawKeys = JSON.parse(settings?.providerKeys || '{}');
    } catch {
      rawKeys = {};
    }
    // Legacy fallback
    if (settings?.anthropicApiKey && !rawKeys.anthropic) {
      rawKeys.anthropic = settings.anthropicApiKey;
    }
    if (settings?.openaiApiKey && !rawKeys.openai) {
      rawKeys.openai = settings.openaiApiKey;
    }
    // Env var fallback
    if (!rawKeys.anthropic && process.env.ANTHROPIC_API_KEY) {
      rawKeys.anthropic = process.env.ANTHROPIC_API_KEY;
    }
    if (!rawKeys.openai && process.env.OPENAI_API_KEY) {
      rawKeys.openai = process.env.OPENAI_API_KEY;
    }

    // Parse into providerConfigs with key + baseUrl
    const providerConfigs = parseProviderConfigs(
      rawKeys as Record<string, string | { name: string; baseUrl: string; key: string }>
    );

    // Parse framework
    let framework: FrameworkDefinition | undefined;
    if (discussion.framework) {
      framework = {
        ...discussion.framework,
        phases: JSON.parse(discussion.framework.phases),
        triggers: JSON.parse(discussion.framework.triggers),
      };
    }

    // Save user message if instruction provided
    if (userInstruction) {
      await prisma.message.create({
        data: {
          discussionId: id,
          type: 'user',
          content: userInstruction,
        },
      });
    }

    // Update status to running
    await prisma.discussion.update({
      where: { id },
      data: { status: 'running' },
    });

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const mappedRoles = discussion.roles.map(r => ({
            ...r,
            avatar: r.avatar ?? undefined,
            humanName: r.humanName ?? undefined,
            actionStyle: r.actionStyle ?? undefined,
            backgroundStory: r.backgroundStory ?? undefined,
            roleType: (r.roleType as 'participant' | 'summarizer') || 'participant',
            abilities: r.abilities ? JSON.parse(r.abilities) as string[] : undefined,
          }));

          // Smart mode branch
          const isSmartMode = discussion.mode === 'smart';
          let generator;

          if (isSmartMode) {
            // Parse goals and smartConfig
            let goals: DiscussionGoals = { primaryGoal: discussion.topic, subGoals: [], clarified: true };
            try {
              if (discussion.goals) goals = JSON.parse(discussion.goals);
            } catch { /* use default */ }

            let smartConfig: SmartConfig = {
              roundsSinceSummary: 0,
              lastSummaryRoundNumber: 0,
              contextDigest: '',
              pendingUserPullIn: false,
            };
            try {
              if (discussion.smartConfig) smartConfig = { ...smartConfig, ...JSON.parse(discussion.smartConfig) };
            } catch { /* use default */ }

            generator = runSmartRound({
              discussionId: id,
              topic: discussion.topic,
              roles: mappedRoles,
              goals,
              smartConfig,
              roundNumber: discussion.currentRound,
              providerConfigs,
              userInstruction,
            });
          } else {
            generator = runDiscussionRound({
              discussionId: id,
              topic: discussion.topic,
              roles: mappedRoles,
              framework,
              currentPhase: discussion.currentPhase,
              roundNumber: discussion.currentRound,
              userInstruction,
              providerConfigs,
              mode: discussion.mode as 'spectator' | 'moderator' | 'boss_checkin',
            });
          }

          for await (const event of generator) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          const errorEvent = {
            type: 'error',
            data: { error: (error as Error).message },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '启动讨论轮次失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
