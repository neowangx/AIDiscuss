'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseThinkTags, isInThinkBlock } from '@/lib/utils/think-parser';
import { ThinkBlock } from './think-block';

interface MessageBubbleProps {
  roleName: string;
  humanName?: string;
  roleTitle?: string;
  content: string;
  color: string;
  isStreaming?: boolean;
  isUser?: boolean;
  phaseName?: string | null;
}

export function MessageBubble({
  roleName,
  humanName,
  roleTitle,
  content,
  color,
  isStreaming,
  isUser,
  phaseName,
}: MessageBubbleProps) {
  const displayName = humanName || roleName;

  if (isUser) {
    return (
      <div className="flex justify-end mb-3 md:mb-4">
        <div className="max-w-[85%] md:max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-3 md:px-4 py-2 md:py-3">
          <div className="text-xs opacity-80 mb-1">主持人</div>
          <div className="text-sm prose-message">{content}</div>
        </div>
      </div>
    );
  }

  // Parse think tags for non-streaming or completed streaming
  const segments = parseThinkTags(content);
  const streaming = isStreaming && !content;
  const inThinkBlock = isStreaming && isInThinkBlock(content);

  return (
    <div className="flex gap-2 md:gap-3 mb-3 md:mb-4">
      {/* Avatar */}
      <div
        className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-medium shrink-0 mt-1"
        style={{ backgroundColor: color }}
      >
        {displayName[0]}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-medium text-sm" style={{ color }}>{displayName}</span>
          {humanName && humanName !== roleName && (
            <span className="text-xs text-muted-foreground">{roleName}</span>
          )}
          {roleTitle && (
            <span className="text-xs text-muted-foreground">{roleTitle}</span>
          )}
          {phaseName && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {phaseName}
            </span>
          )}
        </div>
        <div
          className="bg-card border border-border rounded-2xl rounded-tl-md px-3 md:px-4 py-2 md:py-3"
          style={{ borderTopColor: color + '40' }}
        >
          <div className={`text-sm prose-message ${isStreaming ? 'streaming-cursor' : ''}`}>
            {streaming ? (
              <span className="text-muted-foreground">思考中...</span>
            ) : isStreaming ? (
              // During streaming, show raw content with think indicator
              <>
                {inThinkBlock && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <span className="think-pulse">💭 思考中...</span>
                  </div>
                )}
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '')}
                </ReactMarkdown>
              </>
            ) : (
              // After streaming complete, show parsed segments
              segments.map((seg, i) =>
                seg.type === 'think' ? (
                  <ThinkBlock key={i} content={seg.text} />
                ) : (
                  <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{seg.text}</ReactMarkdown>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
