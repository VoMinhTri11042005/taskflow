'use client'

// Cookies are shared by every normal tab in the same browser profile. This
// marker contains no account data; other tabs use it only as a signal to ask
// the server which signed session is now valid.
export const AUTH_SESSION_CHANGE_KEY = 'taskflow:auth-session-change'

export function notifyAuthSessionChange() {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(AUTH_SESSION_CHANGE_KEY, `${Date.now()}-${Math.random()}`)
  } catch {
    // Private browsing or storage restrictions must not block authentication.
  }
}
