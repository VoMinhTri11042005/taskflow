import type { Notification } from '@/types'

/**
 * These are direct, actionable requests sent by a Leader. They stay visually
 * prominent until the Member reads them, without treating every update as an
 * alert that competes for attention.
 */
const importantNotificationTypes = new Set<Notification['type']>([
  'poll_created',
  'leader_comment',
  'task_assigned',
])

export function isImportantNotificationType(type: string): boolean {
  return importantNotificationTypes.has(type as Notification['type'])
}

export function isUnreadImportantNotification(
  notification: Pick<Notification, 'type' | 'read'>
): boolean {
  return !notification.read && isImportantNotificationType(notification.type)
}
