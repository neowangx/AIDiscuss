'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, History, Settings, Brain, Sparkles, Users, Zap, Loader2, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: '多角色讨论',
    desc: '3-5个AI角色从不同视角参与讨论，产生丰富的观点碰撞',
  },
  {
    icon: Brain,
    title: '10种思维框架',
    desc: '六顶思考帽、SWOT、事前验尸法等，自动匹配最佳框架',
  },
  {
    icon: Zap,
    title: '实时流式讨论',
    desc: '角色顺序发言，后面的角色能看到前面的发言，自然交锋',
  },
  {
    icon: Sparkles,
    title: '双模式切换',
    desc: '旁观模式自动播放，主持模式用户引导，随时切换',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [quickTopic, setQuickTopic] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuickStart = async () => {
    if (!quickTopic.trim()) return;
    setQuickLoading(true);
    setError('');

    try {
      const res = await fetch('/api/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: quickTopic }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const data = await res.json();
      router.push(`/discussion/${data.discussionId}`);
    } catch (e) {
      setError((e as Error).message);
      setQuickLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full text-center space-y-5 md:space-y-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          多角色 AI 圆桌讨论工具
        </div>

        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
          让 AI 从<span className="text-primary">多个视角</span>
          <br />帮你做更好的决策
        </h1>

        <p className="text-sm md:text-lg text-muted-foreground leading-relaxed">
          输入任何话题，AI 自动推荐思维框架、生成讨论角色，
          多个 AI 专家从不同视角展开深度讨论。
        </p>

        {/* Quick Start */}
        <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Zap className="w-4 h-4 text-warning" />
            快速开始
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickTopic}
              onChange={(e) => setQuickTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickStart()}
              placeholder="输入话题，一键开始讨论..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={quickLoading}
            />
            <button
              onClick={handleQuickStart}
              disabled={!quickTopic.trim() || quickLoading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
            >
              {quickLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  开始
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/new"
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            自定义讨论
          </Link>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            <History className="w-4 h-4" />
            历史记录
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-6 md:pt-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-4 rounded-xl bg-card border border-border text-left hover:border-primary/30 transition-colors"
            >
              <f.icon className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-3 h-3" />
            首次使用请先配置 API Key
          </Link>
        </div>
      </div>
    </div>
  );
}
