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
      if (isStreaming || store.status === 'completed') return;
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
    store.setAutoPlayEnabled(true);
    store.setStatus('running');
  }, [store]);

  const handleToggleMode = useCallback(() => {
    const modes: Array<'spectator' | 'moderator' | 'boss_checkin'> = ['spectator', 'boss_checkin', 'moderator'];
    const currentIndex = modes.indexOf(store.mode as 'spectator' | 'moderator' | 'boss_checkin');
    const newMode = modes[(currentIndex + 1) % modes.length];
    store.setMode(newMode);
    // Update on server
    fetch(`/api/discussions/${discussionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
    });
  }, [discussionId, store]);

  // Auto-play in spectator and boss_checkin modes
  useEffect(() => {
    if (
      (store.mode === 'spectator' || store.mode === 'boss_checkin') &&
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
    isStreaming,
    mode: store.mode,
    status: store.status,
    autoPlayEnabled: store.autoPlayEnabled,
  };
}
