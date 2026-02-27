'use client';

import { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, RotateCcw, ChevronDown, ChevronRight, ShieldAlert } from 'lucide-react';

interface PromptTemplate {
  id: string;
  key: string;
  name: string;
  content: string;
  description?: string | null;
  isDefault: boolean;
  updatedAt?: string;
}

// 各模板可用的变量说明
const TEMPLATE_VARIABLES: Record<string, Array<{ name: string; desc: string }>> = {
  role_system: [
    { name: '{{displayName}}', desc: '角色显示名称（优先使用 humanName）' },
    { name: '{{name}}', desc: '角色代号' },
    { name: '{{humanName}}', desc: '角色真名' },
    { name: '{{title}}', desc: '角色头衔' },
    { name: '{{expertise}}', desc: '专业领域' },
    { name: '{{personality}}', desc: '性格特点' },
    { name: '{{speakingStyle}}', desc: '发言风格' },
    { name: '{{principles}}', desc: '核心原则' },
    { name: '{{backgroundStory}}', desc: '背景故事' },
    { name: '{{actionStyle}}', desc: '标志性动作' },
  ],
  phase_instruction: [
    { name: '{{displayName}}', desc: '阶段显示名称' },
    { name: '{{description}}', desc: '阶段描述' },
    { name: '{{instruction}}', desc: '阶段指令' },
  ],
  discussion_context: [
    { name: '{{topic}}', desc: '讨论主题' },
    { name: '{{previousMessages}}', desc: '之前的讨论记录' },
    { name: '{{userInstruction}}', desc: '主持人指令' },
  ],
};

export default function PromptsSettingsPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showVars, setShowVars] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/prompts');
      if (res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setTemplates(data.templates || []);
      if (data.templates?.length > 0 && !selectedKey) {
        setSelectedKey(data.templates[0].key);
        setEditContent(data.templates[0].content);
      }
    } catch {
      setError('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.key === selectedKey);
  const variables = selectedKey ? TEMPLATE_VARIABLES[selectedKey] || [] : [];

  const handleSelect = (key: string) => {
    const tmpl = templates.find(t => t.key === key);
    if (tmpl) {
      setSelectedKey(key);
      setEditContent(tmpl.content);
      setSaved(false);
      setError('');
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selectedTemplate.key,
          name: selectedTemplate.name,
          content: editContent,
          description: selectedTemplate.description,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }
      const data = await res.json();
      setTemplates(prev =>
        prev.map(t => (t.key === data.template.key ? data.template : t))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedTemplate) return;
    // 重置为默认内容：删除当前自定义模板，重新从 seed 获取
    setSaving(true);
    setError('');
    try {
      // 先删除当前模板，让 seed 重新初始化
      // 简单做法：从 API 获取默认内容（重新请求前删除该条）
      const res = await fetch('/api/prompts/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: selectedTemplate.key }),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(prev =>
          prev.map(t => (t.key === data.template.key ? data.template : t))
        );
        setEditContent(data.template.content);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        throw new Error('重置失败');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <ShieldAlert className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-destructive font-medium">无权访问</p>
          <p className="text-sm text-muted-foreground">只有管理员可以管理 Prompt 模板</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Prompt 模板管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          自定义 AI 角色的系统提示词模板，使用 {'{{变量}}'} 语法插入动态内容
        </p>
      </div>

      <div className="flex gap-6">
        {/* 左侧：模板列表 */}
        <div className="w-64 shrink-0 space-y-2">
          {templates.map(tmpl => (
            <button
              key={tmpl.key}
              onClick={() => handleSelect(tmpl.key)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selectedKey === tmpl.key
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border hover:bg-secondary/50 text-muted-foreground'
              }`}
            >
              <div className="text-sm font-medium">{tmpl.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{tmpl.key}</div>
            </button>
          ))}
        </div>

        {/* 右侧：编辑区 */}
        <div className="flex-1 space-y-4">
          {selectedTemplate ? (
            <>
              {/* 模板信息 */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h2 className="text-lg font-semibold">{selectedTemplate.name}</h2>
                {selectedTemplate.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.description}
                  </p>
                )}
                {!selectedTemplate.isDefault && (
                  <span className="inline-block mt-2 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">
                    已自定义
                  </span>
                )}
              </div>

              {/* 可用变量 */}
              {variables.length > 0 && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setShowVars(!showVars)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors"
                  >
                    {showVars ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    可用变量 ({variables.length})
                  </button>
                  {showVars && (
                    <div className="px-4 pb-3 border-t border-border">
                      <div className="grid grid-cols-1 gap-1 mt-2">
                        {variables.map(v => (
                          <div key={v.name} className="flex items-center gap-2 text-sm">
                            <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                              {v.name}
                            </code>
                            <span className="text-muted-foreground text-xs">{v.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 模板编辑器 */}
              <div className="bg-card rounded-xl border border-border p-4">
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    setSaved(false);
                  }}
                  rows={20}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y leading-relaxed"
                  placeholder="在此编辑模板内容..."
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || editContent === selectedTemplate.content}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4" /> 已保存
                    </>
                  ) : saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> 保存修改
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  disabled={saving || selectedTemplate.isDefault}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border border-border hover:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" /> 重置为默认
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              请选择一个模板进行编辑
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
