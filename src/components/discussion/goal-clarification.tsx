'use client';

import { useState } from 'react';
import { Send, Loader2, Target, SkipForward } from 'lucide-react';
import { DiscussionGoals } from '@/types';

interface GoalClarificationProps {
  question: string;
  goals: DiscussionGoals;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
  isLoading: boolean;
}

export function GoalClarification({ question, goals, onAnswer, onSkip, isLoading }: GoalClarificationProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (!answer.trim() || isLoading) return;
    onAnswer(answer.trim());
    setAnswer('');
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Goals Preview */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm text-primary">AI 识别的讨论目标</span>
        </div>
        <p className="text-sm font-medium">{goals.primaryGoal}</p>
        {goals.subGoals.length > 0 && (
          <ul className="mt-2 space-y-1">
            {goals.subGoals.map((g, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary/50" />
                {g}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Clarification Question */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-medium mb-3">{question}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="输入你的补充说明..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
          <button
            onClick={onSkip}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50"
            title="跳过，直接使用 AI 推断的目标"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
