import prisma from '@/lib/db';

/**
 * 简单的 {{variable}} 模板替换引擎
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
}

/**
 * 从数据库加载指定 key 的模板内容，不存在则返回 null
 */
export async function loadTemplate(key: string): Promise<string | null> {
  try {
    const template = await prisma.systemPromptTemplate.findUnique({
      where: { key },
    });
    return template?.content ?? null;
  } catch (error) {
    console.error(`[TemplateEngine] 加载模板 "${key}" 失败:`, error);
    return null;
  }
}

/**
 * 预加载所有模板，返回 key -> content 的 Map
 */
export async function loadAllTemplates(): Promise<Map<string, string>> {
  try {
    const templates = await prisma.systemPromptTemplate.findMany();
    const map = new Map<string, string>();
    for (const t of templates) {
      map.set(t.key, t.content);
    }
    return map;
  } catch (error) {
    console.error('[TemplateEngine] 预加载模板失败:', error);
    return new Map();
  }
}
