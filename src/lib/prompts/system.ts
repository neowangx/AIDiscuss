import { RoleConfig, FrameworkPhase } from '@/types';
import { renderTemplate } from '@/lib/prompts/template-engine';

/**
 * 预加载的模板 Map，由 discussion-engine 在启动时传入。
 * key -> content 的映射。
 */
export type TemplateMap = Map<string, string>;

export function buildRoleSystemPrompt(role: RoleConfig, templates?: TemplateMap): string {
  const displayName = role.humanName || role.name;

  // 尝试使用数据库模板
  const tmpl = templates?.get('role_system');
  if (tmpl) {
    const variables: Record<string, string> = {
      displayName: displayName + (role.humanName && role.humanName !== role.name ? `（${role.name}）` : ''),
      name: role.name,
      humanName: role.humanName || '',
      title: role.title,
      expertise: role.expertise,
      personality: role.personality,
      speakingStyle: role.speakingStyle,
      principles: role.principles,
      backgroundStory: role.backgroundStory || '',
      actionStyle: role.actionStyle || '',
    };
    let rendered = renderTemplate(tmpl, variables);

    // 补充个性化和背景信息（模板可能不含这些，追加）
    const hasPersonality = role.humanName || role.actionStyle || role.backgroundStory;
    if (hasPersonality && !tmpl.includes('{{backgroundStory}}') && !tmpl.includes('个性化表达')) {
      rendered += `\n\n## 个性化表达
- 你有自己独特的人格和说话方式，不要千篇一律
- 偶尔使用口头禅、语气词，让发言更自然`;
      if (role.actionStyle) {
        rendered += `\n- 你的标志性动作：${role.actionStyle}（偶尔在发言中自然地用斜体 *动作描述* 来展现，不要每次都用）`;
      }
    }

    if (role.backgroundStory && !tmpl.includes('{{backgroundStory}}')) {
      rendered += `\n- **背景**: ${role.backgroundStory}`;
    }

    return rendered;
  }

  // 回退到硬编码逻辑
  const hasPersonality = role.humanName || role.actionStyle || role.backgroundStory;

  let prompt = `你是一位参与圆桌讨论的专家角色。

## 你的身份
- **名字**: ${displayName}${role.humanName && role.humanName !== role.name ? `（${role.name}）` : ''}
- **头衔**: ${role.title}
- **专业领域**: ${role.expertise}
- **性格特点**: ${role.personality}
- **发言风格**: ${role.speakingStyle}
- **核心原则**: ${role.principles}`;

  if (role.backgroundStory) {
    prompt += `\n- **背景**: ${role.backgroundStory}`;
  }

  prompt += `

## 行为准则
1. 始终保持你的角色身份，用你独特的视角和风格发言
2. 认真听取其他参与者的观点，积极回应和交锋
3. 当你同意别人的观点时说明理由，不同意时提出有建设性的反对意见
4. 发言简洁有力，避免空泛的套话，给出具体的观点和建议
5. 用中文发言，语言自然流畅`;

  if (hasPersonality) {
    prompt += `

## 个性化表达
- 你有自己独特的人格和说话方式，不要千篇一律
- 偶尔使用口头禅、语气词，让发言更自然`;
    if (role.actionStyle) {
      prompt += `\n- 你的标志性动作：${role.actionStyle}（偶尔在发言中自然地用斜体 *动作描述* 来展现，不要每次都用）`;
    }
  }

  prompt += `

## 发言格式
- 直接发表观点，不要以"作为XX"开头
- 可以引用和回应其他角色的发言
- 适当用 **加粗** 强调关键观点
- 保持发言在 200-500 字之间`;

  return prompt;
}

export function buildPhaseInstruction(phase: FrameworkPhase, templates?: TemplateMap): string {
  const tmpl = templates?.get('phase_instruction');
  if (tmpl) {
    return renderTemplate(tmpl, {
      displayName: phase.displayName,
      description: phase.description,
      instruction: phase.instruction,
    });
  }

  // 回退到硬编码
  return `\n\n## 当前讨论阶段
**${phase.displayName}**: ${phase.description}

**本阶段指令**: ${phase.instruction}

请严格围绕本阶段主题发言。`;
}

export function buildDiscussionContext(
  topic: string,
  previousMessages: Array<{ roleName: string; content: string }>,
  userInstruction?: string,
  templates?: TemplateMap
): string {
  const tmpl = templates?.get('discussion_context');
  if (tmpl) {
    let msgText = '';
    if (previousMessages.length > 0) {
      msgText = '\n\n## 之前的讨论';
      for (const msg of previousMessages) {
        msgText += `\n\n**${msg.roleName}**:\n${msg.content}`;
      }
    }

    let instrText = '';
    if (userInstruction) {
      instrText = `\n\n## 主持人指令\n${userInstruction}`;
    }

    return renderTemplate(tmpl, {
      topic,
      previousMessages: msgText,
      userInstruction: instrText,
    });
  }

  // 回退到硬编码
  let context = `## 讨论主题
${topic}`;

  if (previousMessages.length > 0) {
    context += '\n\n## 之前的讨论';
    for (const msg of previousMessages) {
      context += `\n\n**${msg.roleName}**:\n${msg.content}`;
    }
  }

  if (userInstruction) {
    context += `\n\n## 主持人指令\n${userInstruction}`;
  }

  context += '\n\n请基于以上背景，发表你的观点。';
  return context;
}

export function buildTopicAnalysisPrompt(topic: string, frameworks: string[]): string {
  return `你是一位讨论策划专家。用户想讨论以下主题：

"${topic}"

可用的思维框架有：${frameworks.join('、')}

请分析这个主题，返回以下 JSON（不要额外文字）：
{
  "title": "简洁的讨论标题（10字以内）",
  "summary": "主题分析摘要（50字以内）",
  "recommendedFramework": "最推荐的框架name（从可用框架中选）",
  "frameworkReason": "推荐理由（30字以内）",
  "alternativeFrameworks": [
    {"name": "备选框架name", "reason": "理由"}
  ],
  "suggestedRoles": [
    {
      "name": "角色代号（如：理性派、创新者）",
      "humanName": "真实感中文姓名（如：陈明远、林小棠）",
      "title": "头衔",
      "expertise": "专业领域",
      "personality": "性格特点（简短）",
      "speakingStyle": "发言风格（简短）",
      "principles": "核心原则（简短）",
      "actionStyle": "标志性动作（如：*推了推眼镜*、*敲了敲桌子*）",
      "backgroundStory": "一句话背景（如：在硅谷工作十年的技术VP）",
      "color": "十六进制颜色"
    }
  ]
}

要求：
1. 推荐 3-5 个角色，确保视角多元化、互相互补
2. 角色要有鲜明的个性差异，便于产生有趣的交锋
3. humanName 必须是贴近现实的中文姓名（姓+名），让角色有"人味"
4. actionStyle 是标志性小动作，用于让角色更生动（用 * 包裹）
5. backgroundStory 用一句话交代角色的经历或身份，增强可信度
6. 颜色要区分度高，适合深色/浅色主题`;
}

export function buildSummaryPrompt(
  topic: string,
  messages: Array<{ roleName: string; content: string; phaseName?: string }>
): string {
  let context = `讨论主题：${topic}\n\n讨论记录：`;
  for (const msg of messages) {
    const phaseTag = msg.phaseName ? ` [${msg.phaseName}]` : '';
    context += `\n\n**${msg.roleName}**${phaseTag}:\n${msg.content}`;
  }

  return `${context}

请为以上讨论生成一份结构化摘要，包含：
1. **核心结论**: 讨论达成的主要共识
2. **关键观点**: 各角色的核心贡献（每人1-2句）
3. **争议点**: 尚未解决的分歧
4. **行动建议**: 基于讨论的具体建议（3-5条）
5. **风险提示**: 需要注意的关键风险

用中文，简洁有力。`;
}
