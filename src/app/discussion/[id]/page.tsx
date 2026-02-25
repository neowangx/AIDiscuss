'use client';

import { useEffect, useState, use } from 'react';
import { useDiscussionStore } from '@/stores/discussion-store';
import { MessageList } from '@/components/discussion/message-list';
import { RolePanel } from '@/components/discussion/role-panel';
import { PhaseIndicator } from '@/components/discussion/phase-indicator';
import { ControlBar } from '@/components/discussion/control-bar';
import { ExportMenu } from '@/components/discussion/export-menu';
import { FeedbackPanel } from '@/components/discussion/feedback-panel';
import { DiscussionData } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DiscussionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useDiscussionStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    const loadDiscussion = async () => {
      try {
        const res = await fetch(`/api/discussions/${id}`);
        if (!res.ok) throw new Error((await res.json()).error);
        const data: DiscussionData = await res.json();
        store.setDiscussion(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadDiscussion();
    return () => store.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const res = await fetch(`/api/discussions/${id}/summary`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      const { summary } = await res.json();
      store.setDiscussion({ ...store.discussion!, summary });
    } catch (e) {
      store.setError((e as Error).message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border bg-card px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold truncate text-sm md:text-base">{store.discussion?.title}</h2>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {store.discussion?.topic}
            </p>
          </div>
          {store.discussion && (
            <ExportMenu
              discussionId={id}
              discussionTitle={store.discussion.title}
            />
          )}
        </div>

        {/* Mobile: Role Panel (collapsible strip at top) */}
        <div className="md:hidden">
          <RolePanel />
        </div>

        {/* Phase Indicator */}
        <PhaseIndicator />

        {/* Error Banner */}
        {store.error && (
          <div className="mx-4 md:mx-6 mt-2 flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{store.error}</span>
          </div>
        )}

        {/* Summary */}
        {store.discussion?.summary && (
          <div className="mx-4 md:mx-6 mt-2 bg-success/5 border border-success/20 rounded-xl p-4">
            <h3 className="font-semibold text-success text-sm mb-2">讨论摘要</h3>
            <div className="text-sm prose-message">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {store.discussion.summary}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Feedback Panel - only for completed discussions */}
        {store.discussion?.status === 'completed' && (
          <FeedbackPanel
            discussionId={id}
            initialRating={(store.discussion as unknown as { rating?: number | null }).rating}
            initialFeedback={(store.discussion as unknown as { feedback?: string | null }).feedback}
          />
        )}

        {/* Messages */}
        <MessageList discussionId={id} />

        {/* Control Bar */}
        <ControlBar
          discussionId={id}
          onGenerateSummary={handleGenerateSummary}
          generatingSummary={generatingSummary}
        />
      </div>

      {/* Desktop: Role Panel (side panel) */}
      <div className="hidden md:block">
        <RolePanel />
      </div>
    </div>
  );
}
