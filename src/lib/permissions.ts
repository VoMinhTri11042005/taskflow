import { db } from '@/lib/db';
import type { SessionData } from '@/lib/auth';

export function isAdmin(session: SessionData) {
  return session.role === 'admin';
}

export function isLeader(session: SessionData) {
  return session.role === 'leader';
}

export function isManager(session: SessionData) {
  return isAdmin(session) || isLeader(session);
}

export async function canManageProject(session: SessionData, projectId: string) {
  if (isAdmin(session)) return true;
  if (!isLeader(session)) return false;

  const project = await db.project.findFirst({ where: { id: projectId, leaderId: session.id }, select: { id: true } });
  return Boolean(project);
}

export async function canAccessProject(session: SessionData, projectId: string) {
  if (await canManageProject(session, projectId)) return true;
  if (!session.teamMemberId) return false;

  const task = await db.task.findFirst({
    where: { projectId, assigneeId: session.teamMemberId },
    select: { id: true },
  });
  return Boolean(task);
}

export async function canManageTask(session: SessionData, taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  return task ? canManageProject(session, task.projectId) : false;
}

export async function canAccessTask(session: SessionData, taskId: string) {
  if (await canManageTask(session, taskId)) return true;
  if (!session.teamMemberId) return false;

  const task = await db.task.findFirst({ where: { id: taskId, assigneeId: session.teamMemberId }, select: { id: true } });
  return Boolean(task);
}
