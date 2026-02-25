import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true, shareToken: true },
    });

    if (!discussion) {
      return NextResponse.json({ error: '讨论不存在' }, { status: 404 });
    }

    // If already has a token, return it
    if (discussion.shareToken) {
      return NextResponse.json({
        shareToken: discussion.shareToken,
        shareUrl: `/share/${discussion.shareToken}`,
      });
    }

    // Generate new token
    const shareToken = generateToken();
    await prisma.discussion.update({
      where: { id },
      data: { shareToken },
    });

    return NextResponse.json({
      shareToken,
      shareUrl: `/share/${shareToken}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '生成分享链接失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { shareToken: true },
    });

    if (!discussion) {
      return NextResponse.json({ error: '讨论不存在' }, { status: 404 });
    }

    if (!discussion.shareToken) {
      return NextResponse.json({ shareToken: null, shareUrl: null });
    }

    return NextResponse.json({
      shareToken: discussion.shareToken,
      shareUrl: `/share/${discussion.shareToken}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取分享信息失败: ' + (error as Error).message },
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

    await prisma.discussion.update({
      where: { id },
      data: { shareToken: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: '取消分享失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
