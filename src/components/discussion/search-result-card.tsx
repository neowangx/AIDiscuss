'use client';

import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { WebSearchResult } from '@/types';

interface SearchResultCardProps {
  results: WebSearchResult[];
}

export function SearchResultCard({ results }: SearchResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (results.length === 0) return null;

  return (
    <div className="mx-4 my-3 bg-blue-500/5 border border-blue-500/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-blue-500/10 transition-colors"
      >
        <Globe className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-blue-600 font-medium">联网搜索结果 ({results.length})</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground ml-auto" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {results.map((r, i) => (
            <div key={i} className="bg-background rounded-lg p-3">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
              >
                {r.title}
                <ExternalLink className="w-3 h-3" />
              </a>
              {r.snippet && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.snippet}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
