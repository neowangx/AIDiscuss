'use client';

import { FrameworkDefinition } from '@/types';
import { Sparkles } from 'lucide-react';

interface FrameworkSelectorProps {
  frameworks: FrameworkDefinition[];
  selected: string;
  recommended: string;
  recommendReason: string;
  onSelect: (name: string) => void;
}

const categoryColors: Record<string, string> = {
  '综合分析': '#6366f1',
  '风险评估': '#ef4444',
  '战略规划': '#3b82f6',
  '根因分析': '#f59e0b',
  '创意创新': '#ec4899',
  '压力测试': '#dc2626',
  '共识构建': '#10b981',
  '决策质量': '#8b5cf6',
  '用户导向': '#06b6d4',
  '突破创新': '#f97316',
};

export function FrameworkSelector({
  frameworks,
  selected,
  recommended,
  recommendReason,
  onSelect,
}: FrameworkSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">思维框架</h3>
      <div className="grid grid-cols-2 gap-2">
        {frameworks.map((fw) => {
          const isSelected = fw.name === selected;
          const isRecommended = fw.name === recommended;
          const color = categoryColors[fw.category] || '#6366f1';

          return (
            <button
              key={fw.name}
              onClick={() => onSelect(fw.name)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{fw.displayName}</span>
                    {isRecommended && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        推荐
                      </span>
                    )}
                  </div>
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded mt-1"
                    style={{ backgroundColor: color + '15', color }}
                  >
                    {fw.category}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{fw.phaseCount}阶段</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{fw.description}</p>
              {isRecommended && isSelected && (
                <p className="text-xs text-primary mt-1">{recommendReason}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
