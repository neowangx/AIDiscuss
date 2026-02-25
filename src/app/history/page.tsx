'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MessageSquare, Clock, Users, Trash2, Loader2 } from 'lucide-react';

interface DiscussionItem {
  id: string;
  title: string;
  topic: string;
  status: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  roles: Array<{ name: string; color: string }>;
  framework: { displayName: string } | null;
  messageCount: number;
  roundCount: number;
}

export default function HistoryPage() {
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const fetchDiscussions = async (searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/discussions?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setDiscussions(data.discussions);
      setTotal(data.total);
    } catch (e) {
      console.error('Failed to fetch discussions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const handleSearch = () => {
    fetchDiscussions(search);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个讨论吗？')) return;
    try {
      await fetch(`/api/discussions/${id}`, { method: 'DELETE' });
      setDiscussions(prev => prev.filter(d => d.id !== id));
      setTotal(prev => prev - 1);
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    created: { label: '待开始', color: '#64748b' },
    running: { label: '进行中', color: '#3b82f6' },
    paused: { label: '已暂停', color: '#f59e0b' },
    completed: { label: '已完成', color: '#10b981' },
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">历史记录</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} 个讨论</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索讨论主题..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
        >
          搜索
        </button>
      </div>

      {/* Discussion List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>还没有讨论记录</p>
          <Link
            href="/new"
            className="inline-block mt-3 text-primary hover:underline text-sm"
          >
            开始第一个讨论
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((d) => {
            const statusInfo = statusLabels[d.status] || statusLabels.created;
            return (
              <Link
                key={d.id}
                href={`/discussion/${d.id}`}
                className="block bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{d.title}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: statusInfo.color + '15',
                          color: statusInfo.color,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{d.topic}</p>

                    <div className="flex items-center gap-2 md:gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      {d.framework && (
                        <span className="bg-muted px-2 py-0.5 rounded">
                          {d.framework.displayName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {d.roles.length} 角色
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {d.messageCount} 消息
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(d.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {/* Role avatars */}
                    <div className="flex -space-x-1.5 mt-2">
                      {d.roles.slice(0, 5).map((role, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-white text-[10px] font-medium"
                          style={{ backgroundColor: role.color }}
                          title={role.name}
                        >
                          {role.name[0]}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(d.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
