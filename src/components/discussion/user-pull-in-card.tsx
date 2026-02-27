'use client';

import { useState } from 'react';
import { MessageCircleQuestion, Send, SkipForward, Loader2 } from 'lucide-react';

interface UserPullInCardProps {
  question: string;
  onRespond: (answer: string) => void;
  onSkip: () => void;
  isResponding?: boolean;
}

export function UserPullInCard({ question, onRespond, onSkip, isResponding }: UserPullInCardProps) {
  const [answer, setAnswer] = useState('');
  const [responded, setResponded] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim() || responded || isResponding) return;
    setResponded(true);
    onRespond(answer.trim());
  };

  const handleSkip = () => {
    if (responded || isResponding) return;
    setResponded(true);
    onSkip();
  };

  return (
    <div className="mx-4 my-4 bg-card border-2 border-warning/30 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
          <MessageCircleQuestion className="w-4 h-4 text-warning" />
        </div>
        <div>
          <div className="font-semibold text-sm">AI 需要你的输入</div>
          <div className="text-xs text-muted-foreground">讨论中发现需要你补充的信息</div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-warning/5 rounded-xl p-4 text-sm leading-relaxed">
        {question}
      </div>

      {/* Input */}
      {!responded ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="输入你的回答..."
            disabled={isResponding}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || isResponding}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-warning text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSkip}
            disabled={isResponding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50"
            title="跳过此问题"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {isResponding ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              处理中...
            </>
          ) : (
            '已回答，讨论继续中...'
          )}
        </div>
      )}
    </div>
  );
}
