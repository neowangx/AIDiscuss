import { NextResponse } from 'next/server';
import { getAllFrameworks } from '@/lib/frameworks';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // Try to get from database first
    let frameworks = await prisma.framework.findMany({
      orderBy: { name: 'asc' },
    });

    // If no frameworks in DB, seed them
    if (frameworks.length === 0) {
      const definitions = getAllFrameworks();
      for (const def of definitions) {
        await prisma.framework.create({
          data: {
            name: def.name,
            displayName: def.displayName,
            description: def.description,
            category: def.category,
            phases: JSON.stringify(def.phases),
            triggers: JSON.stringify(def.triggers),
            phaseCount: def.phaseCount,
          },
        });
      }
      frameworks = await prisma.framework.findMany({
        orderBy: { name: 'asc' },
      });
    }

    const result = frameworks.map(f => ({
      ...f,
      phases: JSON.parse(f.phases),
      triggers: JSON.parse(f.triggers),
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: '获取框架失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
