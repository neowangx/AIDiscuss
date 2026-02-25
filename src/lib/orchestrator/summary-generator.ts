import { llm } from '@/lib/llm/registry';
import { buildSummaryPrompt } from '@/lib/prompts/system';
import prisma from '@/lib/db';
import { getDefaultModelForProvider } from '@/lib/llm/providers';

export async function generateSummary(
  discussionId: string,
  apiKey: string,
  provider: string = 'anthropic',
  model?: string,
  baseUrl?: string
): Promise<string> {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId },
    include: {
      messages: {
        where: { type: 'ai' },
        include: { role: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!discussion) throw new Error('讨论不存在');

  const messages = discussion.messages.map(m => ({
    roleName: m.role?.name || '未知',
    content: m.content,
    phaseName: m.phaseName || undefined,
  }));

  const prompt = buildSummaryPrompt(discussion.topic, messages);
  const defaultModel = model || getDefaultModelForProvider(provider);

  const summary = await llm.chat(
    [
      { role: 'system', content: '你是一位专业的讨论摘要撰写者。请用结构化的中文输出。' },
      { role: 'user', content: prompt },
    ],
    {
      provider,
      model: defaultModel,
      apiKey,
      baseUrl,
      temperature: 0.3,
    }
  );

  await prisma.discussion.update({
    where: { id: discussionId },
    data: { summary, status: 'completed' },
  });

  return summary;
}
