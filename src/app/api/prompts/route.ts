import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 默认模板种子数据
const DEFAULT_TEMPLATES = [
  {
    key: 'role_system',
    name: '角色系统提示词',
    description: '角色发言时的系统提示词模板。可用变量：{{name}}, {{humanName}}, {{title}}, {{expertise}}, {{personality}}, {{speakingStyle}}, {{principles}}, {{backgroundStory}}, {{actionStyle}}',
    content: `你是一位参与圆桌讨论的专家角色。

## 你的身份
- **名字**: {{displayName}}
- **头衔**: {{title}}
- **专业领域**: {{expertise}}
- **性格特点**: {{personality}}
- **发言风格**: {{speakingStyle}}
- **核心原则**: {{principles}}

## 行为准则
1. 始终保持你的角色身份，用你独特的视角和风格发言
2. 认真听取其他参与者的观点，积极回应和交锋
3. 当你同意别人的观点时说明理由，不同意时提出有建设性的反对意见
4. 发言简洁有力，避免空泛的套话，给出具体的观点和建议
5. 用中文发言，语言自然流畅

## 发言格式
- 直接发表观点，不要以"作为XX"开头
- 可以引用和回应其他角色的发言
- 适当用 **加粗** 强调关键观点
- 保持发言在 200-500 字之间`,
  },
  {
    key: 'phase_instruction',
    name: '阶段指令模板',
    description: '讨论阶段的指令模板。可用变量：{{displayName}}, {{description}}, {{instruction}}',
    content: `

## 当前讨论阶段
**{{displayName}}**: {{description}}

**本阶段指令**: {{instruction}}

请严格围绕本阶段主题发言。`,
  },
  {
    key: 'discussion_context',
    name: '讨论上下文模板',
    description: '构建讨论上下文时的模板。可用变量：{{topic}}, {{previousMessages}}, {{userInstruction}}',
    content: `## 讨论主题
{{topic}}

{{previousMessages}}

{{userInstruction}}

请基于以上背景，发表你的观点。`,
  },
];

async function ensureSeedData() {
  const count = await prisma.systemPromptTemplate.count();
  if (count === 0) {
    for (const tmpl of DEFAULT_TEMPLATES) {
      await prisma.systemPromptTemplate.create({
        data: {
          ...tmpl,
          isDefault: true,
        },
      });
    }
  }
}

export async function GET() {
  try {
    await ensureSeedData();

    const templates = await prisma.systemPromptTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { error: '获取模板失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, name, content, description } = body;

    if (!key || !name || !content) {
      return NextResponse.json(
        { error: '缺少必填字段: key, name, content' },
        { status: 400 }
      );
    }

    const template = await prisma.systemPromptTemplate.upsert({
      where: { key },
      update: {
        name,
        content,
        description: description || null,
        isDefault: false,
      },
      create: {
        key,
        name,
        content,
        description: description || null,
        isDefault: false,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: '保存模板失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
