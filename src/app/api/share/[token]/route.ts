import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const discussion = await prisma.discussion.findUnique({
      where: { shareToken: token },
      include: {
        roles: { orderBy: { orderIndex: 'asc' } },
        messages: {
          include: { role: true },
          orderBy: { createdAt: 'asc' },
        },
        rounds: { orderBy: { roundNumber: 'asc' } },
        framework: true,
      },
    });

    if (!discussion) {
      return NextResponse.json({ error: '分享链接无效或已过期' }, { status: 404 });
    }

    const result = {
      ...discussion,
      framework: discussion.framework
        ? {
            ...discussion.framework,
            phases: JSON.parse(discussion.framework.phases),
            triggers: JSON.parse(discussion.framework.triggers),
          }
        : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: '获取分享内容失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
