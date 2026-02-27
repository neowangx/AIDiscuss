'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useDiscussionStore } from '@/stores/discussion-store';
import { useStreaming } from './use-streaming';

export function useDiscussionControls(discussionId: string) {
  const store = useDiscussionStore();
  const { startRound, stopStreaming, isStreaming } = useStreaming();
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNextRound = useCallback(
    (instruction?: string) => {
      if (isStreaming || store.status === 'completed' || store.status === 'waiting_user') return;
      store.setStatus('running');
      startRound(discussionId, instruction);
    },
    [discussionId, isStreaming, store, startRound]
  );

  const handlePause = useCallback(() => {
    store.setAutoPlayEnabled(false);
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (isStreaming) {
      stopStreaming();
    }
    store.setStatus('paused');
  }, [isStreaming, store, stopStreaming]);

  const handleResume = useCallback(() => {
    if (store.status === 'waiting_user') return; // Don't auto-resume when waiting for user
    store.setAutoPlayEnabled(true);
    store.setStatus('running');
  }, [store]);

  const handleToggleMode = useCallback(() => {
    const modes: Array<'spectator' | 'moderator' | 'boss_checkin' | 'smart'> = ['spectator', 'boss_checkin', 'moderator', 'smart'];
    const currentIndex = modes.indexOf(store.mode as typeof modes[number]);
    const newMode = modes[(currentIndex + 1) % modes.length];
    store.setMode(newMode);
    // Update on server
    fetch(`/api/discussions/${discussionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
    });
  }, [discussionId, store]);

  const handleUserPullInResponse = useCallback(
    async (answer: string) => {
      try {
        const res = await fetch(`/api/discussions/${discussionId}/user-input`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '请求失败' }));
          throw new Error(err.error);
        }
        store.setWaitingForUser(false);
        store.setPullInQuestion(null);
        store.setStatus('running');
        // Directly start next round instead of waiting for auto-play timer
        startRound(discussionId);
      } catch (error) {
        store.setError((error as Error).message);
      }
    },
    [discussionId, store, startRound]
  );

  const handleSkipPullIn = useCallback(async () => {
    store.setWaitingForUser(false);
    store.setPullInQuestion(null);
    try {
      await fetch(`/api/discussions/${discussionId}/user-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: '（用户跳过了此问题）' }),
      });
      store.setStatus('running');
      // Directly start next round
      startRound(discussionId);
    } catch (error) {
      store.setError((error as Error).message);
    }
  }, [discussionId, store, startRound]);

  // Auto-play in spectator, boss_checkin, and smart modes
  // Note: status === 'running' already excludes 'waiting_user'
  useEffect(() => {
    if (
      (store.mode === 'spectator' || store.mode === 'boss_checkin' || store.mode === 'smart') &&
      store.autoPlayEnabled &&
      store.status === 'running' &&
      !isStreaming
    ) {
      autoPlayTimerRef.current = setTimeout(() => {
        handleNextRound();
      }, store.autoPlaySpeed * 1000);
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [store.mode, store.autoPlayEnabled, store.status, isStreaming, store.autoPlaySpeed, handleNextRound]);

  return {
    handleNextRound,
    handlePause,
    handleResume,
    handleToggleMode,
    handleUserPullInResponse,
    handleSkipPullIn,
    isStreaming,
    mode: store.mode,
    status: store.status,
    autoPlayEnabled: store.autoPlayEnabled,
  };
}
