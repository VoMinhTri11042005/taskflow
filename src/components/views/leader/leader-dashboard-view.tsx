'use client';

import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock3,
  FolderKanban,
  ListChecks,
  UsersRound,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Send,
  Timer,
  BarChart3,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function LeaderDashboardView() {
  const { user, projects, tasks, members, setCurrentView, setSelectedProjectId, openTaskDetail } = useAppStore();

  const activeProjects = projects.filter((project) => project.status === 'active');
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const reviewTasks = tasks.filter((task) => task.status === 'review');
  const doneTasks = tasks.filter((task) => task.status === 'done');
  const overdueTasks = openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date());
  const completionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const cards = [
    {
      label: 'Dự án đang điều phối',
      value: activeProjects.length,
      icon: FolderKanban,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      desc: 'Đang hoạt động',
    },
    {
      label: 'Việc đang thực hiện',
      value: openTasks.length,
      icon: ListChecks,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
      desc: `${doneTasks.length} đã hoàn tất`,
    },
    {
      label: 'Chờ Leader duyệt',
      value: reviewTasks.length,
      icon: Send,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      desc: 'Cần phản hồi',
    },
    {
      label: 'Công việc quá hạn',
      value: overdueTasks.length,
      icon: Clock3,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      desc: 'Cần đôn đốc ngay',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white font-medium border-0 text-xs backdrop-blur-sm">
                Không gian Leader
              </Badge>
              <span className="text-xs text-amber-100 font-mono">
                {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: vi })}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Xin chào, {user?.name || 'Leader'}!
            </h1>
            <p className="mt-1 text-xs text-amber-100/90 max-w-xl">
              Điều phối tiến độ các dự án, đánh giá chất lượng sản phẩm bàn giao và phê duyệt kết quả của thành viên trong nhóm.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentView('projects')}
              className="text-xs font-semibold h-8 gap-1.5 shadow-sm bg-white text-orange-600 hover:bg-white/90"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Quản lý dự án</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('board')}
              className="text-xs font-semibold h-8 gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              <span>Bảng công việc</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border/60 shadow-2xs hover:shadow-md transition-shadow bg-card/80 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {card.label}
                </CardTitle>
                <div className={cn('p-2 rounded-lg', card.bg, card.color)}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Grid: Pending Reviews & Urgent Tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending Reviews Box */}
        <Card className="border-border/60 shadow-2xs bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Send className="h-4 w-4 text-violet-500" />
                  Yêu cầu chờ xem xét & duyệt
                </CardTitle>
                <CardDescription className="text-xs">Công việc thành viên đã hoàn thành và gửi nộp</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono bg-violet-500/10 text-violet-600 border-violet-500/20">
                {reviewTasks.length} việc
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {reviewTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mb-2" />
                <p className="text-xs text-muted-foreground">Hiện tại không có công việc nào chờ duyệt</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {reviewTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => openTaskDetail(task)}
                    className="flex items-center justify-between rounded-xl border border-border/60 p-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {task.project?.name} · {task.assignee?.name || 'Thành viên'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5 font-medium ml-2 shrink-0 border-violet-500/30 text-violet-600 hover:bg-violet-500/10"
                    >
                      Xem chi tiết
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue / Urgent Tasks */}
        <Card className="border-border/60 shadow-2xs bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-rose-500" />
                  Cần ưu tiên đôn đốc
                </CardTitle>
                <CardDescription className="text-xs">Các công việc đã quá hạn hoặc đến hạn hôm nay</CardDescription>
              </div>
              {overdueTasks.length > 0 && (
                <Badge variant="destructive" className="text-xs font-mono">
                  {overdueTasks.length} quá hạn
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mb-2" />
                <p className="text-xs text-muted-foreground">Tất cả công việc đều đang đúng tiến độ</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => openTaskDetail(task)}
                    className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 hover:bg-rose-500/10 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground group-hover:text-rose-600 transition-colors truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Người làm: <strong className="text-foreground">{task.assignee?.name || 'Chưa gán'}</strong>
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-600 bg-rose-500/10 shrink-0 ml-2">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'Quá hạn'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects Overview Grid */}
      <Card className="border-border/60 shadow-2xs bg-card/80 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Tiến độ các dự án đang quản lý
              </CardTitle>
              <CardDescription className="text-xs">Theo dõi tỷ lệ hoàn thành tác vụ theo từng dự án</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('projects')}
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
            >
              Tất cả dự án →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeProjects.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Chưa có dự án nào đang hoạt động
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeProjects.map((project) => {
                const projectTasks = tasks.filter((t) => t.projectId === project.id);
                const projectDone = projectTasks.filter((t) => t.status === 'done');
                const rate = projectTasks.length > 0 ? Math.round((projectDone.length / projectTasks.length) * 100) : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setCurrentView('board');
                    }}
                    className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </h4>
                      </div>
                      <span className="text-xs font-bold font-mono text-foreground">{rate}%</span>
                    </div>

                    <Progress value={rate} className="h-1.5 rounded-full mb-2" />

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{projectTasks.length} việc tổng cộng</span>
                      <span>{projectDone.length} hoàn thành</span>
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
