'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FolderKanban } from 'lucide-react';
import { readApiJson } from '@/lib/client-api';
import type { Project, Task } from '@/types';

const statusLabels: Record<string, { label: string; color: string }> = {
  todo: { label: 'Cần làm', color: 'text-slate-600' },
  in_progress: { label: 'Đang làm', color: 'text-amber-600' },
  review: { label: 'Xem xét', color: 'text-violet-600' },
  done: { label: 'Hoàn thành', color: 'text-emerald-600' },
};

export function MemberProjectsView() {
  const { tasks, setTasks, projects, setProjects, setCurrentView, setSelectedProjectId } = useAppStore();

  useEffect(() => {
    fetch('/api/tasks')
      .then((response) => readApiJson<Task[]>(response, 'Không thể tải danh sách công việc'))
      .then(setTasks)
      .catch(() => {});
    fetch('/api/projects')
      .then((response) => readApiJson<Project[]>(response, 'Không thể tải danh sách dự án'))
      .then(setProjects)
      .catch(() => {});
  }, [setTasks, setProjects]);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dự án nhóm</h1>
        <p className="text-muted-foreground">Các dự án bạn đã được Leader duyệt tham gia</p>
      </div>

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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setCurrentView('my-tasks');
                    }}
                  >
                    Xem việc của tôi
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
