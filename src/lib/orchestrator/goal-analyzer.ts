import { llm } from '@/lib/llm/registry';
import { LLMConfig } from '@/lib/llm/types';
import { DiscussionGoals } from '@/types';

interface GoalAnalysisResult {
  goals: DiscussionGoals;
  needsClarification: boolean;
  clarificationQuestion?: string;
  suggestedTitle: string;
}

export async function analyzeGoals(
  topic: string,
  llmConfig: LLMConfig
): Promise<GoalAnalysisResult> {
  const prompt = `你是一位讨论策划专家。分析以下讨论主题，提取核心目标。

主题：${topic}

请返回以下 JSON（不要额外文字）：
{
  "primaryGoal": "一句话概括主要讨论目标",
  "subGoals": ["子目标1", "子目标2", "子目标3"],
  "needsClarification": true/false,
  "clarificationQuestion": "如果主题模糊，提一个精准的追问（不问废话）",
  "suggestedTitle": "简洁的讨论标题（10字以内）"
}

要求：
1. 主目标要明确可执行，不要泛泛而谈
2. 子目标 2-4 个，每个聚焦一个具体维度
3. 只在主题确实模糊、缺少关键信息时才设 needsClarification=true
4. 追问要直击要害，帮用户明确讨论边界`;

  const response = await llm.chat(
    [
      { role: 'system', content: '你是一个 JSON 输出助手，只返回有效 JSON。' },
      { role: 'user', content: prompt },
    ],
    { ...llmConfig, temperature: 0.3, maxTokens: 500 }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('无法解析目标分析结果');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      goals: {
        primaryGoal: parsed.primaryGoal || topic,
        subGoals: Array.isArray(parsed.subGoals) ? parsed.subGoals : [],
        clarified: !parsed.needsClarification,
      },
      needsClarification: !!parsed.needsClarification,
      clarificationQuestion: parsed.clarificationQuestion,
      suggestedTitle: parsed.suggestedTitle || topic.slice(0, 10),
    };
  } catch {
    // Fallback: use topic as goal directly
    return {
      goals: {
        primaryGoal: topic,
        subGoals: [],
        clarified: true,
      },
      needsClarification: false,
      suggestedTitle: topic.slice(0, 10),
    };
  }
}

export async function refineGoals(
  topic: string,
  currentGoals: DiscussionGoals,
  userAnswer: string,
  llmConfig: LLMConfig
): Promise<GoalAnalysisResult> {
  const prompt = `你是一位讨论策划专家。用户补充了信息，请细化讨论目标。

原始主题：${topic}
当前目标：${JSON.stringify(currentGoals, null, 2)}
用户补充：${userAnswer}

请返回以下 JSON（不要额外文字）：
{
  "primaryGoal": "细化后的主要讨论目标",
  "subGoals": ["子目标1", "子目标2", "子目标3"],
  "needsClarification": false,
  "clarificationQuestion": null,
  "suggestedTitle": "简洁的讨论标题（10字以内）"
}

要求：
1. 结合用户补充信息，让目标更具体
2. 一般不再追问（除非用户回答完全答非所问）`;

  const response = await llm.chat(
    [
      { role: 'system', content: '你是一个 JSON 输出助手，只返回有效 JSON。' },
      { role: 'user', content: prompt },
    ],
    { ...llmConfig, temperature: 0.3, maxTokens: 500 }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('无法解析目标细化结果');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      goals: {
        primaryGoal: parsed.primaryGoal || currentGoals.primaryGoal,
        subGoals: Array.isArray(parsed.subGoals) ? parsed.subGoals : currentGoals.subGoals,
        clarified: !parsed.needsClarification,
      },
      needsClarification: !!parsed.needsClarification,
      clarificationQuestion: parsed.clarificationQuestion,
      suggestedTitle: parsed.suggestedTitle || topic.slice(0, 10),
    };
  } catch {
    return {
      goals: { ...currentGoals, clarified: true },
      needsClarification: false,
      suggestedTitle: topic.slice(0, 10),
    };
  }
}
