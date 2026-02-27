'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Brain, PlusCircle, History, Settings, LogIn, User } from 'lucide-react';
import type { UserData } from '@/types';

const baseNavItems = [
  { href: '/', label: '首页', icon: Brain },
  { href: '/new', label: '新建', icon: PlusCircle },
  { href: '/history', label: '历史', icon: History },
];

const adminNavItems = [
  { href: '/settings', label: '设置', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  // Hide on discussion pages (they have their own controls)
  if (pathname.startsWith('/discussion/')) return null;

  // Build items: include settings only for admin, add user/login link
  const navItems = [...baseNavItems, ...(user?.isAdmin ? adminNavItems : [])];
  const items = loaded && !user
    ? [
        ...navItems,
        { href: '/login', label: '登录', icon: LogIn },
      ]
    : [
        ...navItems,
        { href: '/login', label: user?.name?.slice(0, 2) || '我', icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
