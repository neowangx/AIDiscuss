'use client';

import { Brain } from 'lucide-react';
import { OrchestratorDecision, RoleConfig } from '@/types';

interface OrchestratorIndicatorProps {
  decision: OrchestratorDecision;
  roles: (RoleConfig & { id: string })[];
}

export function OrchestratorIndicator({ decision, roles }: OrchestratorIndicatorProps) {
  const selectedRoles = decision.selectedRoleIds
    .map(id => roles.find(r => r.id === id))
    .filter((r): r is (RoleConfig & { id: string }) => r !== undefined);

  return (
    <div className="flex items-center gap-2 mx-4 my-3 px-4 py-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs">
      <Brain className="w-4 h-4 text-emerald-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">本轮发言：</span>
        <span className="font-medium">
          {selectedRoles.map((r, i) => (
            <span key={r.id}>
              {i > 0 && '、'}
              <span style={{ color: r.color }}>{r.humanName || r.name}</span>
            </span>
          ))}
        </span>
        {decision.nextTopicFocus && (
          <>
            <span className="text-muted-foreground mx-1.5">—</span>
            <span className="text-muted-foreground">聚焦: </span>
            <span className="text-foreground">{decision.nextTopicFocus}</span>
          </>
        )}
      </div>
      {decision.methodHint && (
        <span className="px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 text-[10px] font-medium whitespace-nowrap">
          💡{decision.methodHint}
        </span>
      )}
      {decision.isSummaryRound && (
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium">
          总结轮
        </span>
      )}
    </div>
  );
}
