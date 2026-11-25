/** Identify a particular login session, including a later login to the same account. */
export type ProfileSession = { userId: string; role: string; session: number }

export function isProfileSessionCurrent(
  state: { user: { id: string; role: string } | null; notificationSession: number },
  token: ProfileSession,
): boolean {
  return state.notificationSession === token.session && state.user?.id === token.userId && state.user.role === token.role
}
