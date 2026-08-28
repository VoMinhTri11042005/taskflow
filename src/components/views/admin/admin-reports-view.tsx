'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  TrendingUp,
  Users,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast } from 'date-fns';

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Thấp', color: 'bg-slate-400' },
  medium: { label: 'Trung bình', color: 'bg-amber-500' },
  high: { label: 'Cao', color: 'bg-orange-500' },
  urgent: { label: 'Khẩn cấp', color: 'bg-red-500' },
};

export function AdminReportsView() {
  const { tasks, members, projects } = useAppStore();

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeMembers = members.length;
    const avgTasksPerMember = activeMembers > 0 ? (totalTasks / activeMembers).toFixed(1) : '0';
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'done'
    ).length;

    return {
      totalTasks,
      completedTasks,
      completionRate,
      avgTasksPerMember,
      overdueTasks,
      activeMembers,
    };
  }, [tasks, members]);

  const projectProgress = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const doneTasks = projectTasks.filter((t) => t.status === 'done').length;
      const total = projectTasks.length;
      const pct = total > 0 ? Math.round((doneTasks / total) * 100) : 0;
      return {
        ...project,
        totalTasks: total,
        doneTasks,
        pct,
      };
    });
  }, [projects, tasks]);

  const memberPerformance = useMemo(() => {
    return members.map((member) => {
      const assigned = tasks.filter((t) => t.assigneeId === member.id);
      const completed = assigned.filter((t) => t.status === 'done').length;
      const total = assigned.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...member,
        assignedCount: total,
        completedCount: completed,
        completionRate: rate,
      };
    });
  }, [members, tasks]);

  const priorityDistribution = useMemo(() => {
    const total = tasks.length || 1;
    return (['urgent', 'high', 'medium', 'low'] as const).map((p) => {
      const count = tasks.filter((t) => t.priority === p).length;
      const pct = Math.round((count / total) * 100);
      return {
        key: p,
        label: priorityConfig[p].label,
        color: priorityConfig[p].color,
        count,
        pct,
      };
    });
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Báo cáo</h1>
        <p className="text-muted-foreground">
          Thống kê và phân tích hiệu suất làm việc của nhóm
        </p>
      </div>

      {/* Summary stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Việc hoàn thành</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">trong tổng số {stats.totalTasks} việc</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ hoàn thành</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">tổng công việc đã xong</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Việc / Thành viên</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTasksPerMember}</div>
            <p className="text-xs text-muted-foreground">trung bình mỗi người</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quá hạn</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">việc cần xử lý gấp</p>
          </CardContent>
        </Card>
      </div>

      {/* Project progress cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tiến độ theo dự án</CardTitle>
        </CardHeader>
        <CardContent>
          {projectProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Chưa có dự án nào
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projectProgress.map((project) => (
                <div
                  key={project.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-10 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="font-medium text-sm truncate">
                        {project.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {project.pct}%
                    </Badge>
                  </div>
                  <Progress value={project.pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {project.doneTasks} / {project.totalTasks} việc hoàn thành
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member performance table / cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hiệu suất thành viên</CardTitle>
        </CardHeader>
        <CardContent>
          {memberPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Chưa có thành viên nào
            </p>
          ) : (
            <>
              {/* Mobile: Card layout */}
              <div className="space-y-3 md:hidden">
                {memberPerformance.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{member.name}</span>
                        <Badge
                          variant={
                            member.completionRate >= 70
                              ? 'default'
                              : member.completionRate >= 40
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-xs shrink-0 ml-2"
                        >
                          {member.completionRate}%
                        </Badge>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary mb-1">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${member.completionRate}%`,
                            backgroundColor: member.color,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.completedCount}/{member.assignedCount} việc hoàn thành
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: Table layout */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thành viên</TableHead>
                      <TableHead className="text-right">Việc được gán</TableHead>
                      <TableHead className="text-right">Hoàn thành</TableHead>
                      <TableHead className="text-right">Tỷ lệ</TableHead>
                      <TableHead className="w-[120px]">Tiến độ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberPerformance.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm truncate">
                                {member.name}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {member.role === 'admin'
                                  ? 'Quản trị viên'
                                  : member.role === 'manager'
                                    ? 'Quản lý'
                                    : 'Thành viên'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {member.assignedCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {member.completedCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              member.completionRate >= 70
                                ? 'default'
                                : member.completionRate >= 40
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="text-xs"
                          >
                            {member.completionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="h-2 w-full rounded-full bg-secondary">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${member.completionRate}%`,
                                backgroundColor: member.color,
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Priority distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Phân bổ mức ưu tiên
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {priorityDistribution.map((p) => (
              <div key={p.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-3 w-3 rounded-full shrink-0',
                        p.color
                      )}
                    />
                    <span className="font-medium">{p.label}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {p.count} việc ({p.pct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-secondary">
                  <div
                    className={cn('h-2.5 rounded-full transition-all', p.color)}
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
