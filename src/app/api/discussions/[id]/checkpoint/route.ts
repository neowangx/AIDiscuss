import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { roundId, optionId, customInstruction } = body;

    if (!roundId || !optionId) {
      return NextResponse.json(
        { error: '缺少 roundId 或 optionId' },
        { status: 400 }
      );
    }

    // Verify discussion exists and is in checkpoint state
    const discussion = await prisma.discussion.findUnique({
      where: { id },
    });

    if (!discussion) {
      return NextResponse.json({ error: '讨论不存在' }, { status: 404 });
    }

    if (discussion.status !== 'checkpoint') {
      return NextResponse.json(
        { error: '讨论不在检查点状态' },
        { status: 400 }
      );
    }

    // Verify and update the checkpoint round
    const round = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round || !round.isCheckpoint) {
      return NextResponse.json(
        { error: '无效的检查点' },
        { status: 400 }
      );
    }

    // Save the boss's response
    await prisma.round.update({
      where: { id: roundId },
      data: {
        checkpointResponse: JSON.stringify({ optionId, customInstruction }),
      },
    });

    // Handle boss decision
    let newStatus = 'running';

    if (optionId === 'continue') {
      // Continue to next phase — status running, phase already advanced by engine
      newStatus = 'running';
    } else if (optionId === 'deepen') {
      // Stay in current phase — roll back the phase advancement
      await prisma.discussion.update({
        where: { id },
        data: {
          currentPhase: Math.max(0, discussion.currentPhase - 1),
        },
      });
      newStatus = 'running';
    } else if (optionId === 'redirect') {
      // Redirect — save instruction as a user message, keep phase as is
      if (customInstruction) {
        await prisma.message.create({
          data: {
            discussionId: id,
            type: 'user',
            content: `[Boss 指令] ${customInstruction}`,
          },
        });
      }
      newStatus = 'running';
    }

    // Resume discussion
    await prisma.discussion.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      optionId,
      newStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '处理检查点反馈失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
