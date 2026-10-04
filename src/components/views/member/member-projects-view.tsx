'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock3, FolderKanban, RefreshCw, Users } from 'lucide-react';
import { readApiJson } from '@/lib/client-api';
import type { Project, Task } from '@/types';

const statusLabels: Record<string, { label: string; color: string }> = {
  todo: { label: 'Cần làm', color: 'text-slate-600' },
  in_progress: { label: 'Đang làm', color: 'text-amber-600' },
  review: { label: 'Xem xét', color: 'text-violet-600' },
  done: { label: 'Hoàn thành', color: 'text-emerald-600' },
};

type ProjectMembershipRequest = {
  id: string;
  status: 'pending' | 'rejected';
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    status: string;
    leaderName: string | null;
  };
};

export function MemberProjectsView() {
  const { tasks, setTasks, projects, setProjects, setCurrentView, setSelectedProjectId } = useAppStore();
  const [membershipRequests, setMembershipRequests] = useState<ProjectMembershipRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedMembershipRequests = useRef(false);

  const loadProjectData = useCallback(async () => {
    try {
      const [tasksResponse, projectsResponse] = await Promise.all([
        fetch('/api/tasks', { cache: 'no-store' }),
        fetch('/api/projects', { cache: 'no-store' }),
      ]);
      const [nextTasks, nextProjects] = await Promise.all([
        readApiJson<Task[]>(tasksResponse, 'Không thể tải danh sách công việc'),
        readApiJson<Project[]>(projectsResponse, 'Không thể tải danh sách dự án'),
      ]);
      setTasks(nextTasks);
      setProjects(nextProjects);
    } catch {
      // The global workspace loader already reports authentication problems.
    }
  }, [setProjects, setTasks]);

  const loadMembershipRequests = useCallback(async () => {
    if (!hasLoadedMembershipRequests.current) setLoadingRequests(true);
    try {
      const response = await fetch('/api/project-memberships', { cache: 'no-store' });
      const data = await readApiJson<ProjectMembershipRequest[]>(
        response,
        'Không thể tải trạng thái tham gia dự án'
      );
      setMembershipRequests(Array.isArray(data) ? data : []);
    } catch {
      setMembershipRequests([]);
    } finally {
      hasLoadedMembershipRequests.current = true;
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      void loadProjectData();
      void loadMembershipRequests();
    };

    refresh();
    const intervalId = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, [loadMembershipRequests, loadProjectData]);

  async function refreshProjectStatus() {
    setRefreshing(true);
    try {
      await Promise.all([loadProjectData(), loadMembershipRequests()]);
    } finally {
      setRefreshing(false);
    }
  }

  const activeProjects = projects.filter((p) => p.status === 'active');

  function getProjectStats(projectId: string) {
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    const todo = projectTasks.filter((t) => t.status === 'todo').length;
    const inProgress = projectTasks.filter((t) => t.status === 'in_progress').length;
    const review = projectTasks.filter((t) => t.status === 'review').length;
    const done = projectTasks.filter((t) => t.status === 'done').length;
    const total = projectTasks.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, inProgress, review, done, total, completionRate };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dự án nhóm</h1>
          <p className="text-muted-foreground">Các dự án bạn đã được Leader duyệt tham gia</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshProjectStatus()} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Làm mới trạng thái
        </Button>
      </div>

      {!loadingRequests && membershipRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Trạng thái yêu cầu tham gia</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dự án sẽ xuất hiện trong danh sách ngay khi Leader duyệt; nếu bị từ chối, hãy liên hệ Leader để được hỗ trợ.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {membershipRequests.map((request) => {
                const waitingForApproval = request.status === 'pending';
                return (
                  <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/20">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: request.project.color }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{request.project.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {request.project.leaderName ? `Leader: ${request.project.leaderName} · ` : ''}
                          Gửi ngày {new Date(request.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={waitingForApproval ? 'outline' : 'destructive'} className="w-fit shrink-0">
                      {waitingForApproval ? 'Đang chờ duyệt' : 'Chưa được duyệt'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects grid */}
      {activeProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Chưa có dự án nào</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Dự án sẽ xuất hiện ở đây sau khi Leader duyệt bạn vào dự án
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeProjects.map((project) => {
            const stats = getProjectStats(project.id);
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Color bar */}
                  <div
                    className="h-1.5 w-full rounded-full mb-4"
                    style={{ backgroundColor: project.color }}
                  />

                  {/* Project name */}
                  <h3 className="text-base font-semibold mb-1 truncate">{project.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {project.description || 'Không có mô tả'}
                  </p>

                  {/* Progress */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tiến độ</span>
                      <span className="font-medium">{stats.completionRate}%</span>
                    </div>
                    <Progress value={stats.completionRate} className="h-2" />
                  </div>

                  {/* Task counts per status */}
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusLabels).map(([key, config]) => {
                      const count = key === 'todo'
                        ? stats.todo
                        : key === 'in_progress'
                          ? stats.inProgress
                          : key === 'review'
                            ? stats.review
                            : stats.done;
                      return (
                        <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>

                  {/* Personal task total */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Công việc của bạn</span>
                    <span className="font-semibold">{stats.total} việc</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setCurrentView('my-tasks');
                      }}
                    >
                      Xem việc của tôi
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setCurrentView('team');
                      }}
                    >
                      <Users className="mr-1.5 h-4 w-4" />
                      Nhóm & tiến độ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
