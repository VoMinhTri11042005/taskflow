'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CalendarDays, CheckCircle2, ClipboardList, FolderKanban, Users } from 'lucide-react';
import { readApiJson } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { getProjectDisplayName } from '@/lib/project-name';
import type { Project, Task } from '@/types';

type ProjectTask = Pick<Task, 'id' | 'title' | 'status' | 'priority'> & {
  dueDate: string | null;
};

type TaskSummary = {
  total: number;
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  completionRate: number;
};

type ProjectTeamMember = {
  userId: string;
  teamMemberId: string | null;
  name: string;
  color: string;
  avatar: string | null;
  isCurrentUser: boolean;
  taskSummary: TaskSummary;
  assignedTasks: ProjectTask[];
};

type ProjectTeamOverview = {
  project: Pick<Project, 'id' | 'name' | 'color'>;
  leader: { id: string; name: string; color: string; avatar: string | null } | null;
  members: ProjectTeamMember[];
};

const statusConfig: Record<Task['status'], { label: string; className: string }> = {
  todo: { label: 'Cần làm', className: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'Đang làm', className: 'bg-amber-100 text-amber-700' },
  review: { label: 'Xem xét', className: 'bg-violet-100 text-violet-700' },
  done: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-700' },
};

function formatDueDate(value: string | null) {
  if (!value) return 'Chưa đặt hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa đặt hạn';
  return `Hạn ${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date)}`;
}

export function MemberTeamView() {
  const { projects, setProjects, selectedProjectId, setSelectedProjectId } = useAppStore();
  const [projectId, setProjectId] = useState('');
  const [overview, setOverview] = useState<ProjectTeamOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' })
      .then((response) => readApiJson<Project[]>(response, 'Không thể tải danh sách dự án'))
      .then(setProjects)
      .catch(() => {});
  }, [setProjects]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === 'active'),
    [projects]
  );

  useEffect(() => {
    if (activeProjects.length === 0) {
      if (projectId) setProjectId('');
      return;
    }

    const preferredId = selectedProjectId && activeProjects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : activeProjects.some((project) => project.id === projectId)
        ? projectId
        : activeProjects[0].id;

    if (preferredId !== projectId) setProjectId(preferredId);
  }, [activeProjects, projectId, selectedProjectId]);

  useEffect(() => {
    if (!projectId) {
      setOverview(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setOverview(null);

    fetch(`/api/projects/${encodeURIComponent(projectId)}/team-progress`, { cache: 'no-store' })
      .then((response) => readApiJson<ProjectTeamOverview>(response, 'Không thể tải nhóm dự án'))
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải nhóm dự án');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const summary = useMemo(() => {
    const members = overview?.members || [];
    const total = members.reduce((sum, member) => sum + member.taskSummary.total, 0);
    const done = members.reduce((sum, member) => sum + member.taskSummary.done, 0);
    return {
      memberCount: members.length,
      total,
      done,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [overview]);

  function handleProjectChange(id: string) {
    setProjectId(id);
    setSelectedProjectId(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhóm dự án</h1>
          <p className="text-muted-foreground">
            Xem thành viên cùng dự án, việc Leader giao và tiến độ thực hiện.
          </p>
        </div>
        {activeProjects.length > 0 && (
          <div className="w-full sm:w-72">
            <span className="mb-1.5 block text-sm font-medium">Dự án đang xem</span>
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn dự án" />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {getProjectDisplayName(project.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {activeProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">Chưa có dự án nào</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Nhóm sẽ xuất hiện tại đây sau khi Leader duyệt bạn vào một dự án.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index}>
              <CardContent className="space-y-4 p-5">
                <div className="h-12 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-2 animate-pulse rounded bg-muted" />
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium text-destructive">Không thể tải nhóm dự án</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : overview ? (
        <>
          <Card className="overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: overview.project.color }} />
            <CardContent className="p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{getProjectDisplayName(overview.project.name)}</h2>
                  <p className="text-sm text-muted-foreground">
                    {overview.leader ? `Leader quản lý: ${overview.leader.name}` : 'Dự án nhóm'}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 sm:mt-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold">{summary.completionRate}% hoàn thành</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card><CardContent className="p-4"><Users className="mb-2 h-5 w-5 text-sky-600" /><p className="text-2xl font-bold">{summary.memberCount}</p><p className="text-xs text-muted-foreground">Thành viên</p></CardContent></Card>
            <Card><CardContent className="p-4"><ClipboardList className="mb-2 h-5 w-5 text-violet-600" /><p className="text-2xl font-bold">{summary.total}</p><p className="text-xs text-muted-foreground">Việc được giao</p></CardContent></Card>
            <Card><CardContent className="p-4"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-2xl font-bold">{summary.done}</p><p className="text-xs text-muted-foreground">Đã hoàn thành</p></CardContent></Card>
            <Card><CardContent className="p-4"><FolderKanban className="mb-2 h-5 w-5 text-amber-600" /><p className="text-2xl font-bold">{summary.completionRate}%</p><p className="text-xs text-muted-foreground">Tiến độ nhóm</p></CardContent></Card>
          </div>

          {overview.members.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium">Chưa có thành viên nào được duyệt vào dự án</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {overview.members.map((member) => (
                <Card key={member.userId} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: member.color }}
                        aria-hidden="true"
                      >
                        {member.name.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold">{member.name}</h3>
                          {member.isCurrentUser && <Badge variant="secondary" className="h-5">Bạn</Badge>}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {member.taskSummary.total === 0
                            ? 'Leader chưa giao việc'
                            : `${member.taskSummary.done}/${member.taskSummary.total} việc đã hoàn thành`}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-emerald-700">{member.taskSummary.completionRate}%</span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Tiến độ công việc</span>
                        <span>{member.taskSummary.completionRate}%</span>
                      </div>
                      <Progress value={member.taskSummary.completionRate} className="h-2" />
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      {(Object.keys(statusConfig) as Task['status'][]).map((status) => (
                        <div key={status} className="rounded-md border px-1 py-2">
                          <p className={cn('text-sm font-semibold', statusConfig[status].className.split(' ')[1])}>{member.taskSummary[status]}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{statusConfig[status].label}</p>
                        </div>
                      ))}
                    </div>

                    <Accordion type="single" collapsible className="mt-3">
                      <AccordionItem value="assigned-tasks">
                        <AccordionTrigger className="py-3 no-underline hover:no-underline">
                          Công việc Leader đã giao ({member.assignedTasks.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          {member.assignedTasks.length === 0 ? (
                            <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">Chưa có công việc được giao.</p>
                          ) : (
                            <div className="space-y-2">
                              {member.assignedTasks.map((task) => {
                                const status = statusConfig[task.status] || statusConfig.todo;
                                return (
                                  <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">{task.title}</p>
                                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {formatDueDate(task.dueDate)}
                                      </p>
                                    </div>
                                    <Badge className={cn('shrink-0', status.className)}>{status.label}</Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
