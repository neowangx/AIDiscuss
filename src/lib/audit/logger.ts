import prisma from '@/lib/db';

export async function logAudit(params: {
  discussionId?: string;
  action: string;
  actor?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        discussionId: params.discussionId || null,
        action: params.action,
        actor: params.actor || 'system',
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (error) {
    console.error('[AuditLog] 写入审计日志失败:', error);
  }
}
