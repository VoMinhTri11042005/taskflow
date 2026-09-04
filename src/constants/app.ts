export const APP_NAME = 'TaskFlow';
export const APP_DESCRIPTION = 'TaskFlow is a team task management and collaboration app.';

export const DEFAULT_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const DEFAULT_TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
} as const;
