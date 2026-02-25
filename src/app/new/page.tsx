'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Loader2, Sparkles, MessageSquare, Check } from 'lucide-react';
import { RoleConfig, TopicAnalysis, FrameworkDefinition } from '@/types';
import { FrameworkSelector } from '@/components/discussion/framework-selector';
import { RoleEditor } from '@/components/discussion/role-editor';

type Step = 1 | 2 | 3;

export default function NewDiscussionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [topic, setTopic] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TopicAnalysis | null>(null);
  const [frameworks, setFrameworks] = useState<FrameworkDefinition[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [mode, setMode] = useState<'spectator' | 'moderator' | 'boss_checkin'>('boss_checkin');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!topic.trim()) return;
    setAnalyzing(true);
    setError('');

    try {
      // Fetch frameworks first
      const fwRes = await fetch('/api/frameworks');
      const fwData = await fwRes.json();
      setFrameworks(fwData);

      // Analyze topic
      const res = await fetch('/api/analyze-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const data: TopicAnalysis = await res.json();
      setAnalysis(data);
      setSelectedFramework(data.recommendedFramework);
      setRoles(data.suggestedRoles);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');

    try {
      const fw = frameworks.find(f => f.name === selectedFramework);
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: analysis?.title || topic.slice(0, 50),
          topic,
          frameworkId: fw?.id,
          mode,
          roles,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const discussion = await res.json();
      router.push(`/discussion/${discussion.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-1.5 md:gap-2">
            <div
              className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-medium ${
                s < step
                  ? 'bg-success text-white'
                  : s === step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <Check className="w-3.5 h-3.5 md:w-4 md:h-4" /> : s}
            </div>
            <span className={`text-xs md:text-sm hidden sm:inline ${s === step ? 'font-medium' : 'text-muted-foreground'}`}>
              {s === 1 ? '输入主题' : s === 2 ? '选择框架与角色' : '确认启动'}
            </span>
            {s < 3 && <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground mx-0.5 md:mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Input Topic */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">输入讨论主题</h2>
            <p className="text-muted-foreground">
              描述你想讨论的问题、决策或话题，AI 会分析并推荐最佳讨论方案。
            </p>
          </div>

          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：我们应该用 Rust 还是 Go 来重写后端服务？需要考虑团队经验、性能需求、开发效率和长期维护..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!topic.trim() || analyzing}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI 分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                分析主题
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Framework & Roles */}
      {step === 2 && analysis && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">选择框架与角色</h2>
            <p className="text-muted-foreground">
              AI 推荐了以下方案，你可以调整框架、修改角色或更改模型配置。
            </p>
          </div>

          {/* Analysis Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <h3 className="font-semibold text-primary mb-1">{analysis.title}</h3>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>

          {/* Framework Selection */}
          <FrameworkSelector
            frameworks={frameworks}
            selected={selectedFramework}
            recommended={analysis.recommendedFramework}
            recommendReason={analysis.frameworkReason}
            onSelect={setSelectedFramework}
          />

          {/* Role Editor */}
          <RoleEditor
            roles={roles}
            onChange={setRoles}
          />

          {/* Mode Selection */}
          <div className="space-y-2">
            <h3 className="font-semibold">讨论模式</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'boss_checkin' as const, label: 'Boss 模式', desc: 'AI 自动讨论，阶段切换时暂停等你决策（推荐）', recommended: true },
                { value: 'spectator' as const, label: '旁观模式', desc: 'AI 角色自动轮流讨论，你在一旁观看', recommended: false },
                { value: 'moderator' as const, label: '主持模式', desc: '你引导每轮讨论方向，AI 角色响应你的指令', recommended: false },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`p-4 rounded-xl border text-left transition-colors relative ${
                    mode === m.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {m.recommended && (
                    <span className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">
                      推荐
                    </span>
                  )}
                  <span className="font-medium text-sm">{m.label}</span>
                  <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              上一步
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90"
            >
              下一步
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && analysis && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">确认启动讨论</h2>
            <p className="text-muted-foreground">检查以下配置，确认后即可开始讨论。</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">主题</span>
              <p className="font-medium">{topic}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">思维框架</span>
              <p className="font-medium">
                {frameworks.find(f => f.name === selectedFramework)?.displayName || selectedFramework}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">讨论模式</span>
              <p className="font-medium">
                {mode === 'spectator' ? '旁观模式' : mode === 'boss_checkin' ? 'Boss 模式' : '主持模式'}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">参与角色 ({roles.length}人)</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {roles.map((role, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: role.color + '20', color: role.color }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                    {role.humanName || role.name} · {role.title}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              上一步
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  启动讨论
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
