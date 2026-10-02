'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Task } from '@/types';
import { useAppStore } from '@/stores/app-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FolderKanban,
  Layers,
  ListChecks,
  Loader2,
  Send,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusSummary = [
  { key: 'todo', label: 'Cần làm', className: 'bg-slate-500' },
  { key: 'in_progress', label: 'Đang làm', className: 'bg-sky-500' },
  { key: 'review', label: 'Chờ duyệt', className: 'bg-violet-500' },
  { key: 'done', label: 'Hoàn tất', className: 'bg-emerald-500' },
] as const;

function getInitials(name?: string | null) {
  return (name || 'Leader')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Đang tải tổng quan Leader" aria-busy="true">
      <div className="h-52 animate-pulse rounded-3xl border border-border/50 bg-muted/50" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-2xl border border-border/50 bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
        <div className="h-72 animate-pulse rounded-2xl border border-border/50 bg-muted/40" />
        <div className="h-72 animate-pulse rounded-2xl border border-border/50 bg-muted/40" />
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang chuẩn bị không gian làm việc…
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof FolderKanban;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/60">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
  variant,
}: {
  task: Task;
  onOpen: () => void;
  variant: 'review' | 'attention';
}) {
  const isReview = variant === 'review';
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isValidDueDate = Boolean(dueDate && !Number.isNaN(dueDate.getTime()));

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isReview
          ? 'border-violet-500/15 bg-violet-500/[0.03] hover:border-violet-500/35 hover:bg-violet-500/[0.07]'
          : 'border-rose-500/15 bg-rose-500/[0.03] hover:border-rose-500/35 hover:bg-rose-500/[0.07]'
      )}
      aria-label={`Mở chi tiết công việc ${task.title}`}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          isReview ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
        )}
      >
        {isReview ? <Send className="h-4 w-4" aria-hidden="true" /> : <CircleAlert className="h-4 w-4" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{task.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {isReview
            ? `${task.project?.name || 'Chưa gán dự án'} · ${task.assignee?.name || 'Thành viên'}`
            : `${task.assignee?.name || 'Chưa gán người thực hiện'} · ${task.project?.name || 'Chưa gán dự án'}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isReview && isValidDueDate ? (
          <span className="hidden rounded-md bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-700 sm:inline-block dark:text-rose-300">
            {format(dueDate!, 'dd/MM')}
          </span>
        ) : null}
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
      </div>
    </button>
  );
}

export function LeaderDashboardView() {
  const { user, projects, tasks, members, setCurrentView, setSelectedProjectId, openTaskDetail } = useAppStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsInitialLoad(false), 450);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const activeProjects = useMemo(() => projects.filter((project) => project.status === 'active'), [projects]);
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);
  const reviewTasks = useMemo(() => tasks.filter((task) => task.status === 'review'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((task) => task.status === 'done'), [tasks]);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(dayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const overdueTasks = useMemo(
    () => openTasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < dayStart.getTime()),
    [openTasks, dayStart]
  );
  const dueTodayTasks = useMemo(
    () => openTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueTime = new Date(task.dueDate).getTime();
      return dueTime >= dayStart.getTime() && dueTime < tomorrowStart.getTime();
    }),
    [openTasks, dayStart, tomorrowStart]
  );
  const attentionTasks = useMemo(
    () => [...overdueTasks, ...dueTodayTasks].sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()),
    [dueTodayTasks, overdueTasks]
  );
  const completionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  const taskStatusCounts = useMemo(
    () => Object.fromEntries(statusSummary.map(({ key }) => [key, tasks.filter((task) => task.status === key).length])),
    [tasks]
  );
  const projectSummaries = useMemo(
    () => activeProjects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      const completed = projectTasks.filter((task) => task.status === 'done').length;
      return {
        project,
        total: projectTasks.length,
        completed,
        rate: projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0,
      };
    }),
    [activeProjects, tasks]
  );

  const hasWorkspaceData = projects.length > 0 || tasks.length > 0 || members.length > 0;
  const showLoadingState = isInitialLoad && !hasWorkspaceData;
  const todayLabel = format(new Date(), "EEEE, dd 'tháng' MM", { locale: vi });
  const metrics = [
    { label: 'Dự án hoạt động', value: activeProjects.length, note: 'Dự án đang điều phối', icon: FolderKanban, accent: 'amber' },
    { label: 'Việc chưa hoàn tất', value: openTasks.length, note: `${doneTasks.length} việc đã hoàn tất`, icon: ListChecks, accent: 'sky' },
    { label: 'Chờ phản hồi', value: reviewTasks.length, note: reviewTasks.length ? 'Cần Leader xem xét' : 'Hàng chờ đang trống', icon: Send, accent: 'violet' },
    { label: 'Mốc cần lưu ý', value: attentionTasks.length, note: overdueTasks.length ? `${overdueTasks.length} việc đã quá hạn` : 'Không có việc quá hạn', icon: Clock3, accent: 'rose' },
  ] as const;

  if (showLoadingState) return <DashboardSkeleton />;

  return (
    <div className="space-y-5 pb-2 sm:space-y-6">
      <section
        aria-labelledby="leader-dashboard-title"
        className="relative isolate overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 px-5 py-6 text-white shadow-lg shadow-orange-500/15 sm:px-7 sm:py-7"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/25" />
          <div className="absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.12)_50%,transparent_80%)]" />
        </div>
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge className="border-0 bg-white/18 px-2.5 py-1 text-white shadow-none hover:bg-white/18">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                Không gian Leader
              </Badge>
              <span className="font-medium capitalize text-amber-50/90">{todayLabel}</span>
            </div>
            <h1 id="leader-dashboard-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
              Chào {user?.name || 'Leader'}, sẵn sàng điều phối hôm nay?
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-amber-50/90">
              Nắm tiến độ, xử lý yêu cầu chờ duyệt và giữ các mốc quan trọng của nhóm luôn trong tầm kiểm soát.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-black/10 px-3 py-2 backdrop-blur-sm">
              <Avatar className="h-8 w-8 border border-white/30">
                {user?.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                <AvatarFallback className="bg-white/20 text-xs font-bold text-white">{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-amber-100">Nhóm của bạn</p>
                <p className="text-sm font-bold">{members.length} thành viên</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCurrentView('projects')} className="h-9 bg-white px-3 text-xs font-semibold text-orange-700 shadow-sm hover:bg-orange-50">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                Dự án
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentView('board')} className="h-9 border-white/35 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20 hover:text-white">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                Bảng việc
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Các chỉ số công việc" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const tone = {
            amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
            sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
            violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
            rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
          }[metric.accent];
          return (
            <Card key={metric.label} className="gap-0 rounded-2xl border-border/60 bg-card/90 py-0 shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
                </div>
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <Card className="gap-0 rounded-2xl border-border/60 bg-card/90 py-0 shadow-sm">
            <CardHeader className="px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle id="reviews-heading" className="flex items-center gap-2 text-base">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </span>
                    Cần bạn xem xét
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">Kết quả thành viên đã gửi để duyệt</CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 border-violet-500/20 bg-violet-500/5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                  {reviewTasks.length} việc
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {reviewTasks.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Hàng chờ đã trống" description="Khi thành viên gửi kết quả, yêu cầu duyệt sẽ xuất hiện tại đây." />
              ) : (
                <ScrollArea className="h-72" aria-labelledby="reviews-heading">
                  <div className="space-y-2 pr-3" role="list" aria-label="Danh sách việc chờ duyệt">
                    {reviewTasks.map((task) => <div key={task.id} role="listitem"><TaskRow task={task} variant="review" onOpen={() => openTaskDetail(task)} /></div>)}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-2xl border-border/60 bg-card/90 py-0 shadow-sm">
            <CardHeader className="px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle id="attention-heading" className="flex items-center gap-2 text-base">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300">
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    Ưu tiên hôm nay
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">Việc quá hạn hoặc đến hạn trong ngày</CardDescription>
                </div>
                <Badge variant="outline" className={cn('shrink-0 text-xs font-semibold', attentionTasks.length ? 'border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300')}>
                  {attentionTasks.length ? `${attentionTasks.length} việc` : 'Ổn định'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {attentionTasks.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Mọi thứ đang đúng nhịp" description="Không có công việc nào quá hạn hoặc cần hoàn thành trong hôm nay." />
              ) : (
                <ScrollArea className="h-72" aria-labelledby="attention-heading">
                  <div className="space-y-2 pr-3" role="list" aria-label="Danh sách việc cần ưu tiên">
                    {attentionTasks.map((task) => <div key={task.id} role="listitem"><TaskRow task={task} variant="attention" onOpen={() => openTaskDetail(task)} /></div>)}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="gap-0 rounded-2xl border-border/60 bg-card/90 py-0 shadow-sm">
          <CardHeader className="px-5 pb-4 pt-5">
            <CardTitle id="team-pace-heading" className="flex items-center gap-2 text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
              Nhịp độ toàn đội
            </CardTitle>
            <CardDescription className="mt-1 text-xs">Phân bổ công việc ở tất cả dự án đang quản lý</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.035] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tỷ lệ hoàn thành</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{completionRate}%</p>
                </div>
                <span className="rounded-lg bg-background px-2 py-1 text-xs font-semibold text-muted-foreground shadow-sm">{doneTasks.length}/{tasks.length} việc</span>
              </div>
              <Progress value={completionRate} className="mt-4 h-2 bg-emerald-500/15 [&>div]:bg-emerald-500" />
            </div>

            <div className="space-y-3" aria-label="Phân bổ trạng thái công việc">
              {statusSummary.map((status) => {
                const count = taskStatusCounts[status.key] || 0;
                const percentage = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
                return (
                  <div key={status.key}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-muted-foreground"><span className={cn('h-2 w-2 rounded-full', status.className)} aria-hidden="true" />{status.label}</span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full transition-all duration-500', status.className)} style={{ width: `${percentage}%` }} /></div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
              <div><p className="text-xs text-muted-foreground">Thành viên</p><p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-foreground"><UsersRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{members.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Dự án hoạt động</p><p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-foreground"><FolderKanban className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{activeProjects.length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="project-progress-heading">
        <Card className="gap-0 rounded-2xl border-border/60 bg-card/90 py-0 shadow-sm">
          <CardHeader className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id="project-progress-heading" className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><FolderKanban className="h-4 w-4" aria-hidden="true" /></span>
                Tiến độ dự án
              </CardTitle>
              <CardDescription className="mt-1 text-xs">Bức tranh hoàn thành của từng dự án đang hoạt động</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('projects')} className="h-8 self-start text-xs font-semibold text-muted-foreground hover:text-foreground">
              Xem tất cả<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {projectSummaries.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Chưa có dự án hoạt động"
                description="Khi dự án được kích hoạt, tiến độ và khối lượng công việc sẽ xuất hiện tại đây."
                action={<Button size="sm" variant="outline" onClick={() => setCurrentView('projects')} className="h-8 text-xs"><Layers className="h-3.5 w-3.5" aria-hidden="true" />Quản lý dự án</Button>}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {projectSummaries.map(({ project, total, completed, rate }) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => { setSelectedProjectId(project.id); setCurrentView('board'); }}
                    className="group rounded-xl border border-border/60 bg-muted/[0.18] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={`Mở bảng công việc của dự án ${project.name}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" /><h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{project.name}</h3></div>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{project.description || 'Chưa có mô tả dự án'}</p>
                      </div>
                      <span className="shrink-0 text-lg font-bold tracking-tight text-foreground">{rate}%</span>
                    </div>
                    <Progress value={rate} className="mt-4 h-1.5" />
                    <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground"><span>{total} việc</span><span className="font-medium text-foreground">{completed} hoàn tất</span></div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
