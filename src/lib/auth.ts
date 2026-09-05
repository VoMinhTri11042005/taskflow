import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionData {
  id: string;
  email: string;
  name: string;
  role: string;
  color: string;
  avatar?: string | null;
  teamMemberId?: string | null;
}

function getSessionSecret() {
  // SESSION_SECRET is preferred. DATABASE_URL is a private server-only fallback
  // so existing deployments remain secure until a dedicated secret is added.
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || 'taskflow-development-session-secret';
}

function sign(value: string) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function createSessionValue(session: SessionData) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readSessionValue(value: string): SessionData | null {
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Get session from request cookies (works in Route Handlers)
 * Uses request.cookies directly to avoid next/headers issues with PUT/DELETE
 */
export function getSession(request: NextRequest): SessionData | null {
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie?.value) return null;
  return readSessionValue(sessionCookie.value);
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
