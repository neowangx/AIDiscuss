import { DiscussionData } from '@/types';

export function exportToMarkdown(discussion: DiscussionData): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${discussion.title}`);
  lines.push('');

  // Meta info
  lines.push(`**主题**: ${discussion.topic}`);
  if (discussion.framework) {
    lines.push(`**框架**: ${discussion.framework.displayName}`);
  }
  lines.push(`**模式**: ${formatMode(discussion.mode)}`);
  lines.push(`**状态**: ${formatStatus(discussion.status)}`);

  // Roles
  const roleNames = discussion.roles.map(r => {
    const display = r.humanName || r.name;
    return r.title ? `${display} (${r.title})` : display;
  });
  lines.push(`**参与角色**: ${roleNames.join('、')}`);
  lines.push(`**创建时间**: ${new Date(discussion.createdAt).toLocaleString('zh-CN')}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Group messages by phase
  const phases = new Map<string, typeof discussion.messages>();
  let currentPhaseName = '自由讨论';

  for (const msg of discussion.messages) {
    if (msg.phaseName) {
      currentPhaseName = msg.phaseName;
    }
    const key = currentPhaseName;
    if (!phases.has(key)) {
      phases.set(key, []);
    }
    phases.get(key)!.push(msg);
  }

  // Render messages by phase
  let phaseIdx = 0;
  for (const [phaseName, messages] of phases) {
    phaseIdx++;
    lines.push(`## 阶段 ${phaseIdx}: ${phaseName}`);
    lines.push('');

    for (const msg of messages) {
      if (msg.type === 'system') {
        lines.push(`> **[系统]** ${msg.content}`);
        lines.push('');
        continue;
      }

      if (msg.type === 'user') {
        lines.push(`### 主持人`);
        lines.push('');
        lines.push(`> ${msg.content.split('\n').join('\n> ')}`);
        lines.push('');
        continue;
      }

      // AI message
      const role = msg.role || discussion.roles.find(r => r.id === msg.roleId);
      if (role) {
        const displayName = role.humanName || role.name;
        const title = role.title ? ` (${role.title})` : '';
        lines.push(`### ${displayName}${title}`);
      } else {
        lines.push(`### AI`);
      }
      lines.push('');

      // Clean content: remove think tags
      const cleanContent = msg.content
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .trim();
      lines.push(cleanContent);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Summary
  if (discussion.summary) {
    lines.push('## 讨论摘要');
    lines.push('');
    lines.push(discussion.summary);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*由 AIDiscuss 导出 | ${new Date().toLocaleString('zh-CN')}*`);

  return lines.join('\n');
}

function formatMode(mode: string): string {
  const map: Record<string, string> = {
    spectator: '旁观模式',
    moderator: '主持人模式',
    boss_checkin: 'Boss签到模式',
  };
  return map[mode] || mode;
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    created: '已创建',
    running: '进行中',
    paused: '已暂停',
    completed: '已完成',
    checkpoint: '检查点',
  };
  return map[status] || status;
}
