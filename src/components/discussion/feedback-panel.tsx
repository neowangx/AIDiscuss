'use client';

import { useState } from 'react';
import { Star, Send, Check } from 'lucide-react';

interface FeedbackPanelProps {
  discussionId: string;
  initialRating?: number | null;
  initialFeedback?: string | null;
}

export function FeedbackPanel({
  discussionId,
  initialRating,
  initialFeedback,
}: FeedbackPanelProps) {
  const [rating, setRating] = useState(initialRating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState(initialFeedback || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!initialRating);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/discussions/${discussionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback: feedback || undefined }),
      });
      if (!res.ok) throw new Error('提交失败');
      setSubmitted(true);
    } catch (e) {
      console.error('Feedback submit failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-4 md:mx-6 mt-3 bg-card border border-border rounded-xl p-4 animate-fade-in">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        {submitted ? (
          <>
            <Check className="w-4 h-4 text-success" />
            感谢您的反馈
          </>
        ) : (
          '为这次讨论评分'
        )}
      </h3>

      {/* Star Rating */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => {
              setRating(star);
              setSubmitted(false);
            }}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`${star} 星`}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= (hoveredRating || rating)
                  ? 'text-warning fill-warning'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">
            {['', '很差', '一般', '还不错', '很好', '非常棒'][rating]}
          </span>
        )}
      </div>

      {/* Feedback textarea */}
      <textarea
        value={feedback}
        onChange={(e) => {
          setFeedback(e.target.value);
          setSubmitted(false);
        }}
        placeholder="分享您的想法或建议（可选）..."
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        rows={2}
      />

      {/* Submit */}
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting || submitted}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitted ? (
            <>
              <Check className="w-3.5 h-3.5" />
              已提交
            </>
          ) : submitting ? (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-foreground" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              提交反馈
            </>
          )}
        </button>
      </div>
    </div>
  );
}
