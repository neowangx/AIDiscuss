'use client';

import { create } from 'zustand';
import {
  DiscussionData,
  DiscussionMode,
  DiscussionStatus,
  MessageData,
  RoleConfig,
  StreamingMessage,
  FrameworkDefinition,
  CheckpointData,
  DiscussionGoals,
  OrchestratorDecision,
  WebSearchResult,
} from '@/types';

interface DiscussionState {
  // Discussion data
  discussion: DiscussionData | null;
  messages: MessageData[];
  roles: (RoleConfig & { id: string })[];
  framework: FrameworkDefinition | null;

  // UI state
  isStreaming: boolean;
  streamingMessage: StreamingMessage | null;
  currentPhase: number;
  currentRound: number;
  mode: DiscussionMode;
  status: DiscussionStatus;
  autoPlayEnabled: boolean;
  autoPlaySpeed: number; // seconds
  error: string | null;
  checkpointData: CheckpointData | null;

  // Smart mode state
  goals: DiscussionGoals | null;
  waitingForUser: boolean;
  pullInQuestion: string | null;
  orchestratorDecision: OrchestratorDecision | null;
  searchResults: WebSearchResult[] | null;

  // TTS state
  ttsEnabled: boolean;

  // Actions
  setDiscussion: (discussion: DiscussionData) => void;
  addMessage: (message: MessageData) => void;
  setStreamingMessage: (msg: StreamingMessage | null) => void;
  appendStreamingContent: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setCurrentPhase: (phase: number) => void;
  setCurrentRound: (round: number) => void;
  setMode: (mode: DiscussionMode) => void;
  setStatus: (status: DiscussionStatus) => void;
  setAutoPlayEnabled: (enabled: boolean) => void;
  setAutoPlaySpeed: (speed: number) => void;
  setError: (error: string | null) => void;
  setCheckpointData: (data: CheckpointData | null) => void;
  setGoals: (goals: DiscussionGoals | null) => void;
  setWaitingForUser: (waiting: boolean) => void;
  setPullInQuestion: (question: string | null) => void;
  setOrchestratorDecision: (decision: OrchestratorDecision | null) => void;
  setSearchResults: (results: WebSearchResult[] | null) => void;
  setTtsEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initialState = {
  discussion: null,
  messages: [],
  roles: [],
  framework: null,
  isStreaming: false,
  streamingMessage: null,
  currentPhase: 0,
  currentRound: 0,
  mode: 'spectator' as DiscussionMode,
  status: 'created' as DiscussionStatus,
  autoPlayEnabled: true,
  autoPlaySpeed: 3,
  error: null,
  checkpointData: null,
  goals: null,
  waitingForUser: false,
  pullInQuestion: null,
  orchestratorDecision: null,
  searchResults: null,
  ttsEnabled: false,
};

export const useDiscussionStore = create<DiscussionState>((set) => ({
  ...initialState,

  setDiscussion: (discussion) =>
    set({
      discussion,
      messages: discussion.messages || [],
      roles: discussion.roles as (RoleConfig & { id: string })[],
      framework: discussion.framework || null,
      currentPhase: discussion.currentPhase,
      currentRound: discussion.currentRound,
      mode: discussion.mode,
      status: discussion.status,
      goals: discussion.goals || null,
      waitingForUser: discussion.status === 'waiting_user',
    }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setStreamingMessage: (msg) => set({ streamingMessage: msg }),

  appendStreamingContent: (content) =>
    set((state) => ({
      streamingMessage: state.streamingMessage
        ? { ...state.streamingMessage, content: state.streamingMessage.content + content }
        : null,
    })),

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  setCurrentRound: (round) => set({ currentRound: round }),
  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),
  setAutoPlayEnabled: (enabled) => set({ autoPlayEnabled: enabled }),
  setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),
  setError: (error) => set({ error }),
  setCheckpointData: (data) => set({ checkpointData: data }),
  setGoals: (goals) => set({ goals }),
  setWaitingForUser: (waiting) => set({ waitingForUser: waiting }),
  setPullInQuestion: (question) => set({ pullInQuestion: question }),
  setOrchestratorDecision: (decision) => set({ orchestratorDecision: decision }),
  setSearchResults: (results) => set({ searchResults: results }),
  setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
  reset: () => set(initialState),
}));
