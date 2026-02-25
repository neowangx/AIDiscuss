'use client';

import { useCallback, useRef } from 'react';
import { useDiscussionStore } from '@/stores/discussion-store';
import { SSEEvent, MessageData } from '@/types';

export function useStreaming() {
  const abortRef = useRef<AbortController | null>(null);
  const store = useDiscussionStore();

  const startRound = useCallback(
    async (discussionId: string, userInstruction?: string) => {
      if (store.isStreaming) return;

      store.setIsStreaming(true);
      store.setError(null);
      store.setCheckpointData(null);

      abortRef.current = new AbortController();

      try {
        const body: Record<string, string> = {};
        if (userInstruction) body.instruction = userInstruction;

        const response = await fetch(`/api/discussions/${discussionId}/round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: '请求失败' }));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const event: SSEEvent = JSON.parse(jsonStr);
                handleSSEEvent(event, store);
              } catch {
                // Skip malformed events
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          store.setError((error as Error).message);
        }
      } finally {
        store.setIsStreaming(false);
        store.setStreamingMessage(null);
      }
    },
    [store]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    store.setIsStreaming(false);
    store.setStreamingMessage(null);
  }, [store]);

  return { startRound, stopStreaming, isStreaming: store.isStreaming };
}

function handleSSEEvent(
  event: SSEEvent,
  store: ReturnType<typeof useDiscussionStore.getState>
) {
  switch (event.type) {
    case 'round_start':
      if (event.data.roundNumber !== undefined) {
        store.setCurrentRound(event.data.roundNumber);
      }
      break;

    case 'phase_change':
      if (event.data.phaseIndex !== undefined) {
        store.setCurrentPhase(event.data.phaseIndex);
      }
      break;

    case 'role_start':
      store.setStreamingMessage({
        id: `streaming-${Date.now()}`,
        roleId: event.data.roleId || '',
        roleName: event.data.roleName || '',
        content: '',
        isStreaming: true,
      });
      break;

    case 'text_delta':
      if (event.data.content) {
        store.appendStreamingContent(event.data.content);
      }
      break;

    case 'role_end': {
      const streaming = useDiscussionStore.getState().streamingMessage;
      if (streaming) {
        const msg: MessageData = {
          id: event.data.messageId || `msg-${Date.now()}`,
          discussionId: '',
          roleId: streaming.roleId,
          roundId: event.data.roundId || null,
          type: 'ai',
          content: streaming.content,
          phase: null,
          phaseName: null,
          createdAt: new Date().toISOString(),
          role: useDiscussionStore.getState().roles.find(r => r.id === streaming.roleId) || null,
        };
        store.addMessage(msg);
        store.setStreamingMessage(null);
      }
      break;
    }

    case 'checkpoint':
      if (event.data.checkpoint) {
        store.setCheckpointData(event.data.checkpoint);
        store.setStatus('checkpoint');
      }
      break;

    case 'discussion_end':
      store.setStatus('completed');
      break;

    case 'error':
      store.setError(event.data.error || '未知错误');
      break;

    case 'waiting_for_user':
      // In moderator mode, signal waiting for user input
      break;
  }
}
