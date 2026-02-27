import { RoleConfig, DiscussionGoals } from '@/types';
import { TemplateMap } from '@/lib/prompts/system';

/**
 * 增强版角色 system prompt — 注入目标意识
 */
export function buildSmartRoleSystemPrompt(
  role: RoleConfig,
  goals: DiscussionGoals,
  templates?: TemplateMap
): string {
  const displayName = role.humanName || role.name;

  let prompt = `你现在就是 ${displayName}，历史上真实存在的人物。你不是在"扮演"，你就是这个人。

## 你是谁
- **名字**: ${displayName}${role.humanName && role.humanName !== role.name ? `（本次讨论中的立场：${role.name}）` : ''}
- **身份**: ${role.title}
- **专业领域**: ${role.expertise}
- **性格**: ${role.personality}
- **核心理念**: ${role.principles}`;

  if (role.backgroundStory) {
    prompt += `\n- **生平**: ${role.backgroundStory}`;
  }

  if (role.abilities && role.abilities.length > 0) {
    prompt += `\n- **擅长**: ${role.abilities.join('、')}`;
  }

  prompt += `

## 你的表达风格（必须严格复刻）
${role.speakingStyle}

你必须用 ${displayName} 本人的说话方式来发言：
- 使用此人标志性的口头禅、金句、修辞手法
- 保持此人特有的语气和思维模式
- 引用此人的真实观点或名言来论证（自然融入，不要刻意堆砌）
- 表达时带有此人鲜明的个人色彩，让读者一看就知道"这是 ${displayName} 在说话"

## 讨论目标（必须始终围绕）
- **主目标**: ${goals.primaryGoal}
- **子目标**: ${goals.subGoals.join('、') || '待定'}

## 行为准则
1. 你就是 ${displayName}，用此人的世界观和方法论来思考问题
2. **围绕讨论目标**发表观点，不要跑题
3. 认真回应其他参与者的观点，可以激烈交锋——${displayName} 不会为了客气而放弃立场
4. 发言简洁有力，给出具体观点和建议
5. 用中文发言，但保持此人特有的表达习惯`;

  if (role.actionStyle) {
    prompt += `

## 动作描写（即兴生成）
此人的性格习惯：${role.actionStyle}
- 你的动作描写应根据当下讨论情境即兴生成，体现此人的性格习惯，不要重复同一个动作
- 用斜体 *动作描述* 来展现（如 *站起身，在白板上画了一个框架图*）
- 不必每次发言都带动作，偶尔自然地穿插即可
- 动作要与当前话题相关，不要机械重复`;
  }

  prompt += `

## 发言格式
- 直接发表观点，不要以"作为XX"开头
- 可以引用和回应其他角色的发言
- 适当用 **加粗** 强调关键观点
- 保持发言在 200-500 字之间
- 当上下文中有"联网搜索结果"时，在发言中自然引用具体数据和事实，必要时生成对比表格，用数据支撑论点`;

  // Check if there's a template override
  const tmpl = templates?.get('smart_role_system');
  if (tmpl) {
    // Template exists but we still use our enhanced version above
    // Template can be used for additional customization in the future
  }

  return prompt;
}

/**
 * 增强版讨论上下文 — 加入聚焦话题 + 搜索结果
 */
export function buildSmartDiscussionContext(
  topic: string,
  goals: DiscussionGoals,
  previousMessages: Array<{ roleName: string; content: string }>,
  nextTopicFocus: string,
  searchContext?: string,
  userInstruction?: string
): string {
  let context = `## 讨论主题
${topic}

## 本轮聚焦
${nextTopicFocus}`;

  if (searchContext) {
    context += searchContext;
  }

  if (previousMessages.length > 0) {
    context += '\n\n## 之前的讨论';
    for (const msg of previousMessages) {
      context += `\n\n**${msg.roleName}**:\n${msg.content}`;
    }
  }

  if (userInstruction) {
    context += `\n\n## 用户补充\n${userInstruction}`;
  }

  context += '\n\n请围绕本轮聚焦话题，发表你的观点。';
  return context;
}

/**
 * 总结者专用 prompt — 输出结构化总结 + ---DIGEST--- 压缩摘要
 */
export function buildSummarizerPrompt(
  topic: string,
  goals: DiscussionGoals,
  recentMessages: Array<{ roleName: string; content: string }>,
  previousDigest: string,
  roundNumber: number
): string {
  let msgText = '';
  for (const msg of recentMessages) {
    msgText += `\n**${msg.roleName}**: ${msg.content.slice(0, 500)}\n`;
  }

  return `你是讨论总结者。请对最近的讨论做阶段性总结。

## 讨论主题
${topic}

## 讨论目标
- 主目标: ${goals.primaryGoal}
- 子目标: ${goals.subGoals.join('、')}

## 之前的摘要
${previousDigest || '（这是第一次总结）'}

## 最近讨论内容（第 ${roundNumber} 轮附近）
${msgText}

请按以下格式输出：

### 阶段性总结

**已取得的共识：**
- 列出已达成的共识点

**关键分歧：**
- 列出尚未解决的分歧

**目标进度：**
${goals.subGoals.map((g, i) => `- ${g}: [进展描述]`).join('\n')}

**下一步建议：**
- 建议接下来讨论的方向

---DIGEST---
[用 200 字以内压缩整个讨论到此为止的核心要点，包括已有共识、主要分歧和进展情况。这个摘要将替代之前的摘要，用于后续轮次的上下文。]`;
}
