import { llm } from '@/lib/llm/registry';
import { TopicAnalysis, RoleConfig } from '@/types';
import { buildTopicAnalysisPrompt } from '@/lib/prompts/system';
import { getAllFrameworks } from '@/lib/frameworks';
import { getDefaultModelForProvider } from '@/lib/llm/providers';

const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

export async function analyzeTopic(
  topic: string,
  apiKey: string,
  provider: string = 'anthropic',
  model?: string,
  baseUrl?: string
): Promise<TopicAnalysis> {
  const frameworks = getAllFrameworks();
  const frameworkNames = frameworks.map(f => `${f.name}(${f.displayName})`);
  const prompt = buildTopicAnalysisPrompt(topic, frameworkNames);

  const defaultModel = model || getDefaultModelForProvider(provider);

  const response = await llm.chat(
    [
      { role: 'system', content: '你是一位讨论策划专家。你的回答必须是纯 JSON 格式，不包含任何其他文字或 markdown 代码块标记。' },
      { role: 'user', content: prompt },
    ],
    {
      provider,
      model: defaultModel,
      apiKey,
      baseUrl,
      temperature: 0.7,
    }
  );

  try {
    const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanJson) as TopicAnalysis;

    // Ensure roles have proper defaults
    analysis.suggestedRoles = analysis.suggestedRoles.map((role: Partial<RoleConfig>, i: number) => ({
      name: role.name || `角色${i + 1}`,
      title: role.title || '讨论参与者',
      expertise: role.expertise || '通用',
      personality: role.personality || '理性',
      speakingStyle: role.speakingStyle || '简洁',
      principles: role.principles || '追求真理',
      humanName: role.humanName || undefined,
      actionStyle: role.actionStyle || undefined,
      backgroundStory: role.backgroundStory || undefined,
      modelProvider: provider,
      modelId: defaultModel,
      color: role.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      orderIndex: i,
    }));

    return analysis;
  } catch {
    // Fallback analysis
    return {
      title: topic.slice(0, 20),
      summary: topic,
      recommendedFramework: 'six_thinking_hats',
      frameworkReason: '适用于多角度综合分析',
      suggestedRoles: generateDefaultRoles(provider, model),
      alternativeFrameworks: [
        { name: 'first_principles', reason: '从本质出发分析' },
      ],
    };
  }
}

function generateDefaultRoles(
  provider: string,
  model?: string
): RoleConfig[] {
  const defaultModel = model || getDefaultModelForProvider(provider);
  return [
    {
      name: '理性派', humanName: '陈维理', title: '逻辑分析师', expertise: '逻辑推理与数据分析',
      personality: '冷静、严谨、注重证据', speakingStyle: '条理清晰，善用数据支撑论点',
      principles: '数据驱动，拒绝模糊', actionStyle: '*推了推眼镜*',
      backgroundStory: '某顶级咨询公司十年分析师，数字是他最好的朋友',
      modelProvider: provider, modelId: defaultModel, color: '#3b82f6', orderIndex: 0,
    },
    {
      name: '创新者', humanName: '林小棠', title: '创意策划师', expertise: '创新思维与产品设计',
      personality: '充满想象力、敢于打破常规', speakingStyle: '跳跃性思维，善于类比和联想',
      principles: '没有不可能，只有没想到', actionStyle: '*兴奋地站了起来*',
      backgroundStory: '连续创业者，曾在车库里做出过估值十亿的产品',
      modelProvider: provider, modelId: defaultModel, color: '#ec4899', orderIndex: 1,
    },
    {
      name: '务实家', humanName: '赵铁柱', title: '执行顾问', expertise: '项目管理与落地执行',
      personality: '脚踏实地、关注可行性', speakingStyle: '直接坦率，聚焦执行细节',
      principles: '能落地的方案才是好方案', actionStyle: '*掰着手指算了算*',
      backgroundStory: '二十年项目管理老兵，见过太多PPT项目翻车',
      modelProvider: provider, modelId: defaultModel, color: '#10b981', orderIndex: 2,
    },
    {
      name: '质疑者', humanName: '孙锐鸣', title: '风控专家', expertise: '风险评估与批判性思维',
      personality: '谨慎、敏锐、善于发现问题', speakingStyle: '犀利追问，不放过任何漏洞',
      principles: '未经检验的假设都是隐患', actionStyle: '*意味深长地笑了笑*',
      backgroundStory: '前投行风控总监，经历过三次金融危机',
      modelProvider: provider, modelId: defaultModel, color: '#f59e0b', orderIndex: 3,
    },
  ];
}
