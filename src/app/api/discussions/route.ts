import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    const user = await getSession();

    // Build where: if user is logged in, show their discussions + unowned ones
    // If not logged in, show only unowned discussions
    const userFilter = user
      ? { OR: [{ userId: user.id }, { userId: null }] }
      : { userId: null };

    const where = search
      ? {
          AND: [
            userFilter,
            {
              OR: [
                { title: { contains: search } },
                { topic: { contains: search } },
              ],
            },
          ],
        }
      : userFilter;

    const [discussions, total] = await Promise.all([
      prisma.discussion.findMany({
        where,
        include: {
          roles: { orderBy: { orderIndex: 'asc' } },
          framework: true,
          _count: { select: { messages: true, rounds: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.discussion.count({ where }),
    ]);

    const result = discussions.map(d => ({
      ...d,
      framework: d.framework
        ? { ...d.framework, phases: JSON.parse(d.framework.phases), triggers: JSON.parse(d.framework.triggers) }
        : null,
      messageCount: d._count.messages,
      roundCount: d._count.rounds,
    }));

    return NextResponse.json({ discussions: result, total, page, pageSize });
  } catch (error) {
    return NextResponse.json(
      { error: '获取讨论列表失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, topic, frameworkId, mode, roles, goals } = body;

    if (!topic) {
      return NextResponse.json({ error: '请输入讨论主题' }, { status: 400 });
    }

    const user = await getSession();

    // For smart mode, initialize smartConfig
    const isSmartMode = mode === 'smart';
    const initialSmartConfig = isSmartMode
      ? JSON.stringify({
          roundsSinceSummary: 0,
          lastSummaryRoundNumber: 0,
          contextDigest: '',
          pendingUserPullIn: false,
        })
      : null;

    const discussion = await prisma.discussion.create({
      data: {
        title: title || topic.slice(0, 50),
        topic,
        ...(frameworkId ? { framework: { connect: { id: frameworkId } } } : {}),
        ...(user ? { user: { connect: { id: user.id } } } : {}),
        mode: mode || 'spectator',
        status: 'created',
        goals: goals ? JSON.stringify(goals) : null,
        smartConfig: initialSmartConfig,
        roles: {
          create: (roles || []).map((role: Record<string, unknown>, i: number) => ({
            name: role.name as string,
            title: role.title as string,
            avatar: (role.avatar as string) || null,
            expertise: role.expertise as string,
            personality: role.personality as string,
            speakingStyle: role.speakingStyle as string,
            principles: role.principles as string,
            humanName: (role.humanName as string) || null,
            actionStyle: (role.actionStyle as string) || null,
            backgroundStory: (role.backgroundStory as string) || null,
            roleType: (role.roleType as string) || 'participant',
            abilities: role.abilities ? JSON.stringify(role.abilities) : null,
            modelProvider: (role.modelProvider as string) || 'anthropic',
            modelId: (role.modelId as string) || 'claude-sonnet-4-20250514',
            color: (role.color as string) || '#6366f1',
            orderIndex: i,
          })),
        },
      },
      include: {
        roles: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
    });

    const result = {
      ...discussion,
      framework: discussion.framework
        ? { ...discussion.framework, phases: JSON.parse(discussion.framework.phases), triggers: JSON.parse(discussion.framework.triggers) }
        : null,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: '创建讨论失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
