import { llm } from '@/lib/llm/registry';
import { LLMConfig } from '@/lib/llm/types';
import {
  buildRoleSystemPrompt,
  buildPhaseInstruction,
  buildDiscussionContext,
  TemplateMap,
} from '@/lib/prompts/system';
import { loadAllTemplates } from '@/lib/prompts/template-engine';
import { logAudit } from '@/lib/audit/logger';
import { RoleConfig, FrameworkDefinition, FrameworkPhase, SSEEvent, MessageData, DiscussionMode } from '@/types';
import { generateCheckpoint } from './checkpoint-generator';
import prisma from '@/lib/db';

const MAX_CONTEXT_MESSAGES = 20;
const SUMMARY_THRESHOLD = 15;

interface ProviderConfigEntry {
  key: string;
  baseUrl?: string;
}

interface EngineConfig {
  discussionId: string;
  topic: string;
  roles: Array<RoleConfig & { id: string }>;
  framework?: FrameworkDefinition;
  currentPhase: number;
  roundNumber: number;
  userInstruction?: string;
  providerConfigs: Record<string, ProviderConfigEntry>;
  mode?: DiscussionMode;
}

export async function* runDiscussionRound(
  config: EngineConfig
): AsyncGenerator<SSEEvent> {
  const { discussionId, topic, roles, framework, currentPhase, roundNumber, userInstruction, providerConfigs, mode } = config;

  // 预加载 Prompt 模板（fire-and-forget 友好，失败则返回空 Map）
  let templates: TemplateMap = new Map();
  try {
    templates = await loadAllTemplates();
  } catch (e) {
    console.error('[Engine] 预加载模板失败:', e);
  }

  // Determine current phase
  let phase: FrameworkPhase | undefined;
  if (framework && framework.phases[currentPhase]) {
    phase = framework.phases[currentPhase];
  }

  // Create round record
  const round = await prisma.round.create({
    data: {
      discussionId,
      roundNumber,
      phaseName: phase?.displayName,
      phaseIndex: currentPhase,
      instruction: userInstruction,
      status: 'active',
    },
  });

  // 审计：round 创建
  logAudit({
    discussionId,
    action: 'round.start',
    details: { roundNumber, phaseName: phase?.displayName },
  }).catch(console.error);

  yield {
    type: 'round_start',
    data: { roundNumber, roundId: round.id, phaseName: phase?.displayName, phaseIndex: currentPhase },
  };

  if (phase) {
    yield {
      type: 'phase_change',
      data: { phaseIndex: currentPhase, phaseName: phase.displayName },
    };
  }

  // Get recent messages for context (sliding window)
  const recentMessages = await getRecentMessages(discussionId);

  // Each role speaks in sequence
  for (const role of roles) {
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
      data: { roleId: role.id, roleName: role.name },
    };

    // Build messages for this role
    const systemPrompt = buildRoleSystemPrompt(role, templates) +
      (phase ? buildPhaseInstruction(phase, templates) : '');

    // Build context from previous messages in this round + history
    const contextMessages = [
      ...recentMessages.map(m => ({
        roleName: m.role?.name || '系统',
        content: m.content,
      })),
    ];

    // Add messages from earlier roles in this same round
    const currentRoundMessages = await prisma.message.findMany({
      where: { roundId: round.id },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const msg of currentRoundMessages) {
      contextMessages.push({
        roleName: msg.role?.name || '系统',
        content: msg.content,
      });
    }

    const userMessage = buildDiscussionContext(topic, contextMessages, userInstruction, templates);

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
            data: { roleId: role.id, roleName: role.name, content: chunk.content },
          };
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      yield {
        type: 'error',
        data: { error: `${role.name} 发言失败: ${errorMsg}`, roleId: role.id },
      };
      fullContent = `[发言失败: ${errorMsg}]`;
    }

    // Save message to database
    const message = await prisma.message.create({
      data: {
        discussionId,
        roleId: role.id,
        roundId: round.id,
        type: 'ai',
        content: fullContent,
        phase: currentPhase,
        phaseName: phase?.displayName,
      },
    });

    // 审计：角色发言完成
    logAudit({
      discussionId,
      action: 'role.speak',
      details: { roleId: role.id, roleName: role.name, contentLength: fullContent.length },
    }).catch(console.error);

    yield {
      type: 'role_end',
      data: { roleId: role.id, roleName: role.name, messageId: message.id },
    };
  }

  // Update round status
  await prisma.round.update({
    where: { id: round.id },
    data: { status: 'completed' },
  });

  // Check if phase should advance
  const phaseAdvancing = shouldAdvancePhase(framework, currentPhase, roundNumber);

  // Update discussion state
  const newPhase = phaseAdvancing ? currentPhase + 1 : currentPhase;
  await prisma.discussion.update({
    where: { id: discussionId },
    data: {
      currentRound: roundNumber + 1,
      currentPhase: newPhase,
    },
  });

  // 审计：round 结束
  logAudit({
    discussionId,
    action: 'round.end',
    details: { roundNumber },
  }).catch(console.error);

  yield {
    type: 'round_end',
    data: { roundNumber, roundId: round.id },
  };

  // Boss check-in: at phase boundary, generate checkpoint and pause
  if (mode === 'boss_checkin' && phaseAdvancing && framework) {
    // Check if there's a next phase (don't checkpoint at the very end)
    const isLastPhase = currentPhase >= framework.phases.length - 1;

    if (!isLastPhase) {
      // Find a provider config for checkpoint generation
      const checkpointLlmConfig = findCheckpointLlmConfig(providerConfigs, roles);

      if (checkpointLlmConfig) {
        try {
          const checkpointResult = await generateCheckpoint(
            discussionId,
            currentPhase,
            phase?.displayName || `阶段 ${currentPhase + 1}`,
            checkpointLlmConfig
          );

          // Save checkpoint data to the round
          await prisma.round.update({
            where: { id: round.id },
            data: {
              isCheckpoint: true,
              checkpointSummary: checkpointResult.summary,
              checkpointOptions: JSON.stringify(checkpointResult.options),
            },
          });

          // Set discussion status to checkpoint (paused, waiting for boss)
          await prisma.discussion.update({
            where: { id: discussionId },
            data: { status: 'checkpoint' },
          });

          // 审计：checkpoint 生成
          logAudit({
            discussionId,
            action: 'checkpoint.create',
            details: { phaseIndex: currentPhase, phaseName: phase?.displayName },
          }).catch(console.error);

          yield {
            type: 'checkpoint',
            data: {
              roundId: round.id,
              phaseIndex: currentPhase,
              phaseName: phase?.displayName || `阶段 ${currentPhase + 1}`,
              checkpoint: {
                roundId: round.id,
                phaseIndex: currentPhase,
                phaseName: phase?.displayName || `阶段 ${currentPhase + 1}`,
                summary: checkpointResult.summary,
                options: checkpointResult.options,
              },
            },
          };

          // Don't yield discussion_end — we're paused at checkpoint
          return;
        } catch (error) {
          // If checkpoint generation fails, continue normally
          yield {
            type: 'error',
            data: { error: `检查点生成失败: ${(error as Error).message}` },
          };
        }
      }
    }
  }

  // Check if discussion should end
  if (framework && currentPhase >= framework.phases.length - 1) {
    if (phaseAdvancing) {
      yield { type: 'discussion_end', data: {} };
    }
  }
}

/**
 * Find a usable LLM config for checkpoint generation from available providers.
 */
function findCheckpointLlmConfig(
  providerConfigs: Record<string, ProviderConfigEntry>,
  roles: Array<RoleConfig & { id: string }>
): LLMConfig | null {
  // Use the first role's provider config
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
): Promise<Array<MessageData & { role: RoleConfig | null }>> {
  const messages = await prisma.message.findMany({
    where: { discussionId },
    include: { role: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_CONTEXT_MESSAGES,
  });

  return messages.reverse() as unknown as Array<MessageData & { role: RoleConfig | null }>;
}

function shouldAdvancePhase(
  framework: FrameworkDefinition | undefined,
  currentPhase: number,
  roundNumber: number
): boolean {
  if (!framework) return false;
  const phase = framework.phases[currentPhase];
  if (!phase) return false;

  // Calculate how many rounds have been completed for this phase
  let roundsBeforePhase = 0;
  for (let i = 0; i < currentPhase; i++) {
    roundsBeforePhase += framework.phases[i].roundCount;
  }
  const roundsInPhase = roundNumber - roundsBeforePhase + 1;
  return roundsInPhase >= phase.roundCount;
}

export { SUMMARY_THRESHOLD, MAX_CONTEXT_MESSAGES };
