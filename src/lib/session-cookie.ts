import type { NextRequest } from 'next/server'

export const SESSION_COOKIE_NAME = 'session'
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function configuredSecureCookieValue() {
  const value = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

/**
 * Secure cookies only work over HTTPS (localhost is a browser exception).
 * Determine the setting from the actual client protocol instead of NODE_ENV,
 * so a trusted HTTP LAN deployment can keep its session while HTTPS remains
 * protected. SESSION_COOKIE_SECURE can override this for unusual proxies.
 */
export function shouldUseSecureSessionCookie(request: NextRequest) {
  const configured = configuredSecureCookieValue()
  if (configured !== null) return configured

  const forwardedProtocol = request.headers.get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase()

  return forwardedProtocol === 'https' || request.nextUrl.protocol === 'https:'
}

export function sessionCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: shouldUseSecureSessionCookie(request),
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  }
}

export function expiredSessionCookieOptions(request: NextRequest) {
  return {
    ...sessionCookieOptions(request),
    maxAge: 0,
    expires: new Date(0),
  }
}
