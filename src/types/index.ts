// ===== Framework Types =====
export interface FrameworkPhase {
  index: number;
  name: string;
  displayName: string;
  description: string;
  instruction: string;
  roundCount: number; // how many rounds for this phase
}

export interface FrameworkDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  phases: FrameworkPhase[];
  triggers: string[];
  phaseCount: number;
}

// ===== Role Types =====
export interface RoleConfig {
  id?: string;
  name: string;
  title: string;
  avatar?: string;
  expertise: string;
  personality: string;
  speakingStyle: string;
  principles: string;
  humanName?: string;       // e.g. "陈明远" - realistic name
  actionStyle?: string;     // e.g. "*推了推眼镜*" - signature action
  backgroundStory?: string; // e.g. "硅谷十年技术VP"
  roleType?: 'participant' | 'summarizer';
  abilities?: string[];
  modelProvider: string;
  modelId: string;
  color: string;
  orderIndex: number;
}

// ===== Discussion Types =====
export type DiscussionMode = 'spectator' | 'moderator' | 'boss_checkin' | 'smart';
export type DiscussionStatus = 'created' | 'running' | 'paused' | 'completed' | 'checkpoint' | 'waiting_user' | 'clarifying_goals';
export type MessageType = 'ai' | 'user' | 'system';

export interface DiscussionConfig {
  topic: string;
  frameworkId?: string;
  mode: DiscussionMode;
  roles: RoleConfig[];
}

export interface MessageData {
  id: string;
  discussionId: string;
  roleId?: string | null;
  roundId?: string | null;
  type: MessageType;
  content: string;
  phase?: number | null;
  phaseName?: string | null;
  createdAt: string;
  role?: RoleConfig | null;
}

export interface RoundData {
  id: string;
  discussionId: string;
  roundNumber: number;
  phaseName?: string | null;
  phaseIndex?: number | null;
  instruction?: string | null;
  status: string;
}

export interface DiscussionData {
  id: string;
  title: string;
  topic: string;
  frameworkId?: string | null;
  mode: DiscussionMode;
  status: DiscussionStatus;
  currentPhase: number;
  currentRound: number;
  summary?: string | null;
  goals?: DiscussionGoals | null;
  smartConfig?: SmartConfig | null;
  createdAt: string;
  updatedAt: string;
  roles: RoleConfig[];
  messages: MessageData[];
  rounds: RoundData[];
  framework?: FrameworkDefinition | null;
}

// ===== LLM Types =====
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMStreamEvent {
  type: 'text' | 'done' | 'error';
  content?: string;
  error?: string;
}

export interface LLMProviderConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

// ===== SSE Event Types =====
export type SSEEventType =
  | 'role_start'
  | 'text_delta'
  | 'role_end'
  | 'round_start'
  | 'round_end'
  | 'phase_change'
  | 'discussion_end'
  | 'checkpoint'
  | 'error'
  | 'waiting_for_user'
  | 'orchestrator_decision'
  | 'user_pull_in'
  | 'web_search_start'
  | 'web_search_result'
  | 'summary_start'
  | 'goals_confirmed';

export interface SSEEvent {
  type: SSEEventType;
  data: {
    roleId?: string;
    roleName?: string;
    content?: string;
    messageId?: string;
    roundNumber?: number;
    roundId?: string;
    phaseIndex?: number;
    phaseName?: string;
    error?: string;
    checkpoint?: CheckpointData;
    // Smart mode fields
    decision?: OrchestratorDecision;
    pullInQuestion?: string;
    searchQuery?: string;
    searchResults?: WebSearchResult[];
    goals?: DiscussionGoals;
  };
}

// ===== Checkpoint Types =====
export interface CheckpointOption {
  id: string;
  label: string;
  description: string;
}

export interface CheckpointData {
  roundId: string;
  phaseIndex: number;
  phaseName: string;
  summary: string;
  options: CheckpointOption[];
}

// ===== Topic Analysis Types =====
export interface TopicAnalysis {
  title: string;
  summary: string;
  recommendedFramework: string;
  frameworkReason: string;
  suggestedRoles: RoleConfig[];
  alternativeFrameworks: Array<{
    name: string;
    reason: string;
  }>;
}

// ===== User Types =====
export interface UserData {
  id: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
}

// ===== Audit Types =====
export interface AuditLogData {
  id: string;
  discussionId?: string | null;
  action: string;
  actor: string;
  details?: string | null;
  createdAt: string;
}

// ===== Export Types =====
export type ExportFormat = 'markdown' | 'json';

// ===== Share/Feedback Types =====
export interface FeedbackData {
  rating: number; // 1-5
  feedback?: string;
}

export interface ShareConfig {
  shareToken: string;
  shareUrl: string;
}

// ===== Prompt Template Types =====
export interface PromptTemplate {
  id: string;
  key: string;
  name: string;
  content: string;
  description?: string | null;
  isDefault: boolean;
}

// ===== Smart Discussion Types =====
export interface DiscussionGoals {
  primaryGoal: string;
  subGoals: string[];
  clarified: boolean;
}

export interface SmartConfig {
  roundsSinceSummary: number;
  lastSummaryRoundNumber: number;
  contextDigest: string;         // 压缩的滚动摘要（200字以内）
  pendingUserPullIn: boolean;
  lastPullInRound?: number;      // 上次拉入用户的轮次号，防止同一轮重复拉入
}

export interface OrchestratorDecision {
  selectedRoleIds: string[];
  reason: string;
  isSummaryRound: boolean;
  shouldPullInUser: boolean;
  pullInQuestion?: string;
  shouldSearch: boolean;
  searchQuery?: string;
  discussionComplete: boolean;
  nextTopicFocus: string;
  methodHint?: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ===== Store Types =====
export interface StreamingMessage {
  id: string;
  roleId: string;
  roleName: string;
  content: string;
  isStreaming: boolean;
}
