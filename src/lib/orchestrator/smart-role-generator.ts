import { llm } from '@/lib/llm/registry';
import { LLMConfig } from '@/lib/llm/types';
import { DiscussionGoals, RoleConfig } from '@/types';

const ROLE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

interface SmartRolesResult {
  participants: RoleConfig[];
  summarizer: RoleConfig;
}

export async function generateSmartRoles(
  topic: string,
  goals: DiscussionGoals,
  llmConfig: LLMConfig
): Promise<SmartRolesResult> {
  const prompt = `你是讨论策划专家。根据主题和目标，选取历史上众所周知的真实人物作为讨论角色。

主题：${topic}
主目标：${goals.primaryGoal}
子目标：${goals.subGoals.join('、')}

请返回 JSON（不要额外文字）：
{
  "participants": [
    {
      "name": "角色立场标签（如：实用主义者、理想主义者）",
      "humanName": "历史人物真名（如：史蒂夫·乔布斯、查理·芒格、鲁迅）",
      "title": "此人最知名的身份头衔",
      "expertise": "此人最擅长的领域（详细）",
      "personality": "此人真实的性格特点",
      "speakingStyle": "此人真实的表达风格，包括口头禅、标志性句式、修辞习惯",
      "principles": "此人一生坚持的核心理念/哲学",
      "characteristicHabits": "此人的性格习惯描述（如：喜欢点烟沉思、习惯推眼镜、爱在白板前踱步等），用于在讨论中即兴生成动作描写",
      "backgroundStory": "此人的一句话生平概括",
      "abilities": ["能力1", "能力2"]
    }
  ],
  "summarizer": {
    "name": "总结者",
    "humanName": "一位以客观公正闻名的历史人物真名",
    "title": "此人的身份头衔",
    "expertise": "议题综合与归纳",
    "personality": "此人的真实性格",
    "speakingStyle": "此人的真实表达风格",
    "principles": "忠实还原各方观点，不偏不倚",
    "characteristicHabits": "此人的性格习惯描述",
    "backgroundStory": "一句话生平",
    "abilities": ["综合归纳", "目标追踪"]
  }
}

核心要求：
1. **根据用户语言选取该文化圈的历史人物**：分析上面主题文本使用的语言，选取该文化圈中用户最熟悉的历史人物：
   - 中文主题 → 优先选中国/华语圈历史人物（如鲁迅、曹操、王阳明、张小龙等）
   - 英文主题 → 优先选欧美历史人物（如 Steve Jobs、Elon Musk、Aristotle 等）
   - 日文主题 → 优先选日本历史人物（如松下幸之助、宫崎骏等）
   - 其他语言同理，优先该语言对应文化圈的名人
   - 可以混入 1 位其他文化圈的人物以增加视角多样性，但主体必须是本文化圈的
2. **必须选真实历史人物**：每个角色都是历史上众所周知的真实人物，且此人的专长/立场与讨论主题高度相关
3. 设计 2-4 个参与者，选取在该议题上会持有不同立场的人物，确保能产生精彩交锋
4. **复刻表达风格**：speakingStyle 要详细描述此人的真实说话习惯——包括口头禅、标志性金句、修辞特点、语气倾向（如乔布斯的"One more thing"、芒格的"反过来想"、鲁迅的辛辣讽刺）
5. humanName 用此人最广为人知的名字（中文语境下用中文名或通用译名）
6. characteristicHabits 描述此人的性格习惯和标志性肢体语言（不要用 * 包裹），这些信息将用于讨论中根据当前语境即兴生成动作描写
7. backgroundStory 一句话概括此人生平中与讨论主题最相关的经历
8. 总结者也选一位以客观、博学闻名的历史人物（如司马迁、亚里士多德等），同样优先本文化圈`;

  const response = await llm.chat(
    [
      { role: 'system', content: '你是一个 JSON 输出助手，只返回有效 JSON。' },
      { role: 'user', content: prompt },
    ],
    { ...llmConfig, temperature: 0.7, maxTokens: 1500 }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('无法解析角色生成结果');
    const parsed = JSON.parse(jsonMatch[0]);

    const participants: RoleConfig[] = (parsed.participants || []).map(
      (r: Record<string, unknown>, i: number) => ({
        name: (r.name as string) || `角色${i + 1}`,
        humanName: (r.humanName as string) || undefined,
        title: (r.title as string) || '讨论参与者',
        expertise: (r.expertise as string) || '',
        personality: (r.personality as string) || '',
        speakingStyle: (r.speakingStyle as string) || '',
        principles: (r.principles as string) || '',
        actionStyle: (r.characteristicHabits as string) || (r.actionStyle as string) || undefined,
        backgroundStory: (r.backgroundStory as string) || undefined,
        abilities: Array.isArray(r.abilities) ? r.abilities as string[] : [],
        roleType: 'participant' as const,
        modelProvider: llmConfig.provider,
        modelId: llmConfig.model,
        color: ROLE_COLORS[i % ROLE_COLORS.length],
        orderIndex: i,
      })
    );

    const rawSummarizer = parsed.summarizer || {};
    const summarizer: RoleConfig = {
      name: (rawSummarizer.name as string) || '总结者',
      humanName: (rawSummarizer.humanName as string) || '周明理',
      title: (rawSummarizer.title as string) || '讨论协调人',
      expertise: (rawSummarizer.expertise as string) || '议题综合与归纳',
      personality: (rawSummarizer.personality as string) || '客观中立，善于提炼',
      speakingStyle: (rawSummarizer.speakingStyle as string) || '结构化、条理清晰',
      principles: (rawSummarizer.principles as string) || '忠实还原各方观点，不偏不倚',
      actionStyle: (rawSummarizer.characteristicHabits as string) || (rawSummarizer.actionStyle as string) || undefined,
      backgroundStory: (rawSummarizer.backgroundStory as string) || undefined,
      abilities: Array.isArray(rawSummarizer.abilities) ? rawSummarizer.abilities as string[] : ['综合归纳', '目标追踪'],
      roleType: 'summarizer' as const,
      modelProvider: llmConfig.provider,
      modelId: llmConfig.model,
      color: '#64748b',
      orderIndex: participants.length,
    };

    return { participants, summarizer };
  } catch {
    // Fallback: use classic historical figures
    return {
      participants: [
        {
          name: '实用主义者',
          humanName: '本杰明·富兰克林',
          title: '美国开国元勋、发明家',
          expertise: '实用创新与务实决策',
          personality: '务实、机智、善于折中',
          speakingStyle: '善用格言警句，如"时间就是金钱"，语言朴实有力，常用类比说理',
          principles: '实用至上，追求最大公约数',
          actionStyle: '*摘下眼镜擦了擦*',
          backgroundStory: '从印刷工学徒成为科学家、外交家和美国宪法起草人',
          roleType: 'participant',
          abilities: ['务实分析', '方案设计'],
          modelProvider: llmConfig.provider,
          modelId: llmConfig.model,
          color: ROLE_COLORS[0],
          orderIndex: 0,
        },
        {
          name: '批判思考者',
          humanName: '鲁迅',
          title: '文学家、思想家',
          expertise: '社会批判与深层剖析',
          personality: '犀利、深刻、不留情面',
          speakingStyle: '辛辣讽刺，善用反语，句式短促有力，常以"从来如此，便对么？"式的反问直击要害',
          principles: '揭示真相，不做和事佬',
          actionStyle: '*点燃一支烟，眯着眼看向远处*',
          backgroundStory: '弃医从文，以笔为刀解剖国民性的民族脊梁',
          roleType: 'participant',
          abilities: ['批判分析', '洞察本质'],
          modelProvider: llmConfig.provider,
          modelId: llmConfig.model,
          color: ROLE_COLORS[1],
          orderIndex: 1,
        },
      ],
      summarizer: {
        name: '总结者',
        humanName: '司马迁',
        title: '史学家',
        expertise: '议题综合与归纳',
        personality: '客观公正，秉笔直书',
        speakingStyle: '言简意赅，善于提炼脉络，用"太史公曰"式的总结收束全局',
        principles: '究天人之际，通古今之变，成一家之言',
        roleType: 'summarizer',
        abilities: ['综合归纳', '目标追踪'],
        modelProvider: llmConfig.provider,
        modelId: llmConfig.model,
        color: '#64748b',
        orderIndex: 2,
      },
    };
  }
}
