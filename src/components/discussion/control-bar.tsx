'use client';

import { useState } from 'react';
import { Play, Pause, SkipForward, Eye, Hand, Crown, Send, Loader2, FileText } from 'lucide-react';
import { useDiscussionControls } from '@/hooks/use-discussion-controls';
import { useDiscussionStore } from '@/stores/discussion-store';

interface ControlBarProps {
  discussionId: string;
  onGenerateSummary: () => void;
  generatingSummary: boolean;
}

export function ControlBar({ discussionId, onGenerateSummary, generatingSummary }: ControlBarProps) {
  const {
    handleNextRound,
    handlePause,
    handleResume,
    handleToggleMode,
    isStreaming,
    mode,
    status,
    autoPlayEnabled,
  } = useDiscussionControls(discussionId);

  const { currentRound } = useDiscussionStore();
  const [instruction, setInstruction] = useState('');

  const handleSendInstruction = () => {
    if (!instruction.trim()) return;
    handleNextRound(instruction.trim());
    setInstruction('');
  };

  const modeConfig = {
    spectator: { icon: Eye, label: '旁观', color: 'bg-blue-500/10 text-blue-500' },
    moderator: { icon: Hand, label: '主持', color: 'bg-orange-500/10 text-orange-500' },
    boss_checkin: { icon: Crown, label: 'Boss', color: 'bg-purple-500/10 text-purple-500' },
  };

  const currentModeConfig = modeConfig[mode] || modeConfig.spectator;
  const ModeIcon = currentModeConfig.icon;

  // In checkpoint status, hide most controls
  const isCheckpoint = status === 'checkpoint';

  return (
    <div className="border-t border-border bg-card px-3 md:px-6 py-2 md:py-3">
      {/* Mode Switch & Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mode Toggle */}
        <button
          onClick={handleToggleMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${currentModeConfig.color}`}
          title={`切换模式（当前: ${currentModeConfig.label}）`}
        >
          <ModeIcon className="w-4 h-4" /> <span className="hidden sm:inline">{currentModeConfig.label}</span>
        </button>

        {/* Spectator / Boss Check-in Mode Controls */}
        {(mode === 'spectator' || mode === 'boss_checkin') && !isCheckpoint && (
          <div className="flex items-center gap-2">
            {status === 'completed' ? (
              <button
                onClick={onGenerateSummary}
                disabled={generatingSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-success/10 text-success hover:bg-success/20"
              >
                {generatingSummary ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                生成摘要
              </button>
            ) : (
              <>
                {isStreaming || (autoPlayEnabled && status === 'running') ? (
                  <button
                    onClick={handlePause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-secondary hover:bg-secondary/80"
                  >
                    <Pause className="w-4 h-4" />
                    <span className="hidden sm:inline">暂停</span>
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <Play className="w-4 h-4" />
                    <span className="hidden sm:inline">{status === 'created' ? '开始讨论' : '继续'}</span>
                  </button>
                )}
                <button
                  onClick={() => handleNextRound()}
                  disabled={isStreaming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" />
                  <span className="hidden sm:inline">下一轮</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Checkpoint indicator */}
        {isCheckpoint && (
          <div className="flex items-center gap-1.5 text-sm text-primary">
            <Crown className="w-4 h-4" />
            等待 Boss 决策...
          </div>
        )}

        {/* Round indicator */}
        <span className="text-xs text-muted-foreground ml-auto">
          第 {currentRound + 1} 轮
          {isStreaming && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              讨论中
            </span>
          )}
        </span>
      </div>

      {/* Moderator Input */}
      {mode === 'moderator' && status !== 'completed' && !isCheckpoint && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendInstruction()}
            placeholder="输入你的引导指令，例如：请从技术可行性角度分析..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={handleSendInstruction}
            disabled={isStreaming || !instruction.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
