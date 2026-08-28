'use client';

import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  ListTodo,
  Clock,
  TrendingUp,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProfileView() {
  const { user, tasks } = useAppStore();

  /* Stats calculated from assigned tasks */
  const myTasks = tasks.filter((t) => t.assigneeId === user?.teamMemberId);
  const totalAssigned = myTasks.length;
  const completedTasks = myTasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress').length;
  const completionRate = totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  const statCards = [
    {
      label: 'Việc được giao',
      value: totalAssigned,
      icon: ListTodo,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
    },
    {
      label: 'Đã hoàn thành',
      value: completedTasks,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      label: 'Đang thực hiện',
      value: inProgressTasks,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      label: 'Tỷ lệ hoàn thành',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hồ sơ</h1>
        <p className="text-muted-foreground">Thông tin cá nhân và thống kê</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{ backgroundColor: user?.color || '#6b7280' }}
            >
              {initials}
            </div>
            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{user?.name || 'Thành viên'}</h2>
                <Badge variant="secondary" className="w-fit">Thành viên</Badge>
              </div>
              {user?.email && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', stat.bgColor)}>
                  <Icon className={cn('h-4 w-4', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
