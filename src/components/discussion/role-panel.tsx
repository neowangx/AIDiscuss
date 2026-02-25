'use client';

import { useState } from 'react';
import { useDiscussionStore } from '@/stores/discussion-store';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function RolePanel() {
  const { roles, streamingMessage } = useDiscussionStore();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const getProviderShortName = (providerId: string): string => {
    const names: Record<string, string> = {
      anthropic: 'Claude', openai: 'GPT', openrouter: 'OpenRouter',
      deepseek: 'DeepSeek', zhipu: 'GLM', kimi: 'Kimi',
      minimax: 'MiniMax', qwen: 'Qwen', ollama: 'Ollama',
    };
    return names[providerId] || providerId;
  };

  const roleCards = (compact: boolean) =>
    roles.map((role) => {
      const isSpeaking = streamingMessage?.roleId === role.id;
      const displayName = role.humanName || role.name;

      if (compact) {
        return (
          <div
            key={role.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs shrink-0 transition-all ${
              isSpeaking ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium ${
                isSpeaking ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: role.color }}
            >
              {displayName[0]}
            </div>
            <span className="truncate max-w-[60px]" style={{ color: isSpeaking ? role.color : undefined }}>
              {displayName}
            </span>
          </div>
        );
      }

      return (
        <div
          key={role.id}
          className={`p-3 rounded-lg transition-all ${
            isSpeaking
              ? 'bg-primary/5 ring-1 ring-primary/30'
              : 'hover:bg-secondary/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${
                isSpeaking ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: role.color }}
            >
              {displayName[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: role.color }}>
                {displayName}
                {role.humanName && role.humanName !== role.name && (
                  <span className="text-muted-foreground text-xs ml-1">({role.name})</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">{role.title}</div>
            </div>
          </div>

          {isSpeaking && (
            <div className="mt-2 flex items-center gap-1 text-xs text-primary">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              发言中
            </div>
          )}

          <div className="mt-1 text-xs text-muted-foreground truncate">
            {getProviderShortName(role.modelProvider)} · {role.expertise}
          </div>
        </div>
      );
    });

  return (
    <>
      {/* Desktop: side panel */}
      <div className="hidden md:block w-56 border-l border-border bg-card shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">参与角色</h3>
        </div>
        <div className="p-3 space-y-2">
          {roleCards(false)}
        </div>
      </div>

      {/* Mobile: collapsible top strip */}
      <div className="md:hidden border-b border-border bg-card">
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="w-full flex items-center justify-between px-4 py-2"
        >
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {roleCards(true)}
          </div>
          {mobileExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
          )}
        </button>
        {mobileExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
            {roleCards(false)}
          </div>
        )}
      </div>
    </>
  );
}
