'use client';

import { Target, CheckCircle2, Circle } from 'lucide-react';
import { DiscussionGoals } from '@/types';

interface GoalsPanelProps {
  goals: DiscussionGoals;
}

export function GoalsPanel({ goals }: GoalsPanelProps) {
  return (
    <div className="border-b border-border bg-card px-4 md:px-6 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">讨论目标</span>
        {goals.clarified && (
          <span className="px-1.5 py-0.5 rounded-full bg-success/10 text-success text-[10px]">已明确</span>
        )}
      </div>
      <p className="text-sm mb-2">{goals.primaryGoal}</p>
      {goals.subGoals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {goals.subGoals.map((g, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
            >
              <Circle className="w-2.5 h-2.5" />
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
