import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { exportToMarkdown } from '@/lib/export/markdown';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'markdown';

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

    const data = {
      ...discussion,
      framework: discussion.framework
        ? {
            ...discussion.framework,
            phases: JSON.parse(discussion.framework.phases),
            triggers: JSON.parse(discussion.framework.triggers),
          }
        : null,
    };

    if (format === 'json') {
      const jsonContent = JSON.stringify(data, null, 2);
      return new Response(jsonContent, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(discussion.title)}.json"`,
        },
      });
    }

    // Default: markdown
    const markdown = exportToMarkdown(data as never);
    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(discussion.title)}.md"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '导出失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
