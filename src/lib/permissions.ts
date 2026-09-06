import { db } from '@/lib/db';
import type { SessionData } from '@/lib/auth';

export function isAdmin(session: SessionData) {
  return session.role === 'admin';
}

export function isLeader(session: SessionData) {
  return session.role === 'leader';
}

export function isManager(session: SessionData) {
  // Workspaces, projects, tasks, shared links, polls and time tracking belong
  // to Leaders. Admin is deliberately limited to account administration.
  return isLeader(session);
}

export async function canManageProject(session: SessionData, projectId: string) {
  if (!isLeader(session)) return false;

  const project = await db.project.findFirst({ where: { id: projectId, leaderId: session.id }, select: { id: true } });
  return Boolean(project);
}

export async function canAccessProject(session: SessionData, projectId: string) {
  if (isAdmin(session)) return false;
  if (await canManageProject(session, projectId)) return true;
  // A project membership represents Member access only. This explicit role
  // check prevents a former Member who was promoted to Leader from retaining
  // access through an old membership row.
  if (session.role !== 'member') return false;

  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.id } },
    select: {
      status: true,
      user: { select: { role: true, status: true, leaderId: true } },
      project: { select: { leaderId: true } },
    },
  });
  return Boolean(
    membership &&
    membership.status === 'approved' &&
    membership.user.role === 'member' &&
    membership.user.status === 'approved' &&
    membership.user.leaderId &&
    membership.user.leaderId === membership.project.leaderId
  );
}

export async function canManageTask(session: SessionData, taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  return task ? canManageProject(session, task.projectId) : false;
}

/** Verify that an assignee belongs to the exact project, not merely the Leader's roster. */
export async function canAssignProjectMember(session: SessionData, projectId: string, teamMemberId: string) {
  if (!isLeader(session)) return false;

  const assignee = await db.teamMember.findUnique({
    where: { id: teamMemberId },
    select: { email: true, role: true },
  });
  if (!assignee || assignee.role !== 'member') return false;

  const user = await db.user.findFirst({
    where: {
      email: assignee.email,
      role: 'member',
      status: 'approved',
      leaderId: session.id,
    },
    select: { id: true },
  });
  if (!user) return false;

  const membership = await db.projectMember.findFirst({
    where: { projectId, userId: user.id, status: 'approved' },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function canAccessTask(session: SessionData, taskId: string) {
  if (isAdmin(session)) return false;
  if (await canManageTask(session, taskId)) return true;
  if (session.role !== 'member' || !session.teamMemberId) return false;

  const task = await db.task.findFirst({
    where: {
      id: taskId,
      assigneeId: session.teamMemberId,
    },
    select: { projectId: true },
  });
  return task ? canAccessProject(session, task.projectId) : false;
}
