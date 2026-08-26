'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { DashboardStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  ArrowRight,
  CalendarClock,
  KanbanSquare,
  FolderKanban,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  todo: { label: 'Cần làm', color: 'bg-slate-500', icon: ListTodo },
  in_progress: { label: 'Đang làm', color: 'bg-amber-500', icon: Clock },
  review: { label: 'Xem xét', color: 'bg-violet-500', icon: ArrowRight },
  done: { label: 'Hoàn thành', color: 'bg-emerald-500', icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Thấp', variant: 'secondary' },
  medium: { label: 'Trung bình', variant: 'default' },
  high: { label: 'Cao', variant: 'destructive' },
  urgent: { label: 'Khẩn cấp', variant: 'destructive' },
};

export function DashboardView() {
  const { stats, setStats, setCurrentView, members } = useAppStore();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error('Failed to fetch stats', e);
      }
    }
    fetchStats();
  }, [setStats]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Đang tải tổng quan...</div>
      </div>
    );
  }

  const doneCount = stats.tasksByStatus['done'] || 0;
  const totalForProgress = stats.totalTasks || 1;
  const completionRate = Math.round((doneCount / totalForProgress) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-muted-foreground">Theo dõi tiến độ công việc của nhóm</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng việc</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">trong tất cả dự án</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Đang làm</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasksByStatus['in_progress'] || 0}</div>
            <p className="text-xs text-muted-foreground">đang thực hiện</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doneCount}</div>
            <p className="text-xs text-muted-foreground">{completionRate}% tổng công việc</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sắp đến hạn</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingDeadlines.length}</div>
            <p className="text-xs text-muted-foreground">trong 7 ngày tới</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress & Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tiến độ tổng thể</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Hoàn thành</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(statusConfig).map(([key, config]) => {
                const Icon = config.icon;
                const count = stats.tasksByStatus[key] || 0;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-lg border p-3"
                  >
                    <div className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Priority breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Theo mức ưu tiên</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['urgent', 'high', 'medium', 'low'] as const).map((p) => {
                const count = stats.tasksByPriority[p] || 0;
                const pct = totalForProgress > 0 ? Math.round((count / totalForProgress) * 100) : 0;
                const colorMap: Record<string, string> = {
                  urgent: 'bg-red-500',
                  high: 'bg-orange-500',
                  medium: 'bg-amber-500',
                  low: 'bg-slate-400',
                };
                return (
                  <div key={p} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{priorityConfig[p].label}</span>
                      <span className="text-muted-foreground">{count} việc ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className={cn('h-2 rounded-full transition-all', colorMap[p])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming deadlines & Member workload */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Sắp đến hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Không có việc sắp đến hạn
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.upcomingDeadlines.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border p-3 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.project?.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <Badge variant={priorityConfig[task.priority]?.variant || 'default'} className="text-xs mb-1">
                        {priorityConfig[task.priority]?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Khối lượng công việc</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.memberWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Chưa có dữ liệu
              </p>
            ) : (
              <div className="space-y-3">
                {stats.memberWorkload
                  .sort((a, b) => b.count - a.count)
                  .map((m) => {
                    const pct = totalForProgress > 0 ? Math.round((m.count / totalForProgress) * 100) : 0;
                    return (
                      <div key={m.memberId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: m.memberColor }}
                            />
                            <span className="font-medium">{m.memberName}</span>
                          </div>
                          <span className="text-muted-foreground">{m.count} việc</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: m.memberColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setCurrentView('board')}>
              <KanbanSquare className="mr-2 h-4 w-4" />
              Xem bảng công việc
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('projects')}>
              <FolderKanban className="mr-2 h-4 w-4" />
              Quản lý dự án
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('members')}>
              <Users className="mr-2 h-4 w-4" />
              Quản lý thành viên
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
