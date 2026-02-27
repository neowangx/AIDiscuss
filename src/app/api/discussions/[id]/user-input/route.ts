import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { answer } = body;

    if (!answer) {
      return NextResponse.json({ error: '请输入回答' }, { status: 400 });
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id },
    });

    if (!discussion) {
      return NextResponse.json({ error: '讨论不存在' }, { status: 404 });
    }

    if (discussion.status !== 'waiting_user') {
      return NextResponse.json({ error: '讨论当前不在等待用户输入状态' }, { status: 400 });
    }

    // Save user message
    await prisma.message.create({
      data: {
        discussionId: id,
        type: 'user',
        content: answer,
      },
    });

    // Update smartConfig and status
    let smartConfig = { roundsSinceSummary: 0, lastSummaryRoundNumber: 0, contextDigest: '', pendingUserPullIn: false };
    try {
      if (discussion.smartConfig) {
        smartConfig = { ...smartConfig, ...JSON.parse(discussion.smartConfig) };
      }
    } catch { /* use default */ }

    smartConfig.pendingUserPullIn = false;

    await prisma.discussion.update({
      where: { id },
      data: {
        status: 'running',
        smartConfig: JSON.stringify(smartConfig),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: '用户输入处理失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
