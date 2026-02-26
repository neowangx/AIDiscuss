'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Eye, EyeOff, Check, AlertCircle, ChevronDown, ChevronRight, Plus, Trash2, X, Star, Play, FileText } from 'lucide-react';

interface CustomProviderEntry {
  name: string;
  baseUrl: string;
  key: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  baseUrl?: string;
  defaultModel: string;
  keyPlaceholder: string;
  isCustom: boolean;
}

type ProviderKeyValue = string | CustomProviderEntry;

interface SettingsData {
  providerKeys: Record<string, unknown>;
  configuredProviders: string[];
  defaultProvider: string;
  defaultModel: string;
  language: string;
  autoPlaySpeed: number;
  providers: ProviderInfo[];
}

function isCustomEntry(value: unknown): value is CustomProviderEntry {
  return typeof value === 'object' && value !== null && 'name' in value && 'baseUrl' in value && 'key' in value;
}

type SettingsTab = 'providers' | 'playback' | 'prompts';

const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'providers', label: '服务商配置' },
  { id: 'playback', label: '播放设置' },
  { id: 'prompts', label: 'Prompt 模板' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [providerKeys, setProviderKeys] = useState<Record<string, ProviderKeyValue>>({});
  const [baseUrlOverrides, setBaseUrlOverrides] = useState<Record<string, string>>({});
  const [modelOverrides, setModelOverrides] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [defaultProvider, setDefaultProvider] = useState('anthropic');
  const [defaultModel, setDefaultModel] = useState('claude-sonnet-4-20250514');
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(3);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: SettingsData) => {
        setSettings(data);
        initFromResponse(data);
        setDefaultProvider(data.defaultProvider || 'anthropic');
        setDefaultModel(data.defaultModel || 'claude-sonnet-4-20250514');
        setAutoPlaySpeed(data.autoPlaySpeed || 3);
      });
  }, []);

  const initFromResponse = (data: SettingsData) => {
    const keys: Record<string, ProviderKeyValue> = {};
    const overrides: Record<string, string> = {};

    for (const [id, value] of Object.entries(data.providerKeys)) {
      if (isCustomEntry(value)) {
        keys[id] = value;
      } else if (typeof value === 'object' && value !== null && 'key' in value) {
        const obj = value as { key: string; baseUrl?: string };
        keys[id] = obj.key;
        if (obj.baseUrl) overrides[id] = obj.baseUrl;
      } else if (typeof value === 'string') {
        keys[id] = value;
      }
    }

    setProviderKeys(keys);
    setBaseUrlOverrides(overrides);
  };

  const { configuredList, unconfiguredList } = useMemo(() => {
    if (!settings) return { configuredList: [] as ProviderInfo[], unconfiguredList: [] as ProviderInfo[] };
    const configured: ProviderInfo[] = [];
    const unconfigured: ProviderInfo[] = [];
    for (const p of settings.providers) {
      if (settings.configuredProviders.includes(p.id)) {
        configured.push(p);
      } else {
        unconfigured.push(p);
      }
    }
    return { configuredList: configured, unconfiguredList: unconfigured };
  }, [settings]);

  const buildSavePayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(providerKeys)) {
      if (value === null) {
        payload[id] = null;
      } else if (isCustomEntry(value)) {
        payload[id] = value;
      } else if (typeof value === 'string') {
        const override = baseUrlOverrides[id];
        payload[id] = { key: value, ...(override ? { baseUrl: override } : {}) };
      }
    }
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerKeys: buildSavePayload(),
          defaultProvider,
          defaultModel,
          autoPlaySpeed,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setSettings(data);
      initFromResponse(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleKeyVisibility = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const toggleExpand = (providerId: string) => {
    setExpandedProvider(prev => (prev === providerId ? null : providerId));
  };

  const updateBuiltinKey = (providerId: string, value: string) => {
    setProviderKeys(prev => ({ ...prev, [providerId]: value }));
  };

  const updateBaseUrlOverride = (providerId: string, value: string) => {
    setBaseUrlOverrides(prev => ({ ...prev, [providerId]: value }));
  };

  const updateModelOverride = (providerId: string, value: string) => {
    setModelOverrides(prev => ({ ...prev, [providerId]: value }));
    // If this is the default provider, update the global default model
    if (providerId === defaultProvider) {
      setDefaultModel(value);
    }
  };

  const getModelForProvider = (provider: ProviderInfo): string => {
    if (modelOverrides[provider.id]) return modelOverrides[provider.id];
    if (provider.id === defaultProvider) return defaultModel;
    return provider.defaultModel;
  };

  const setAsDefault = (providerId: string) => {
    setDefaultProvider(providerId);
    const provider = settings?.providers.find(p => p.id === providerId);
    const model = modelOverrides[providerId] || provider?.defaultModel || '';
    setDefaultModel(model);
  };

  const updateCustomProviderField = (providerId: string, field: keyof CustomProviderEntry, value: string) => {
    setProviderKeys(prev => {
      const existing = prev[providerId];
      const entry: CustomProviderEntry = isCustomEntry(existing)
        ? { ...existing, [field]: value }
        : { name: '', baseUrl: '', key: '', [field]: value };
      return { ...prev, [providerId]: entry };
    });
  };

  const addCustomProvider = () => {
    if (!customName.trim() || !customBaseUrl.trim()) return;
    const id = 'custom_' + customName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    setProviderKeys(prev => ({
      ...prev,
      [id]: { name: customName.trim(), baseUrl: customBaseUrl.trim(), key: customKey.trim() },
    }));
    if (settings) {
      setSettings({
        ...settings,
        providers: [
          ...settings.providers,
          {
            id,
            name: customName.trim(),
            type: 'openai-compatible',
            baseUrl: customBaseUrl.trim(),
            defaultModel: '',
            keyPlaceholder: 'API Key',
            isCustom: true,
          },
        ],
        configuredProviders: customKey.trim()
          ? [...settings.configuredProviders, id]
          : settings.configuredProviders,
      });
    }
    setCustomName('');
    setCustomBaseUrl('');
    setCustomKey('');
    setShowAddCustom(false);
    setExpandedProvider(id);
  };

  const deleteCustomProvider = (providerId: string) => {
    setProviderKeys(prev => {
      const next = { ...prev };
      next[providerId] = null as unknown as ProviderKeyValue;
      return next;
    });
    if (settings) {
      setSettings({
        ...settings,
        providers: settings.providers.filter(p => p.id !== providerId),
        configuredProviders: settings.configuredProviders.filter(id => id !== providerId),
      });
    }
    if (expandedProvider === providerId) setExpandedProvider(null);
    if (defaultProvider === providerId) {
      setDefaultProvider('anthropic');
      setDefaultModel('claude-sonnet-4-20250514');
    }
  };

  const handleTabChange = (tab: SettingsTab) => {
    if (tab === 'prompts') {
      router.push('/settings/prompts');
      return;
    }
    setActiveTab(tab);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const inputClass = "w-full mt-0.5 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  const renderProviderRow = (provider: ProviderInfo) => {
    const isConfigured = settings.configuredProviders.includes(provider.id);
    const isExpanded = expandedProvider === provider.id;
    const keyEntry = providerKeys[provider.id];
    const isCustom = provider.isCustom;
    const isDefault = defaultProvider === provider.id;
    const model = getModelForProvider(provider);

    return (
      <div key={provider.id} className={`border rounded-lg overflow-hidden transition-colors ${isDefault ? 'border-primary/50 bg-primary/[0.02]' : 'border-border'}`}>
        {/* Header row */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => toggleExpand(provider.id)}
        >
          {isConfigured ? (
            <Check className="w-4 h-4 text-green-500 shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isConfigured ? 'text-foreground' : 'text-muted-foreground'}`}>
                {provider.name}
              </span>
              {isCustom && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">自定义</span>
              )}
              {isDefault && isConfigured && (
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">默认</span>
              )}
            </div>
            {isConfigured && model && (
              <span className="text-xs text-muted-foreground">{model}</span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border bg-secondary/20">
            {isCustom ? (
              <>
                <label className="block">
                  <span className="text-xs text-muted-foreground">名称</span>
                  <input
                    type="text"
                    value={isCustomEntry(keyEntry) ? keyEntry.name : provider.name}
                    onChange={(e) => updateCustomProviderField(provider.id, 'name', e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">API Key</span>
                  <div className="relative mt-0.5">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      value={isCustomEntry(keyEntry) ? keyEntry.key : ''}
                      onChange={(e) => updateCustomProviderField(provider.id, 'key', e.target.value)}
                      placeholder={provider.keyPlaceholder}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(provider.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Base URL</span>
                  <input
                    type="text"
                    value={isCustomEntry(keyEntry) ? keyEntry.baseUrl : provider.baseUrl || ''}
                    onChange={(e) => updateCustomProviderField(provider.id, 'baseUrl', e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">模型</span>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => updateModelOverride(provider.id, e.target.value)}
                    placeholder="模型 ID，如 gpt-4o"
                    className={inputClass}
                  />
                </label>
                <div className="flex items-center justify-between pt-1">
                  {!isDefault ? (
                    <button
                      onClick={() => setAsDefault(provider.id)}
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                    >
                      <Star className="w-3.5 h-3.5" /> 设为默认
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-primary font-medium">
                      <Star className="w-3.5 h-3.5 fill-primary" /> 当前默认
                    </span>
                  )}
                  <button
                    onClick={() => deleteCustomProvider(provider.id)}
                    className="flex items-center gap-1 text-sm text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-3 h-3" /> 删除
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-xs text-muted-foreground">API Key</span>
                  <div className="relative mt-0.5">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      value={typeof keyEntry === 'string' ? keyEntry : ''}
                      onChange={(e) => updateBuiltinKey(provider.id, e.target.value)}
                      placeholder={provider.keyPlaceholder}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(provider.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Base URL</span>
                  <input
                    type="text"
                    value={baseUrlOverrides[provider.id] || ''}
                    onChange={(e) => updateBaseUrlOverride(provider.id, e.target.value)}
                    placeholder={provider.baseUrl ? `默认: ${provider.baseUrl}` : '使用 SDK 默认地址'}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">模型</span>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => updateModelOverride(provider.id, e.target.value)}
                    placeholder={`默认: ${provider.defaultModel}`}
                    className={inputClass}
                  />
                </label>
                {isConfigured && (
                  <div className="pt-1">
                    {!isDefault ? (
                      <button
                        onClick={() => setAsDefault(provider.id)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                      >
                        <Star className="w-3.5 h-3.5" /> 设为默认
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-primary font-medium">
                        <Star className="w-3.5 h-3.5 fill-primary" /> 当前默认
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">设置</h1>

      {/* Tab Navigation */}
      <div className="relative mb-6 border-b border-border">
        <nav className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
                  ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-full tab-underline" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-6 animate-fade-in" key={activeTab}>
        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <section className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                配置 AI 服务商的 API Key、地址和模型。带 <span className="text-primary font-medium">默认</span> 标记的服务商将用于新建讨论。
              </p>
            </div>

            <div className="space-y-2">
              {configuredList.map(renderProviderRow)}
              {unconfiguredList.map(renderProviderRow)}
            </div>

            {showAddCustom ? (
              <div className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-secondary/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">添加自定义服务</span>
                  <button onClick={() => setShowAddCustom(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <label className="block">
                  <span className="text-xs text-muted-foreground">名称</span>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="如：我的代理、OpenRouter"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Base URL</span>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">API Key（可选）</span>
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="sk-..."
                    className={inputClass}
                  />
                </label>
                <button
                  onClick={addCustomProvider}
                  disabled={!customName.trim() || !customBaseUrl.trim()}
                  className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" /> 添加
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCustom(true)}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="w-4 h-4" /> 自定义服务
              </button>
            )}
          </section>
        )}

        {/* Playback Tab */}
        {activeTab === 'playback' && (
          <section className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold">旁观模式</h2>
            <label className="block">
              <span className="text-sm font-medium">
                自动播放间隔：{autoPlaySpeed} 秒
              </span>
              <input
                type="range"
                min={1}
                max={10}
                value={autoPlaySpeed}
                onChange={(e) => setAutoPlaySpeed(parseInt(e.target.value))}
                className="w-full mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1秒</span>
                <span>10秒</span>
              </div>
            </label>
          </section>
        )}

        {/* Error & Save */}
        {activeTab !== 'prompts' && (
          <>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" /> 已保存
                </>
              ) : saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> 保存设置
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
