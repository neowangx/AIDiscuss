'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, PlusCircle, History, Settings, Brain, LogIn, LogOut, User } from 'lucide-react';
import type { UserData } from '@/types';

const baseNavItems = [
  { href: '/', label: '首页', icon: Brain },
  { href: '/new', label: '新建讨论', icon: PlusCircle },
  { href: '/history', label: '历史记录', icon: History },
];

const adminNavItems = [
  { href: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setUser(null);
      router.refresh();
    } catch {
      // ignore
    }
  };

  return (
    <aside className="hidden md:flex w-60 border-r border-border bg-card flex-col shrink-0">
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold">AIDiscuss</h1>
            <p className="text-xs text-muted-foreground">AI 圆桌讨论</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {[...baseNavItems, ...(user?.isAdmin ? adminNavItems : [])].map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        {loading ? (
          <div className="h-9" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogIn className="w-4 h-4" />
            登录
          </Link>
        )}
      </div>
    </aside>
  );
}
