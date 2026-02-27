import { llm } from '@/lib/llm/registry';
import { LLMConfig } from '@/lib/llm/types';
import { DiscussionGoals, RoleConfig, SmartConfig, OrchestratorDecision } from '@/types';

interface OrchestratorContext {
  topic: string;
  goals: DiscussionGoals;
  roles: Array<RoleConfig & { id: string }>;
  recentMessages: Array<{ roleName: string; content: string }>;
  roundNumber: number;
  smartConfig: SmartConfig;
  llmConfig: LLMConfig;
}

export async function makeOrchestratorDecision(
  context: OrchestratorContext
): Promise<OrchestratorDecision> {
  const { topic, goals, roles, recentMessages, roundNumber, smartConfig, llmConfig } = context;

  // Build role list (id:name(expertise))
  const participantRoles = roles.filter(r => r.roleType !== 'summarizer');
  const summarizerRole = roles.find(r => r.roleType === 'summarizer');
  const roleList = participantRoles
    .map(r => `${r.id}:${r.humanName || r.name}(${r.expertise})`)
    .join('\n');

  // Truncate recent messages to ~200 chars each
  const recentSummary = recentMessages
    .slice(-5)
    .map(m => `【${m.roleName}】${m.content.slice(0, 200)}`)
    .join('\n');

  const prompt = `你是讨论编排器。根据当前状态决定下一轮安排。

主题：${topic}
主目标：${goals.primaryGoal}
子目标：${goals.subGoals.join('、')}

可用角色：
${roleList}
${summarizerRole ? `总结者：${summarizerRole.id}:${summarizerRole.humanName || summarizerRole.name}` : ''}

当前轮次：${roundNumber}
距上次总结：${smartConfig.roundsSinceSummary} 轮
上下文摘要：${smartConfig.contextDigest || '（讨论刚开始）'}

最近发言：
${recentSummary || '（尚无发言）'}

请返回 JSON（不要额外文字）：
{
  "selectedRoleIds": ["角色id1", "角色id2"],
  "reason": "选这些角色的简要理由",
  "isSummaryRound": false,
  "shouldPullInUser": false,
  "pullInQuestion": null,
  "shouldSearch": false,
  "searchQuery": null,
  "discussionComplete": false,
  "nextTopicFocus": "本轮讨论聚焦点",
  "methodHint": "本轮推荐的思维方法/咨询框架（如：六顶思帽·黑帽、SWOT·优势分析、第一性原理、5W1H、费米估算等）"
}

规则：
1. 选 2-3 个参与者角色，不要每轮都选同一组合
2. 每 3-4 轮安排一次总结（isSummaryRound=true，此时选总结者ID）
3. **用户拉入规则**（非常重要，必须严格执行）：
   - 当讨论缺少关键信息、需要用户做关键决策、出现重大分歧需要用户表态时 → shouldPullInUser=true
   - pullInQuestion 要具体、有引导性，给出 2-3 个选项让用户选择或自由回答
   - 以下场景【必须】拉入用户：
     a) 讨论方向出现分歧，需要用户确认优先级
     b) 涉及用户个人偏好/预算/时间等主观因素
     c) 已经讨论了多轮但缺少用户的关键背景信息
4. **搜索触发规则**：
   - 讨论中提到具体产品/公司/品牌 → 搜索其最新信息
   - 涉及价格/规格/性能对比 → 搜索最新数据
   - 提到具体人物/事件/政策/法规 → 搜索验证事实
   - 需要行业数据、市场趋势 → 搜索相关报告
   - shouldSearch=true 时 searchQuery 要精炼、使用关键词组合
5. 所有子目标都充分讨论后 discussionComplete=true
6. nextTopicFocus 要具体，引导角色聚焦
7. **methodHint**：为本轮推荐一个最合适的思维方法或咨询框架，简短描述（如"六顶思帽·绿帽-创意发散"、"SWOT·威胁分析"、"第一性原理"、"利益相关者分析"、"逆向思维"等）`;

  try {
    const response = await llm.chat(
      [
        { role: 'system', content: '你是一个 JSON 输出助手，只返回有效 JSON。' },
        { role: 'user', content: prompt },
      ],
      { ...llmConfig, temperature: 0.2, maxTokens: 500 }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('无法解析编排决策');
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate selectedRoleIds exist
    const validRoleIds = new Set(roles.map(r => r.id));
    const selectedIds = (Array.isArray(parsed.selectedRoleIds) ? parsed.selectedRoleIds : [])
      .filter((id: string) => validRoleIds.has(id));

    // If no valid IDs, fallback to first 2 participants
    if (selectedIds.length === 0) {
      selectedIds.push(...participantRoles.slice(0, 2).map(r => r.id));
    }

    // Force summary round if overdue
    let isSummaryRound = !!parsed.isSummaryRound;
    if (smartConfig.roundsSinceSummary >= 4 && summarizerRole) {
      isSummaryRound = true;
    }

    // Add summarizer if summary round
    if (isSummaryRound && summarizerRole && !selectedIds.includes(summarizerRole.id)) {
      selectedIds.push(summarizerRole.id);
    }

    // Force pull-in logic (code-level guarantees)
    let shouldPullInUser = !!parsed.shouldPullInUser;
    let pullInQuestion = parsed.pullInQuestion || undefined;

    // Round 1 (i.e. after initial round 0): force pull-in to confirm direction
    // But skip if we already pulled in user at this round (prevents infinite loop)
    if (roundNumber === 1 && !shouldPullInUser && smartConfig.lastPullInRound !== roundNumber) {
      shouldPullInUser = true;
      pullInQuestion = pullInQuestion || `讨论已初步展开，请问：\n1. 目前的讨论方向是否符合你的期望？\n2. 有没有你特别关心但还未涉及的角度？\n3. 你可以补充任何背景信息来帮助讨论更有针对性。`;
    }

    // Also skip LLM-suggested pull-in if we just did one at this same round
    if (shouldPullInUser && smartConfig.lastPullInRound === roundNumber) {
      shouldPullInUser = false;
      pullInQuestion = undefined;
    }

    // Force search on first round (round 0) to gather background info
    let shouldSearch = !!parsed.shouldSearch;
    let searchQuery = parsed.searchQuery || undefined;
    if (roundNumber === 0 && !shouldSearch) {
      shouldSearch = true;
      searchQuery = searchQuery || topic;
    }

    return {
      selectedRoleIds: selectedIds,
      reason: parsed.reason || '',
      isSummaryRound,
      shouldPullInUser,
      pullInQuestion,
      shouldSearch,
      searchQuery,
      discussionComplete: !!parsed.discussionComplete,
      nextTopicFocus: parsed.nextTopicFocus || topic,
      methodHint: parsed.methodHint || undefined,
    };
  } catch {
    // Fallback: select first 2 participants
    return {
      selectedRoleIds: participantRoles.slice(0, 2).map(r => r.id),
      reason: '默认选择',
      isSummaryRound: smartConfig.roundsSinceSummary >= 3 && !!summarizerRole,
      shouldPullInUser: roundNumber === 1,
      pullInQuestion: roundNumber === 1 ? '讨论已初步展开，目前方向是否符合你的期望？你还有什么补充？' : undefined,
      shouldSearch: roundNumber === 0,
      searchQuery: roundNumber === 0 ? topic : undefined,
      discussionComplete: false,
      nextTopicFocus: topic,
    };
  }
}
