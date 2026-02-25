'use client';

import { useEffect, useState, use } from 'react';
import { DiscussionData, RoleConfig } from '@/types';
import { Loader2, AlertCircle, MessageSquare, Users, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [discussion, setDiscussion] = useState<DiscussionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '加载失败');
        }
        const data: DiscussionData = await res.json();
        setDiscussion(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-lg font-medium text-destructive">{error || '讨论不存在'}</p>
          <p className="text-sm text-muted-foreground">该分享链接无效或已过期</p>
        </div>
      </div>
    );
  }

  const roleMap = new Map<string, RoleConfig>();
  for (const role of discussion.roles) {
    if (role.id) roleMap.set(role.id, role);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <h1 className="text-xl md:text-2xl font-bold">{discussion.title}</h1>
          <p className="text-muted-foreground mt-1">{discussion.topic}</p>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
            {discussion.framework && (
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                {discussion.framework.displayName}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {discussion.roles.length} 位参与者
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              {discussion.messages.length} 条消息
            </span>
          </div>

          {/* Role tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {discussion.roles.map((role) => (
              <span
                key={role.id || role.name}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                {role.humanName || role.name}
                {role.title && (
                  <span className="text-muted-foreground">({role.title})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {discussion.messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="text-center">
                <span className="inline-block text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            );
          }

          if (msg.type === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] md:max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3">
                  <div className="text-xs opacity-80 mb-1">主持人</div>
                  <div className="text-sm prose-message">{msg.content}</div>
                </div>
              </div>
            );
          }

          // AI message
          const role = msg.role || (msg.roleId ? roleMap.get(msg.roleId) : null);
          const displayName = role?.humanName || role?.name || 'AI';
          const color = role?.color || '#6366f1';

          // Clean content
          const cleanContent = msg.content
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            .trim();

          if (!cleanContent) return null;

          return (
            <div key={msg.id} className="flex gap-3 animate-fade-in">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 mt-1"
                style={{ backgroundColor: color }}
              >
                {displayName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium text-sm" style={{ color }}>
                    {displayName}
                  </span>
                  {role?.humanName && role.humanName !== role.name && (
                    <span className="text-xs text-muted-foreground">{role.name}</span>
                  )}
                  {role?.title && (
                    <span className="text-xs text-muted-foreground">{role.title}</span>
                  )}
                  {msg.phaseName && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {msg.phaseName}
                    </span>
                  )}
                </div>
                <div
                  className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3"
                  style={{ borderTopColor: color + '40' }}
                >
                  <div className="text-sm prose-message">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {cleanContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        {discussion.summary && (
          <div className="bg-success/5 border border-success/20 rounded-xl p-4 mt-6">
            <h3 className="font-semibold text-success text-sm mb-2">讨论摘要</h3>
            <div className="text-sm prose-message">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {discussion.summary}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Footer watermark */}
      <div className="border-t border-border bg-card/50 mt-8">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            由 <span className="font-medium text-primary">AIDiscuss</span> 驱动 | 多角色 AI 圆桌讨论平台
          </p>
        </div>
      </div>
    </div>
  );
}
