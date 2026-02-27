import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const discussion = await prisma.discussion.findUnique({
      where: { id },
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
      return NextResponse.json({ error: '讨论不存在' }, { status: 404 });
    }

    // Parse JSON fields
    let goals = null;
    try {
      if (discussion.goals) goals = JSON.parse(discussion.goals);
    } catch { /* ignore */ }

    let smartConfig = null;
    try {
      if (discussion.smartConfig) smartConfig = JSON.parse(discussion.smartConfig);
    } catch { /* ignore */ }

    // Parse role abilities
    const roles = discussion.roles.map(r => ({
      ...r,
      abilities: r.abilities ? JSON.parse(r.abilities) : undefined,
    }));

    const result = {
      ...discussion,
      roles,
      goals,
      smartConfig,
      framework: discussion.framework
        ? { ...discussion.framework, phases: JSON.parse(discussion.framework.phases), triggers: JSON.parse(discussion.framework.triggers) }
        : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: '获取讨论失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check ownership if user is logged in
    const user = await getSession();
    if (user) {
      const existing = await prisma.discussion.findUnique({ where: { id }, select: { userId: true } });
      if (existing?.userId && existing.userId !== user.id) {
        return NextResponse.json({ error: '无权修改此讨论' }, { status: 403 });
      }
    }

    const data: Record<string, unknown> = {};
    if (body.mode !== undefined) data.mode = body.mode;
    if (body.status !== undefined) data.status = body.status;
    if (body.currentPhase !== undefined) data.currentPhase = body.currentPhase;
    if (body.currentRound !== undefined) data.currentRound = body.currentRound;
    if (body.summary !== undefined) data.summary = body.summary;
    if (body.title !== undefined) data.title = body.title;
    if (body.rating !== undefined) data.rating = body.rating;
    if (body.feedback !== undefined) data.feedback = body.feedback;

    const discussion = await prisma.discussion.update({
      where: { id },
      data,
      include: { roles: { orderBy: { orderIndex: 'asc' } } },
    });

    return NextResponse.json(discussion);
  } catch (error) {
    return NextResponse.json(
      { error: '更新讨论失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check ownership if user is logged in
    const user = await getSession();
    if (user) {
      const existing = await prisma.discussion.findUnique({ where: { id }, select: { userId: true } });
      if (existing?.userId && existing.userId !== user.id) {
        return NextResponse.json({ error: '无权删除此讨论' }, { status: 403 });
      }
    }

    await prisma.discussion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: '删除讨论失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
