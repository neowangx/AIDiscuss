'use client';

import { useState } from 'react';
import { CheckpointData } from '@/types';
import { Flag, ArrowRight, RefreshCw, Compass, Loader2, Send } from 'lucide-react';

interface CheckpointCardProps {
  checkpoint: CheckpointData;
  discussionId: string;
  onRespond: (optionId: string, customInstruction?: string) => void;
  isResponding?: boolean;
}

const OPTION_ICONS: Record<string, React.ElementType> = {
  continue: ArrowRight,
  deepen: RefreshCw,
  redirect: Compass,
};

const OPTION_COLORS: Record<string, string> = {
  continue: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  deepen: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
  redirect: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
};

export function CheckpointCard({ checkpoint, discussionId, onRespond, isResponding }: CheckpointCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [responded, setResponded] = useState(false);

  const handleOptionClick = (optionId: string) => {
    if (responded || isResponding) return;

    if (optionId === 'redirect') {
      setSelectedOption(optionId);
    } else {
      setResponded(true);
      onRespond(optionId);
    }
  };

  const handleSendRedirect = () => {
    if (!customInstruction.trim() || responded || isResponding) return;
    setResponded(true);
    onRespond('redirect', customInstruction.trim());
  };

  return (
    <div className="mx-4 my-4 bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Flag className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="font-semibold text-sm">阶段检查点</div>
          <div className="text-xs text-muted-foreground">
            {checkpoint.phaseName} 已完成
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-xl p-4 text-sm leading-relaxed">
        {checkpoint.summary}
      </div>

      {/* Options */}
      {!responded ? (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-medium">请选择下一步：</div>
          <div className="grid gap-2">
            {checkpoint.options.map((option) => {
              const Icon = OPTION_ICONS[option.id] || ArrowRight;
              const colorClass = OPTION_COLORS[option.id] || 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80';

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  disabled={isResponding}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors disabled:opacity-50 ${
                    selectedOption === option.id ? 'ring-2 ring-primary' : ''
                  } ${colorClass}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs opacity-80">{option.description}</div>
                  </div>
                  {isResponding && selectedOption === option.id && (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom instruction input for redirect */}
          {selectedOption === 'redirect' && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendRedirect()}
                placeholder="输入你的引导方向..."
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button
                onClick={handleSendRedirect}
                disabled={!customInstruction.trim() || isResponding}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-warning text-white text-sm hover:opacity-90 disabled:opacity-50"
              >
                {isResponding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3" />
          已做出决策，讨论继续中...
        </div>
      )}
    </div>
  );
}
