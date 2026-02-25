'use client';

import { useState } from 'react';
import { ChevronRight, Brain } from 'lucide-react';

interface ThinkBlockProps {
  content: string;
  isStreaming?: boolean;
}

export function ThinkBlock({ content, isStreaming }: ThinkBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="think-block my-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
        <Brain className="w-3 h-3" />
        {isStreaming && !expanded ? (
          <span className="think-pulse">思考中...</span>
        ) : (
          <span>{expanded ? '收起思考过程' : '查看思考过程'}</span>
        )}
      </button>
      {expanded && (
        <div className="think-content mt-1.5 pl-5 text-xs text-muted-foreground/80 leading-relaxed border-l-2 border-muted">
          {content}
        </div>
      )}
    </div>
  );
}
