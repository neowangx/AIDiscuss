'use client';

import { useState } from 'react';
import { Play, Pause, SkipForward, Eye, Hand, Crown, Brain, Send, Loader2, FileText, Volume2, VolumeX, SkipForwardIcon } from 'lucide-react';
import { useDiscussionControls } from '@/hooks/use-discussion-controls';
import { useDiscussionStore } from '@/stores/discussion-store';

interface ControlBarProps {
  discussionId: string;
  onGenerateSummary: () => void;
  generatingSummary: boolean;
  ttsEnabled?: boolean;
  onToggleTTS?: () => void;
}

export function ControlBar({ discussionId, onGenerateSummary, generatingSummary, ttsEnabled, onToggleTTS }: ControlBarProps) {
  const {
    handleNextRound,
    handlePause,
    handleResume,
    handleToggleMode,
    handleUserPullInResponse,
    handleSkipPullIn,
    isStreaming,
    mode,
    status,
    autoPlayEnabled,
  } = useDiscussionControls(discussionId);

  const { currentRound, pullInQuestion } = useDiscussionStore();
  const [instruction, setInstruction] = useState('');
  const [pullInAnswer, setPullInAnswer] = useState('');

  const handleSendPullInAnswer = () => {
    if (!pullInAnswer.trim()) return;
    handleUserPullInResponse(pullInAnswer.trim());
    setPullInAnswer('');
  };

  const handleSendInstruction = () => {
    if (!instruction.trim()) return;
    handleNextRound(instruction.trim());
    setInstruction('');
  };

  const modeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    spectator: { icon: Eye, label: '旁观', color: 'bg-blue-500/10 text-blue-500' },
    moderator: { icon: Hand, label: '主持', color: 'bg-orange-500/10 text-orange-500' },
    boss_checkin: { icon: Crown, label: 'Boss', color: 'bg-purple-500/10 text-purple-500' },
    smart: { icon: Brain, label: '智能', color: 'bg-emerald-500/10 text-emerald-500' },
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

        {/* Spectator / Boss Check-in / Smart Mode Controls */}
        {(mode === 'spectator' || mode === 'boss_checkin' || mode === 'smart') && !isCheckpoint && status !== 'waiting_user' && (
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

        {/* Waiting for user input (smart mode) - compact indicator */}
        {status === 'waiting_user' && (
          <div className="flex items-center gap-1.5 text-sm text-warning">
            <Brain className="w-4 h-4" />
            等待你的回答
          </div>
        )}

        {/* TTS Toggle */}
        {onToggleTTS && (
          <button
            onClick={onToggleTTS}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              ttsEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title={ttsEnabled ? '关闭语音朗读' : '开启语音朗读'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
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

      {/* Waiting for user input — inline answer box */}
      {status === 'waiting_user' && (
        <div className="mt-3">
          {pullInQuestion && (
            <div className="text-sm text-muted-foreground mb-2 whitespace-pre-line bg-muted/50 rounded-lg px-3 py-2">
              {pullInQuestion}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={pullInAnswer}
              onChange={(e) => setPullInAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendPullInAnswer()}
              placeholder="输入你的回答..."
              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSendPullInAnswer}
              disabled={!pullInAnswer.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={handleSkipPullIn}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-sm hover:bg-secondary/80"
              title="跳过此问题"
            >
              <SkipForwardIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Moderator Input */}
      {mode === 'moderator' && status !== 'completed' && !isCheckpoint && status !== 'waiting_user' && (
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
