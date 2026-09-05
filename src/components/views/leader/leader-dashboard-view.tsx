'use client';

import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock3, FolderKanban, ListChecks, UsersRound } from 'lucide-react';

export function LeaderDashboardView() {
  const { user, projects, tasks, members } = useAppStore();
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const overdueTasks = openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date());

  const cards = [
    { label: 'Dự án đang quản lý', value: projects.filter((project) => project.status === 'active').length, icon: FolderKanban, tone: 'bg-amber-100 text-amber-700' },
    { label: 'Việc đang mở', value: openTasks.length, icon: ListChecks, tone: 'bg-sky-100 text-sky-700' },
    { label: 'Thành viên nhóm', value: members.filter((member) => member.role === 'member').length, icon: UsersRound, tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'Việc quá hạn', value: overdueTasks.length, icon: Clock3, tone: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-sm">
        <Badge className="mb-3 bg-white/20 text-white hover:bg-white/20">Leader workspace</Badge>
        <h1 className="text-2xl font-bold">Chào {user?.name || 'Leader'}, điều phối nhóm của bạn</h1>
        <p className="mt-2 max-w-2xl text-sm text-amber-50">Tạo dự án, giao việc, duyệt thành viên và theo dõi tiến độ trong một không gian riêng.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ưu tiên hôm nay</CardTitle>
          <CardDescription>Những việc cần Leader xử lý trước để nhóm làm việc thông suốt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overdueTasks.length > 0 ? overdueTasks.slice(0, 4).map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/50 px-4 py-3">
              <span className="text-sm font-medium">{task.title}</span><Badge variant="destructive">Quá hạn</Badge>
            </div>
          )) : <p className="text-sm text-muted-foreground">Không có việc quá hạn. Hãy tạo dự án hoặc giao việc mới từ menu bên trái.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
