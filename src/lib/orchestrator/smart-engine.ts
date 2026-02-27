import { llm } from '@/lib/llm/registry';
import { LLMConfig } from '@/lib/llm/types';
import {
  buildSmartRoleSystemPrompt,
  buildSmartDiscussionContext,
  buildSummarizerPrompt,
} from '@/lib/prompts/smart-prompts';
import { logAudit } from '@/lib/audit/logger';
import { RoleConfig, DiscussionGoals, SmartConfig, SSEEvent } from '@/types';
import { makeOrchestratorDecision } from './smart-orchestrator';
import { searchWeb, formatSearchResultsForContext } from './web-searcher';
import prisma from '@/lib/db';

const MAX_CONTEXT_MESSAGES = 20;

interface ProviderConfigEntry {
  key: string;
  baseUrl?: string;
  model?: string;
}

export interface SmartEngineConfig {
  discussionId: string;
  topic: string;
  roles: Array<RoleConfig & { id: string }>;
  goals: DiscussionGoals;
  smartConfig: SmartConfig;
  roundNumber: number;
  providerConfigs: Record<string, ProviderConfigEntry>;
  userInstruction?: string;
}

export async function* runSmartRound(
  config: SmartEngineConfig
): AsyncGenerator<SSEEvent> {
  const {
    discussionId,
    topic,
    roles,
    goals,
    smartConfig,
    roundNumber,
    providerConfigs,
    userInstruction,
  } = config;

  // Find a usable LLM config for orchestrator
  const orchestratorLlmConfig = findLlmConfig(providerConfigs, roles);
  if (!orchestratorLlmConfig) {
    yield { type: 'error', data: { error: '没有可用的 API Key' } };
    return;
  }

  // Get recent messages for context
  const recentMessages = await getRecentMessages(discussionId);
  const recentMsgSummary = recentMessages.map(m => ({
    roleName: m.role?.name || '系统',
    content: m.content,
  }));

  // 1. Make orchestrator decision
  const decision = await makeOrchestratorDecision({
    topic,
    goals,
    roles,
    recentMessages: recentMsgSummary,
    roundNumber,
    smartConfig,
    llmConfig: orchestratorLlmConfig,
  });

  // 2. Yield orchestrator decision
  yield {
    type: 'orchestrator_decision',
    data: {
      decision,
      roundNumber,
    },
  };

  // 3. If should pull in user — pause
  if (decision.shouldPullInUser && decision.pullInQuestion) {
    yield {
      type: 'user_pull_in',
      data: {
        pullInQuestion: decision.pullInQuestion,
      },
    };

    // Update discussion status to waiting_user
    await prisma.discussion.update({
      where: { id: discussionId },
      data: {
        status: 'waiting_user',
        smartConfig: JSON.stringify({
          ...smartConfig,
          pendingUserPullIn: true,
          lastPullInRound: roundNumber,
        }),
      },
    });

    return; // Pause — will resume when user responds
  }

  // 4. Web search if needed
  let searchContext = '';
  if (decision.shouldSearch && decision.searchQuery) {
    yield {
      type: 'web_search_start',
      data: { searchQuery: decision.searchQuery },
    };

    const searchResults = await searchWeb(decision.searchQuery);
    searchContext = formatSearchResultsForContext(searchResults);

    if (searchResults.length > 0) {
      yield {
        type: 'web_search_result',
        data: { searchResults },
      };
    }
  }

  // 5. Create Round record
  const round = await prisma.round.create({
    data: {
      discussionId,
      roundNumber,
      status: 'active',
      selectedRoleIds: JSON.stringify(decision.selectedRoleIds),
      orchestratorLog: JSON.stringify(decision),
    },
  });

  logAudit({
    discussionId,
    action: 'round.start',
    details: {
      roundNumber,
      mode: 'smart',
      selectedRoles: decision.selectedRoleIds,
      focus: decision.nextTopicFocus,
    },
  }).catch(console.error);

  // 6. Yield round_start
  yield {
    type: 'round_start',
    data: { roundNumber, roundId: round.id },
  };

  // 7. For each selected role — stream LLM response
  const selectedRoles = decision.selectedRoleIds
    .map(id => roles.find(r => r.id === id))
    .filter((r): r is (RoleConfig & { id: string }) => r !== undefined);

  // Don't include summarizer in regular speaking (unless it's a summary round)
  const speakingRoles = decision.isSummaryRound
    ? selectedRoles.filter(r => r.roleType !== 'summarizer')
    : selectedRoles;

  for (const role of speakingRoles) {
    const providerConfig = providerConfigs[role.modelProvider];
    if (!providerConfig?.key) {
      yield {
        type: 'error',
        data: { error: `缺少 ${role.modelProvider} 的 API Key`, roleId: role.id },
      };
      continue;
    }

    yield {
      type: 'role_start',
      data: { roleId: role.id, roleName: role.humanName || role.name },
    };

    // Build system prompt
    const systemPrompt = buildSmartRoleSystemPrompt(role, goals);

    // Build context with current round messages
    const currentRoundMessages = await prisma.message.findMany({
      where: { roundId: round.id },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });

    const contextMessages = [
      ...recentMsgSummary,
      ...currentRoundMessages.map(m => ({
        roleName: m.role?.name || '系统',
        content: m.content,
      })),
    ];

    const userMessage = buildSmartDiscussionContext(
      topic,
      goals,
      contextMessages,
      decision.nextTopicFocus,
      searchContext,
      userInstruction
    );

    const llmConfig: LLMConfig = {
      provider: role.modelProvider,
      model: role.modelId,
      apiKey: providerConfig.key,
      baseUrl: providerConfig.baseUrl,
      temperature: 0.7,
      maxTokens: 2048,
    };

    let fullContent = '';

    try {
      const stream = llm.stream(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        llmConfig
      );

      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.content) {
          fullContent += chunk.content;
          yield {
            type: 'text_delta',
            data: { roleId: role.id, roleName: role.humanName || role.name, content: chunk.content },
          };
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      yield {
        type: 'error',
        data: { error: `${role.humanName || role.name} 发言失败: ${errorMsg}`, roleId: role.id },
      };
      fullContent = `[发言失败: ${errorMsg}]`;
    }

    // Save message
    const message = await prisma.message.create({
      data: {
        discussionId,
        roleId: role.id,
        roundId: round.id,
        type: 'ai',
        content: fullContent,
      },
    });

    logAudit({
      discussionId,
      action: 'role.speak',
      details: { roleId: role.id, roleName: role.name, contentLength: fullContent.length },
    }).catch(console.error);

    yield {
      type: 'role_end',
      data: { roleId: role.id, roleName: role.humanName || role.name, messageId: message.id },
    };
  }

  // 8. Summary round — run summarizer
  let newSmartConfig = { ...smartConfig };
  if (decision.isSummaryRound) {
    const summarizerRole = roles.find(r => r.roleType === 'summarizer');
    if (summarizerRole) {
      yield { type: 'summary_start', data: {} };

      yield {
        type: 'role_start',
        data: { roleId: summarizerRole.id, roleName: summarizerRole.humanName || summarizerRole.name },
      };

      const summarizerConfig = providerConfigs[summarizerRole.modelProvider];
      if (summarizerConfig?.key) {
        // Get all recent messages for summary
        const allRecentMessages = await prisma.message.findMany({
          where: { discussionId },
          include: { role: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        });

        const summaryMessages = allRecentMessages.reverse().map(m => ({
          roleName: m.role?.name || '系统',
          content: m.content,
        }));

        const summarizerPrompt = buildSummarizerPrompt(
          topic,
          goals,
          summaryMessages,
          smartConfig.contextDigest,
          roundNumber
        );

        const llmConfig: LLMConfig = {
          provider: summarizerRole.modelProvider,
          model: summarizerRole.modelId,
          apiKey: summarizerConfig.key,
          baseUrl: summarizerConfig.baseUrl,
          temperature: 0.3,
          maxTokens: 1500,
        };

        let summaryContent = '';

        try {
          const stream = llm.stream(
            [
              { role: 'system', content: '你是讨论总结者，客观中立地归纳讨论进展。' },
              { role: 'user', content: summarizerPrompt },
            ],
            llmConfig
          );

          for await (const chunk of stream) {
            if (chunk.type === 'text' && chunk.content) {
              summaryContent += chunk.content;
              yield {
                type: 'text_delta',
                data: { roleId: summarizerRole.id, roleName: summarizerRole.humanName || summarizerRole.name, content: chunk.content },
              };
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          summaryContent = `[总结生成失败: ${errorMsg}]`;
          yield {
            type: 'error',
            data: { error: `总结失败: ${errorMsg}` },
          };
        }

        // Save summary message
        const summaryMessage = await prisma.message.create({
          data: {
            discussionId,
            roleId: summarizerRole.id,
            roundId: round.id,
            type: 'ai',
            content: summaryContent,
          },
        });

        yield {
          type: 'role_end',
          data: { roleId: summarizerRole.id, roleName: summarizerRole.humanName || summarizerRole.name, messageId: summaryMessage.id },
        };

        // Parse ---DIGEST--- from summary
        const digestMatch = summaryContent.split('---DIGEST---');
        if (digestMatch.length > 1) {
          newSmartConfig.contextDigest = digestMatch[1].trim().slice(0, 300);
        }
      }

      newSmartConfig.roundsSinceSummary = 0;
      newSmartConfig.lastSummaryRoundNumber = roundNumber;
    }
  } else {
    newSmartConfig.roundsSinceSummary = smartConfig.roundsSinceSummary + 1;
  }

  newSmartConfig.pendingUserPullIn = false;

  // 9. Update Round and Discussion
  await prisma.round.update({
    where: { id: round.id },
    data: { status: 'completed' },
  });

  // 9.5 After summary round — force pull in user to decide next direction
  if (decision.isSummaryRound) {
    const pullInQuestion = '阶段性总结已完成。请问：\n1. 你对目前的讨论进展是否满意？\n2. 接下来你希望重点探讨哪个方向？\n3. 有新的信息或想法要补充吗？';

    yield {
      type: 'user_pull_in',
      data: { pullInQuestion },
    };

    newSmartConfig.pendingUserPullIn = true;
    newSmartConfig.lastPullInRound = roundNumber + 1; // next round number, so it won't re-trigger

    await prisma.discussion.update({
      where: { id: discussionId },
      data: {
        currentRound: roundNumber + 1,
        status: 'waiting_user',
        smartConfig: JSON.stringify(newSmartConfig),
      },
    });

    // Yield round_end before returning
    yield {
      type: 'round_end',
      data: { roundNumber, roundId: round.id },
    };

    return; // Pause — will resume when user responds
  }

  await prisma.discussion.update({
    where: { id: discussionId },
    data: {
      currentRound: roundNumber + 1,
      smartConfig: JSON.stringify(newSmartConfig),
    },
  });

  logAudit({
    discussionId,
    action: 'round.end',
    details: { roundNumber, mode: 'smart' },
  }).catch(console.error);

  // 10. Check if discussion complete
  if (decision.discussionComplete) {
    await prisma.discussion.update({
      where: { id: discussionId },
      data: { status: 'completed' },
    });
    yield { type: 'discussion_end', data: {} };
  }

  // 11. Yield round_end
  yield {
    type: 'round_end',
    data: { roundNumber, roundId: round.id },
  };
}

function findLlmConfig(
  providerConfigs: Record<string, ProviderConfigEntry>,
  roles: Array<RoleConfig & { id: string }>
): LLMConfig | null {
  for (const role of roles) {
    const config = providerConfigs[role.modelProvider];
    if (config?.key) {
      return {
        provider: role.modelProvider,
        model: role.modelId,
        apiKey: config.key,
        baseUrl: config.baseUrl,
      };
    }
  }
  return null;
}

async function getRecentMessages(
  discussionId: string
): Promise<Array<{ id: string; content: string; type: string; role: { name: string } | null }>> {
  const messages = await prisma.message.findMany({
    where: { discussionId },
    include: { role: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_CONTEXT_MESSAGES,
  });

  return messages.reverse();
}
