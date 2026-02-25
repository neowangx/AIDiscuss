import { llm } from '@/lib/llm/registry';
import { LLMConfig } from '@/lib/llm/types';
import { CheckpointOption } from '@/types';
import prisma from '@/lib/db';

interface CheckpointResult {
  summary: string;
  options: CheckpointOption[];
}

/**
 * Generate a checkpoint summary for the current phase, plus suggested next-step options for the boss.
 */
export async function generateCheckpoint(
  discussionId: string,
  phaseIndex: number,
  phaseName: string,
  llmConfig: LLMConfig
): Promise<CheckpointResult> {
  // Fetch recent messages for this phase
  const messages = await prisma.message.findMany({
    where: {
      discussionId,
      type: 'ai',
      phase: phaseIndex,
    },
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  });

  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId },
    include: { framework: true },
  });

  if (!discussion) throw new Error('讨论不存在');

  const messageContext = messages.map(m =>
    `**${m.role?.humanName || m.role?.name || '未知'}**: ${m.content.slice(0, 500)}`
  ).join('\n\n');

  // Build framework context
  let frameworkContext = '';
  if (discussion.framework) {
    const phases = JSON.parse(discussion.framework.phases) as Array<{
      displayName: string;
      description: string;
    }>;
    const currentPhaseInfo = phases[phaseIndex];
    const nextPhaseInfo = phases[phaseIndex + 1];
    frameworkContext = `当前框架: ${discussion.framework.displayName}
当前阶段: ${currentPhaseInfo?.displayName || phaseName}（${currentPhaseInfo?.description || ''}）
${nextPhaseInfo ? `下一阶段: ${nextPhaseInfo.displayName}（${nextPhaseInfo.description}）` : '这是最后一个阶段'}`;
  }

  const prompt = `你是讨论的 Boss（老板/决策者）的助手。一轮讨论刚刚完成，请帮 Boss 做阶段性总结。

讨论主题：${discussion.topic}
${frameworkContext}

本阶段讨论内容：
${messageContext}

请返回以下 JSON（不要额外文字）：
{
  "summary": "本阶段讨论的简洁总结（100-200字），重点提炼关键共识、分歧和亮点",
  "options": [
    {
      "id": "continue",
      "label": "继续下一阶段",
      "description": "对本阶段结论满意，进入下一阶段讨论"
    },
    {
      "id": "deepen",
      "label": "深入本阶段",
      "description": "本阶段讨论还不够充分，需要再讨论一轮"
    },
    {
      "id": "redirect",
      "label": "调整方向",
      "description": "讨论方向需要调整，给出新的引导指令"
    }
  ]
}

要求：
1. summary 要信息密度高，让 Boss 快速了解讨论进展
2. 3个选项保持上面的结构，但 description 根据实际讨论内容做适当调整
3. 如果讨论已经很充分，可以在 continue 的 description 中点出下一阶段的重点`;

  try {
    const response = await llm.chat(
      [
        { role: 'system', content: '你是一位高效的讨论助手。你的回答必须是纯 JSON 格式，不包含任何其他文字或 markdown 代码块标记。' },
        { role: 'user', content: prompt },
      ],
      {
        ...llmConfig,
        temperature: 0.3,
      }
    );

    const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanJson) as CheckpointResult;

    // Ensure valid structure
    if (!result.summary || !Array.isArray(result.options) || result.options.length === 0) {
      throw new Error('Invalid checkpoint format');
    }

    return result;
  } catch {
    // Fallback
    return {
      summary: `"${phaseName}" 阶段已完成，${messages.length} 位角色发表了观点。请选择下一步行动。`,
      options: [
        { id: 'continue', label: '继续下一阶段', description: '进入下一阶段讨论' },
        { id: 'deepen', label: '深入本阶段', description: '再讨论一轮' },
        { id: 'redirect', label: '调整方向', description: '给出新的引导指令' },
      ],
    };
  }
}
