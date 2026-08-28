'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { DashboardStats, MemberWorkHours } from '@/types';
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
  Timer,
  TrendingUp,
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

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} phút`;
  return `${h} giờ ${m} phút`;
}

export function DashboardView() {
  const { stats, setStats, setCurrentView, members } = useAppStore();
  const [workHours, setWorkHours] = useState<MemberWorkHours[]>([]);
  const [loadingWorkHours, setLoadingWorkHours] = useState(true);

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

  useEffect(() => {
    async function fetchWorkHours() {
      try {
        const res = await fetch('/api/time-logs?mode=admin-summary');
        const data = await res.json();
        if (Array.isArray(data)) {
          setWorkHours(data);
        }
      } catch (e) {
        console.error('Failed to fetch work hours', e);
      } finally {
        setLoadingWorkHours(false);
      }
    }
    fetchWorkHours();
  }, []);

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

      {/* Working hours ranking - sorted from highest to lowest */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            Thời gian làm việc của thành viên
            <Badge variant="secondary" className="ml-auto text-xs font-normal">Sắp xếp theo giờ giảm dần</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingWorkHours ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Đang tải...</div>
            </div>
          ) : workHours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Chưa có dữ liệu chấm công
            </p>
          ) : (
            <div className="space-y-0">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                <div className="col-span-1">#</div>
                <div className="col-span-4 sm:col-span-3">Thành viên</div>
                <div className="col-span-3 sm:col-span-2 text-right">Hôm nay</div>
                <div className="col-span-2 text-right hidden sm:block">Tuần này</div>
                <div className="col-span-4 sm:col-span-2 text-right">Trạng thái</div>
                <div className="col-span-2 text-right hidden lg:block">Tổng</div>
              </div>

              {/* Member rows - already sorted by todayMinutes desc from API */}
              {workHours.map((m, index) => {
                const maxTodayMinutes = workHours[0]?.todayMinutes || 1;
                const barWidth = Math.max(4, (m.todayMinutes / maxTodayMinutes) * 100);
                const isTop = index === 0 && m.todayMinutes > 0;

                return (
                  <div
                    key={m.userId}
                    className={cn(
                      'grid grid-cols-12 gap-2 px-3 py-3 items-center border-b last:border-0 transition-colors hover:bg-muted/50',
                      isTop && 'bg-amber-50/50'
                    )}
                  >
                    {/* Rank */}
                    <div className="col-span-1">
                      <span className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                        index === 0 && m.todayMinutes > 0 ? 'bg-amber-400 text-white' :
                        index === 1 && m.todayMinutes > 0 ? 'bg-slate-300 text-white' :
                        index === 2 && m.todayMinutes > 0 ? 'bg-amber-700 text-white' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Member info */}
                    <div className="col-span-4 sm:col-span-3 flex items-center gap-2 min-w-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: m.userColor }}
                      >
                        {m.userName.split(' ').map(n => n.charAt(0).toUpperCase()).slice(-2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.userName}</p>
                        <p className="text-[10px] text-muted-foreground truncate sm:hidden">{formatMinutes(m.weekMinutes)}</p>
                      </div>
                    </div>

                    {/* Today's hours with progress bar */}
                    <div className="col-span-3 sm:col-span-2">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn(
                          'text-sm font-bold',
                          isTop ? 'text-amber-700' : 'text-foreground'
                        )}>
                          {formatMinutes(m.todayMinutes)}
                        </span>
                        <div className="w-full h-1.5 rounded-full bg-secondary">
                          <div
                            className={cn(
                              'h-1.5 rounded-full transition-all',
                              isTop ? 'bg-amber-500' : 'bg-primary'
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Week hours (desktop) */}
                    <div className="col-span-2 text-right hidden sm:block">
                      <span className="text-sm text-muted-foreground">{formatMinutes(m.weekMinutes)}</span>
                    </div>

                    {/* Status */}
                    <div className="col-span-4 sm:col-span-2 flex justify-end">
                      {m.isCurrentlyWorking ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đang làm việc
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Nghỉ
                        </Badge>
                      )}
                    </div>

                    {/* Total (desktop) */}
                    <div className="col-span-2 text-right hidden lg:block">
                      <span className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatMinutes(m.totalMinutes)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
