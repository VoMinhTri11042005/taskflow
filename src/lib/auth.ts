import { NextRequest } from 'next/server';

export interface SessionData {
  id: string;
  email: string;
  name: string;
  role: string;
  color: string;
  avatar?: string | null;
  teamMemberId?: string | null;
}

/**
 * Get session from request cookies (works in Route Handlers)
 * Uses request.cookies directly to avoid next/headers issues with PUT/DELETE
 */
export function getSession(request: NextRequest): SessionData | null {
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(sessionCookie.value) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Check if the current user is admin
 */
export function isAdmin(request: NextRequest): boolean {
  const session = getSession(request);
  return session?.role === 'admin';
}

/**
 * Get user ID from session, or null
 */
export function getUserId(request: NextRequest): string | null {
  const session = getSession(request);
  return session?.id || null;
}
