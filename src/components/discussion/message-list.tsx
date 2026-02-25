'use client';

import { useState, useCallback } from 'react';
import { useDiscussionStore } from '@/stores/discussion-store';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { MessageBubble } from './message-bubble';
import { CheckpointCard } from './checkpoint-card';

interface MessageListProps {
  discussionId?: string;
}

export function MessageList({ discussionId }: MessageListProps) {
  const { messages, streamingMessage, roles, checkpointData, status } = useDiscussionStore();
  const store = useDiscussionStore();
  const { containerRef, handleScroll } = useAutoScroll([messages.length, streamingMessage?.content]);
  const [checkpointResponding, setCheckpointResponding] = useState(false);

  const getRoleInfo = (roleId: string | null | undefined) => {
    if (!roleId) return { name: '系统', title: '', color: '#64748b', humanName: undefined };
    const role = roles.find(r => r.id === roleId);
    return role || { name: '未知', title: '', color: '#64748b', humanName: undefined };
  };

  const handleCheckpointRespond = useCallback(async (optionId: string, customInstruction?: string) => {
    if (!discussionId || !checkpointData) return;
    setCheckpointResponding(true);

    try {
      const res = await fetch(`/api/discussions/${discussionId}/checkpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: checkpointData.roundId,
          optionId,
          customInstruction,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error);
      }

      // Clear checkpoint and resume
      store.setCheckpointData(null);
      store.setStatus('running');
    } catch (error) {
      store.setError((error as Error).message);
    } finally {
      setCheckpointResponding(false);
    }
  }, [discussionId, checkpointData, store]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-4"
    >
      {messages.length === 0 && !streamingMessage && (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          讨论尚未开始，点击下方按钮开始第一轮讨论
        </div>
      )}

      {messages.map((msg) => {
        if (msg.type === 'user') {
          return (
            <MessageBubble
              key={msg.id}
              roleName="主持人"
              content={msg.content}
              color="#6366f1"
              isUser
            />
          );
        }

        if (msg.type === 'system') {
          return (
            <div key={msg.id} className="text-center text-xs text-muted-foreground my-4 py-2 border-y border-border">
              {msg.content}
            </div>
          );
        }

        const role = getRoleInfo(msg.roleId);
        return (
          <MessageBubble
            key={msg.id}
            roleName={role.name}
            humanName={role.humanName}
            roleTitle={role.title}
            content={msg.content}
            color={role.color}
            phaseName={msg.phaseName}
          />
        );
      })}

      {/* Streaming message */}
      {streamingMessage && (() => {
        const streamRole = getRoleInfo(streamingMessage.roleId);
        return (
          <MessageBubble
            roleName={streamingMessage.roleName}
            humanName={streamRole.humanName}
            roleTitle={streamRole.title}
            content={streamingMessage.content}
            color={streamRole.color || '#6366f1'}
            isStreaming
          />
        );
      })()}

      {/* Checkpoint Card */}
      {checkpointData && status === 'checkpoint' && discussionId && (
        <CheckpointCard
          checkpoint={checkpointData}
          discussionId={discussionId}
          onRespond={handleCheckpointRespond}
          isResponding={checkpointResponding}
        />
      )}
    </div>
  );
}
