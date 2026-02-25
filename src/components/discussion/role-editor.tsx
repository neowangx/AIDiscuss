'use client';

import { useState, useEffect } from 'react';
import { RoleConfig } from '@/types';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';

interface ProviderInfo {
  id: string;
  name: string;
  defaultModel: string;
  isCustom: boolean;
}

interface RoleEditorProps {
  roles: RoleConfig[];
  onChange: (roles: RoleConfig[]) => void;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

export function RoleEditor({ roles, onChange }: RoleEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.providers) setProviders(data.providers);
        if (data.configuredProviders) setConfiguredProviders(data.configuredProviders);
      })
      .catch(() => {});
  }, []);

  const getProviderName = (providerId: string): string => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  const getProviderShortName = (providerId: string): string => {
    const names: Record<string, string> = {
      anthropic: 'Claude',
      openai: 'GPT',
      openrouter: 'OpenRouter',
      deepseek: 'DeepSeek',
      zhipu: 'GLM',
      kimi: 'Kimi',
      minimax: 'MiniMax',
      qwen: 'Qwen',
      ollama: 'Ollama',
    };
    if (names[providerId]) return names[providerId];
    // For custom providers, use their display name
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  // Only show providers that have a configured API key
  const availableProviders = providers.filter(p => configuredProviders.includes(p.id));

  const updateRole = (index: number, updates: Partial<RoleConfig>) => {
    const newRoles = [...roles];
    newRoles[index] = { ...newRoles[index], ...updates };
    onChange(newRoles);
  };

  const removeRole = (index: number) => {
    onChange(roles.filter((_, i) => i !== index));
  };

  const addRole = () => {
    // Use first available configured provider, or fallback to anthropic
    const defaultProviderId = availableProviders[0]?.id || 'anthropic';
    const defaultProviderConfig = providers.find(p => p.id === defaultProviderId);
    const newRole: RoleConfig = {
      name: `角色${roles.length + 1}`,
      title: '讨论参与者',
      expertise: '通用',
      personality: '理性',
      speakingStyle: '简洁明了',
      principles: '追求真理',
      modelProvider: defaultProviderId,
      modelId: defaultProviderConfig?.defaultModel || 'claude-sonnet-4-20250514',
      color: COLORS[roles.length % COLORS.length],
      orderIndex: roles.length,
    };
    onChange([...roles, newRole]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">参与角色 ({roles.length})</h3>
        <button
          onClick={addRole}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
        >
          <Plus className="w-4 h-4" /> 添加角色
        </button>
      </div>

      <div className="space-y-2">
        {roles.map((role, i) => (
          <div
            key={i}
            className="rounded-xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50"
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                style={{ backgroundColor: role.color }}
              >
                {role.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {role.humanName || role.name}
                  {role.humanName && <span className="text-muted-foreground ml-1">({role.name})</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{role.title} · {role.expertise}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {getProviderShortName(role.modelProvider)}
                </span>
                {expandedIndex === i ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expanded Editor */}
            {expandedIndex === i && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-muted-foreground">名字</span>
                    <input
                      type="text"
                      value={role.name}
                      onChange={(e) => updateRole(i, { name: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">头衔</span>
                    <input
                      type="text"
                      value={role.title}
                      onChange={(e) => updateRole(i, { title: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-muted-foreground">专业领域</span>
                  <input
                    type="text"
                    value={role.expertise}
                    onChange={(e) => updateRole(i, { expertise: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted-foreground">性格特点</span>
                  <input
                    type="text"
                    value={role.personality}
                    onChange={(e) => updateRole(i, { personality: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted-foreground">发言风格</span>
                  <input
                    type="text"
                    value={role.speakingStyle}
                    onChange={(e) => updateRole(i, { speakingStyle: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted-foreground">核心原则</span>
                  <input
                    type="text"
                    value={role.principles}
                    onChange={(e) => updateRole(i, { principles: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                  />
                </label>

                {/* Personality fields */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-muted-foreground">人名（可选）</span>
                    <input
                      type="text"
                      value={role.humanName || ''}
                      onChange={(e) => updateRole(i, { humanName: e.target.value || undefined })}
                      placeholder="如：陈明远"
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">标志动作（可选）</span>
                    <input
                      type="text"
                      value={role.actionStyle || ''}
                      onChange={(e) => updateRole(i, { actionStyle: e.target.value || undefined })}
                      placeholder="如：*推了推眼镜*"
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-muted-foreground">背景故事（可选）</span>
                  <input
                    type="text"
                    value={role.backgroundStory || ''}
                    onChange={(e) => updateRole(i, { backgroundStory: e.target.value || undefined })}
                    placeholder="如：在硅谷工作十年的技术VP"
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Provider</span>
                    <select
                      value={role.modelProvider}
                      onChange={(e) => {
                        const newProviderId = e.target.value;
                        const providerConfig = providers.find(p => p.id === newProviderId);
                        updateRole(i, {
                          modelProvider: newProviderId,
                          modelId: providerConfig?.defaultModel || '',
                        });
                      }}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                    >
                      {availableProviders.length > 0 ? (
                        availableProviders.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))
                      ) : (
                        <option value={role.modelProvider}>{getProviderName(role.modelProvider)}</option>
                      )}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">模型</span>
                    <input
                      type="text"
                      value={role.modelId}
                      onChange={(e) => updateRole(i, { modelId: e.target.value })}
                      placeholder="如 gpt-4o"
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">颜色</span>
                    <input
                      type="color"
                      value={role.color}
                      onChange={(e) => updateRole(i, { color: e.target.value })}
                      className="w-full mt-0.5 h-8 rounded-lg border border-border bg-background cursor-pointer"
                    />
                  </label>
                </div>

                {roles.length > 2 && (
                  <button
                    onClick={() => removeRole(i)}
                    className="flex items-center gap-1 text-sm text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-3 h-3" /> 移除角色
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
