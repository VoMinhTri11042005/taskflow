function validHttpOrigin(value: string | undefined) {
  if (!value) return null

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

/**
 * Builds a URL that can be shared with another device. NEXT_PUBLIC_APP_URL is
 * intentionally preferred because a Leader may be browsing the server through
 * localhost, which is not reachable from another machine.
 */
export function createPublicAppUrl(path: string, browserOrigin: string) {
  const origin = validHttpOrigin(process.env.NEXT_PUBLIC_APP_URL) || validHttpOrigin(browserOrigin)
  if (!origin) return path

  return new URL(path, origin).toString()
}

/** True when a shared invite would point to the recipient's own localhost. */
export function needsPublicAppUrlConfiguration(browserOrigin: string) {
  if (validHttpOrigin(process.env.NEXT_PUBLIC_APP_URL)) return false

  try {
    const hostname = new URL(browserOrigin).hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}
