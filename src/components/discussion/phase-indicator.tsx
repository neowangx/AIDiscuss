'use client';

import { useDiscussionStore } from '@/stores/discussion-store';
import { Check } from 'lucide-react';

export function PhaseIndicator() {
  const { framework, currentPhase } = useDiscussionStore();

  if (!framework || !framework.phases) return null;

  return (
    <div className="border-b border-border bg-card/50 px-3 md:px-6 py-2 md:py-3">
      <div className="flex items-center gap-1 overflow-x-auto">
        {framework.phases.map((phase, i) => {
          const isActive = i === currentPhase;
          const isDone = i < currentPhase;

          return (
            <div key={phase.name} className="flex items-center">
              {i > 0 && (
                <div className={`w-6 h-0.5 mx-0.5 ${isDone ? 'bg-success' : 'bg-border'}`} />
              )}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : isDone
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone && <Check className="w-3 h-3" />}
                {phase.displayName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
