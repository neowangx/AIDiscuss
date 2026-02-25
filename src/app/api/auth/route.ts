import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, setSessionCookie, clearSessionCookie } from '@/lib/auth/session';

// GET: 获取当前用户
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: '获取用户信息失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// POST: 登录/注册
export async function POST(request: Request) {
  try {
    const { name, accessCode } = await request.json();

    if (!name || !accessCode) {
      return NextResponse.json(
        { error: '请输入名称和访问码' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '名称不能为空' },
        { status: 400 }
      );
    }

    if (typeof accessCode !== 'string' || accessCode.trim().length < 4) {
      return NextResponse.json(
        { error: '访问码至少4个字符' },
        { status: 400 }
      );
    }

    // Check if accessCode already exists
    const existingUser = await prisma.user.findUnique({
      where: { accessCode: accessCode.trim() },
    });

    if (existingUser) {
      // Verify name matches
      if (existingUser.name !== name.trim()) {
        return NextResponse.json(
          { error: '访问码已被使用，请更换访问码' },
          { status: 400 }
        );
      }

      // Login: return existing user
      const userData = {
        id: existingUser.id,
        name: existingUser.name,
        isAdmin: existingUser.isAdmin,
        createdAt: existingUser.createdAt.toISOString(),
      };

      const response = NextResponse.json({ user: userData });
      return setSessionCookie(response, existingUser.id);
    }

    // Register: create new user
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        accessCode: accessCode.trim(),
      },
    });

    const userData = {
      id: newUser.id,
      name: newUser.name,
      isAdmin: newUser.isAdmin,
      createdAt: newUser.createdAt.toISOString(),
    };

    const response = NextResponse.json({ user: userData }, { status: 201 });
    return setSessionCookie(response, newUser.id);
  } catch (error) {
    return NextResponse.json(
      { error: '登录失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE: 登出
export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    return clearSessionCookie(response);
  } catch (error) {
    return NextResponse.json(
      { error: '登出失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
