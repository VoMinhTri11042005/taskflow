'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { DashboardStats, MemberWorkHours } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Activity,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  todo: { label: 'Cần làm', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: ListTodo },
  in_progress: { label: 'Đang làm', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
  review: { label: 'Xem xét', color: 'text-violet-500', bg: 'bg-violet-500/10', icon: ArrowRight },
  done: { label: 'Hoàn thành', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Khẩn cấp', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' },
  high: { label: 'Cao', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500' },
  medium: { label: 'Trung bình', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
  low: { label: 'Thấp', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-400' },
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}p`;
  return `${h}h ${m > 0 ? `${m}p` : ''}`;
}

export function DashboardView() {
  const { stats, setStats, setCurrentView, openTaskDetail } = useAppStore();
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
        <div className="flex items-center gap-3 text-muted-foreground animate-pulse">
          <Activity className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Đang tải phân tích tổng quan...</span>
        </div>
      </div>
    );
  }

  const doneCount = stats.tasksByStatus['done'] || 0;
  const inProgressCount = stats.tasksByStatus['in_progress'] || 0;
  const totalForProgress = stats.totalTasks || 1;
  const completionRate = Math.round((doneCount / totalForProgress) * 100);

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Tổng quan hiệu suất</h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Báo cáo tổng hợp tiến độ, phân bổ nhân sự và chấm công thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('board')}
            className="text-xs h-8 gap-1.5 shadow-2xs"
          >
            <KanbanSquare className="h-3.5 w-3.5" />
            <span>Xem Bảng việc</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setCurrentView('time-tracking')}
            className="text-xs h-8 gap-1.5 shadow-xs font-semibold"
          >
            <Timer className="h-3.5 w-3.5" />
            <span>Chấm công</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Hero Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tasks */}
        <Card className="relative overflow-hidden border-border/60 shadow-2xs hover:shadow-md transition-shadow bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tổng công việc</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ListTodo className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Trong tất cả các dự án</span>
            </p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="relative overflow-hidden border-border/60 shadow-2xs hover:shadow-md transition-shadow bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Đang thực hiện</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Chiếm {Math.round((inProgressCount / totalForProgress) * 100)}% khối lượng
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="relative overflow-hidden border-border/60 shadow-2xs hover:shadow-md transition-shadow bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Đã hoàn thành</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{doneCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tỷ lệ hoàn tất <strong className="text-foreground">{completionRate}%</strong>
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="relative overflow-hidden border-border/60 shadow-2xs hover:shadow-md transition-shadow bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hạn chót 7 ngày</CardTitle>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {stats.upcomingDeadlines.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cần theo dõi & đôn đốc
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress & Priority Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Completion & Status Breakdown */}
        <Card className="border-border/60 shadow-2xs bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tiến độ & Phân bổ trạng thái</CardTitle>
            <CardDescription className="text-xs">Theo dõi dòng chảy công việc của toàn bộ dự án</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Tỷ lệ hoàn thành tổng thể</span>
                <span className="font-bold text-foreground">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2.5 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {Object.entries(statusConfig).map(([key, config]) => {
                const Icon = config.icon;
                const count = stats.tasksByStatus[key] || 0;
                const pct = Math.round((count / totalForProgress) * 100);

                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className={cn('p-2 rounded-lg', config.bg, config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{count}</span>
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card className="border-border/60 shadow-2xs bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Phân loại theo mức độ ưu tiên</CardTitle>
            <CardDescription className="text-xs">Đảm bảo các tác vụ quan trọng được xử lý kịp thời</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              {(['urgent', 'high', 'medium', 'low'] as const).map((p) => {
                const count = stats.tasksByPriority[p] || 0;
                const pct = totalForProgress > 0 ? Math.round((count / totalForProgress) * 100) : 0;
                const cfg = priorityConfig[p];

                return (
                  <div key={p} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className={cn('font-medium', cfg.color)}>{cfg.label}</span>
                      <span className="text-muted-foreground font-mono">{count} việc ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', cfg.bg)}
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

      {/* Deadlines & Member Workload */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Card className="border-border/60 shadow-2xs bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Công việc sắp đến hạn
            </CardTitle>
            <CardDescription className="text-xs">Các công việc có hạn chót trong 7 ngày tới</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mb-2" />
                <p className="text-xs text-muted-foreground">Không có công việc nào sắp đến hạn</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {stats.upcomingDeadlines.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => openTaskDetail(task)}
                    className="flex items-center justify-between rounded-xl border border-border/50 p-2.5 gap-2 hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {task.project?.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-1 border-rose-500/20 text-rose-600 bg-rose-500/5">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : ''}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Workload */}
        <Card className="border-border/60 shadow-2xs bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Khối lượng công việc thành viên
            </CardTitle>
            <CardDescription className="text-xs">Phân bổ số lượng tác vụ được giao</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.memberWorkload.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-muted-foreground">Chưa có dữ liệu thành viên</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {stats.memberWorkload
                  .sort((a, b) => b.count - a.count)
                  .map((m) => {
                    const pct = totalForProgress > 0 ? Math.round((m.count / totalForProgress) * 100) : 0;
                    return (
                      <div key={m.memberId} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: m.memberColor }}
                            />
                            <span className="font-medium text-foreground truncate">{m.memberName}</span>
                          </div>
                          <span className="text-muted-foreground font-mono">{m.count} việc</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full transition-all"
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

      {/* Member Work Hours Ranking Table */}
      <Card className="border-border/60 shadow-2xs bg-card/80 backdrop-blur-md overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                Bảng xếp hạng thời gian làm việc
              </CardTitle>
              <CardDescription className="text-xs">
                Tổng hợp thời gian ghi nhận hôm nay và tuần này
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px] bg-muted/30 w-fit">
              Tự động cập nhật
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingWorkHours ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground animate-pulse text-xs">
              Đang tải bảng chấm công...
            </div>
          ) : workHours.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-xs">
              Chưa có dữ liệu chấm công nào
            </div>
          ) : (
            <div className="space-y-0">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                <div className="col-span-1">#</div>
                <div className="col-span-4 sm:col-span-3">Thành viên</div>
                <div className="col-span-3 sm:col-span-2 text-right">Hôm nay</div>
                <div className="col-span-2 text-right hidden sm:block">Tuần này</div>
                <div className="col-span-4 sm:col-span-2 text-right">Trạng thái</div>
                <div className="col-span-2 text-right hidden lg:block">Tổng cộng</div>
              </div>

              {/* Rows */}
              {workHours.map((m, index) => {
                const maxTodayMinutes = workHours[0]?.todayMinutes || 1;
                const barWidth = Math.max(4, (m.todayMinutes / maxTodayMinutes) * 100);
                const isTop = index === 0 && m.todayMinutes > 0;

                return (
                  <div
                    key={m.userId}
                    className={cn(
                      'grid grid-cols-12 gap-2 px-3 py-2.5 items-center border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40 text-xs',
                      isTop && 'bg-amber-500/5'
                    )}
                  >
                    {/* Rank */}
                    <div className="col-span-1">
                      <span className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                        index === 0 && m.todayMinutes > 0 ? 'bg-amber-400 text-white shadow-2xs' :
                        index === 1 && m.todayMinutes > 0 ? 'bg-slate-400 text-white' :
                        index === 2 && m.todayMinutes > 0 ? 'bg-amber-700 text-white' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Member info */}
                    <div className="col-span-4 sm:col-span-3 flex items-center gap-2 min-w-0">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: m.userColor }}
                      >
                        {m.userName.split(' ').map((n) => n.charAt(0).toUpperCase()).slice(-2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate text-foreground">{m.userName}</p>
                      </div>
                    </div>

                    {/* Today's hours */}
                    <div className="col-span-3 sm:col-span-2">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={cn(
                          'text-xs font-bold font-mono',
                          isTop ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                        )}>
                          {formatMinutes(m.todayMinutes)}
                        </span>
                        <div className="w-full h-1 rounded-full bg-muted/60">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              isTop ? 'bg-amber-500' : 'bg-primary'
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Week hours */}
                    <div className="col-span-2 text-right hidden sm:block font-mono text-xs text-muted-foreground">
                      {formatMinutes(m.weekMinutes)}
                    </div>

                    {/* Status */}
                    <div className="col-span-4 sm:col-span-2 flex justify-end">
                      {m.isCurrentlyWorking ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đang làm việc
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">
                          Nghỉ
                        </Badge>
                      )}
                    </div>

                    {/* Total */}
                    <div className="col-span-2 text-right hidden lg:block font-mono text-xs text-muted-foreground">
                      <span className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-primary" />
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
    </div>
  );
}
