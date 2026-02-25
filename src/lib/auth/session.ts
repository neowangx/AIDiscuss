import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import type { UserData } from '@/types';

const COOKIE_NAME = 'aidiscuss_user';

/**
 * Get current user from session cookie.
 * Returns null if no cookie, or user not found.
 */
export async function getSession(): Promise<UserData | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(COOKIE_NAME)?.value;
    if (!userId) return null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Get userId from request cookie (for use in API routes where we need the raw id).
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Set session cookie with userId.
 */
export function setSessionCookie(response: Response, userId: string): Response {
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
  );
  return response;
}

/**
 * Clear session cookie.
 */
export function clearSessionCookie(response: Response): Response {
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return response;
}
