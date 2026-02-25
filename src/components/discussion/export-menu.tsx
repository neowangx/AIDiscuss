'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Download,
  Share2,
  FileText,
  FileJson,
  ChevronDown,
  Check,
  Copy,
  Link2,
  Link2Off,
} from 'lucide-react';

interface ExportMenuProps {
  discussionId: string;
  discussionTitle: string;
}

export function ExportMenu({ discussionId, discussionTitle }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load share status on mount
  useEffect(() => {
    fetch(`/api/discussions/${discussionId}/share`)
      .then((r) => r.json())
      .then((data) => {
        if (data.shareUrl) setShareUrl(data.shareUrl);
      })
      .catch(() => {});
  }, [discussionId]);

  const handleExport = async (format: 'markdown' | 'json') => {
    try {
      const res = await fetch(
        `/api/discussions/${discussionId}/export?format=${format}`
      );
      if (!res.ok) throw new Error('导出失败');

      const blob = await res.blob();
      const ext = format === 'markdown' ? 'md' : 'json';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${discussionTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setOpen(false);
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/discussions/${discussionId}/share`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('生成分享链接失败');
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(data.shareUrl);

      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Share failed:', e);
    } finally {
      setShareLoading(false);
    }
    setOpen(false);
  };

  const handleCancelShare = async () => {
    try {
      await fetch(`/api/discussions/${discussionId}/share`, {
        method: 'DELETE',
      });
      setShareUrl(null);
    } catch (e) {
      console.error('Cancel share failed:', e);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">导出</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          {/* Export Markdown */}
          <button
            onClick={() => handleExport('markdown')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            导出 Markdown
          </button>

          {/* Export JSON */}
          <button
            onClick={() => handleExport('json')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
          >
            <FileJson className="w-4 h-4 text-muted-foreground" />
            导出 JSON
          </button>

          <div className="border-t border-border" />

          {/* Share */}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span className="text-success">已复制链接</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-muted-foreground" />
                {shareUrl ? '复制分享链接' : '生成分享链接'}
              </>
            )}
          </button>

          {/* Copy share link (when already shared) */}
          {shareUrl && (
            <>
              <button
                onClick={async () => {
                  const fullUrl = `${window.location.origin}${shareUrl}`;
                  await navigator.clipboard.writeText(fullUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
                复制链接
              </button>

              <button
                onClick={() => {
                  window.open(shareUrl, '_blank');
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
              >
                <Link2 className="w-4 h-4 text-muted-foreground" />
                预览分享页
              </button>

              <div className="border-t border-border" />

              <button
                onClick={handleCancelShare}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Link2Off className="w-4 h-4" />
                取消分享
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
