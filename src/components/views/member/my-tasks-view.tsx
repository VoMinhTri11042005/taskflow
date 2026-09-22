'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Project, Task, TaskLink } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskTableView } from '@/components/tasks/task-table-view';
import { TaskCalendarView } from '@/components/tasks/task-calendar-view';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Table2,
  Presentation,
  FileQuestion,
  Link as LinkIcon,
  Calendar,
  Send,
  LayoutGrid,
  Table as TableIcon,
  CalendarDays,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureApiSuccess, readApiJson } from '@/lib/client-api';

const columns: { id: Task['status']; label: string; color: string; bgColor: string; dotColor: string }[] = [
  { id: 'todo', label: 'Cần làm', color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100/70 dark:bg-slate-900/40', dotColor: 'bg-slate-400' },
  { id: 'in_progress', label: 'Đang làm', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50/70 dark:bg-amber-950/20', dotColor: 'bg-amber-500' },
  { id: 'review', label: 'Chờ xem xét', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50/70 dark:bg-violet-950/20', dotColor: 'bg-violet-500' },
  { id: 'done', label: 'Hoàn thành', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50/70 dark:bg-emerald-950/20', dotColor: 'bg-emerald-500' },
];

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  medium: { label: 'TB', className: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
  high: { label: 'Cao', className: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300' },
  urgent: { label: 'Gấp', className: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold' },
};

export function MyTasksView() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<Task['status']>('todo');
  const {
    tasks, setTasks,
    projects, setProjects,
    selectedProjectId, setSelectedProjectId,
    boardViewMode, setBoardViewMode,
    openTaskDetail,
    searchQuery, setSearchQuery,
    user,
  } = useAppStore();

  const [movingId, setMovingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedProjectId) params.set('projectId', selectedProjectId);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    const data = await readApiJson<Task[]>(res, 'Không thể tải danh sách công việc');
    setTasks(data);
  }, [selectedProjectId, setTasks]);

  useEffect(() => {
    void Promise.all([
      fetchTasks(),
      fetch('/api/projects')
        .then((response) => readApiJson<Project[]>(response, 'Không thể tải danh sách dự án'))
        .then(setProjects),
    ]).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu công việc');
    });
  }, [fetchTasks, setProjects]);

  function getColumnIndex(status: Task['status']): number {
    return columns.findIndex((c) => c.id === status);
  }

  async function handleMoveStatus(task: Task, direction: 'left' | 'right') {
    const idx = getColumnIndex(task.status);
    const newIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= columns.length) return;

    const newStatus = columns[newIdx].id;
    setMovingId(task.id);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await ensureApiSuccess(response, 'Không thể cập nhật trạng thái');
      toast.success(`Đã chuyển sang "${columns[newIdx].label}"`);
      await fetchTasks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái');
    } finally {
      setMovingId(null);
    }
  }

  /* Deadline countdown calculation */
  function getDeadlineInfo(dateStr: string) {
    const dueDate = new Date(dateStr);
    const now = new Date();
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

    if (daysRemaining < 0) {
      return {
        text: `Quá hạn ${Math.abs(daysRemaining)} ngày!`,
        className: 'text-rose-600 dark:text-rose-400 font-bold',
      };
    }
    if (daysRemaining === 0) {
      return {
        text: 'Hạn hôm nay!',
        className: 'text-amber-600 dark:text-amber-400 font-semibold',
      };
    }
    if (daysRemaining <= 3) {
      return {
        text: `Còn ${daysRemaining} ngày`,
        className: 'text-orange-600 dark:text-orange-400',
      };
    }
    return {
      text: `Còn ${daysRemaining} ngày`,
      className: 'text-muted-foreground',
    };
  }

  /* Request review */
  async function handleRequestReview(task: Task) {
    setReviewingId(task.id);
    try {
      const updateResponse = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'review' }),
      });
      await ensureApiSuccess(updateResponse, 'Không thể gửi yêu cầu xem xét');

      toast.success('Đã gửi yêu cầu review cho Leader');
      await fetchTasks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi yêu cầu review');
    } finally {
      setReviewingId(null);
    }
  }

  /* Filter tasks assigned to current member */
  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      // If user has teamMemberId, filter by it, otherwise show all assigned to member
      if (user?.teamMemberId && t.assigneeId !== user.teamMemberId) return false;
      if (selectedProjectId && t.projectId !== selectedProjectId) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description ? t.description.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [tasks, user?.teamMemberId, selectedProjectId, filterPriority, searchQuery]);

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/40 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
              {currentProject ? currentProject.name : 'Công việc của tôi'}
            </h1>
            <Badge variant="outline" className="text-xs h-5 px-2 bg-muted/40 font-mono">
              {myTasks.length} việc
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Danh sách các tác vụ được phân công cho bạn
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-view mode switcher */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-muted-foreground shadow-2xs">
            <Button
              variant={boardViewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-2.5 text-xs font-medium gap-1.5 rounded-md transition-all',
                boardViewMode === 'kanban' && 'bg-background text-foreground shadow-2xs'
              )}
              onClick={() => setBoardViewMode('kanban')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button
              variant={boardViewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-2.5 text-xs font-medium gap-1.5 rounded-md transition-all',
                boardViewMode === 'table' && 'bg-background text-foreground shadow-2xs'
              )}
              onClick={() => setBoardViewMode('table')}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bảng</span>
            </Button>
            <Button
              variant={boardViewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-2.5 text-xs font-medium gap-1.5 rounded-md transition-all',
                boardViewMode === 'calendar' && 'bg-background text-foreground shadow-2xs'
              )}
              onClick={() => setBoardViewMode('calendar')}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lịch</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm việc của tôi..."
              className="pl-8 h-8 text-xs bg-muted/20 border-border/60 focus:bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <Select
            value={selectedProjectId || 'all'}
            onValueChange={(v) => setSelectedProjectId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-8 text-xs w-[140px] bg-muted/20 border-border/60">
              <SelectValue placeholder="Dự án" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả dự án</SelectItem>
              {projects
                .filter((p) => p.status === 'active')
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 text-xs w-[120px] bg-muted/20 border-border/60">
              <SelectValue placeholder="Ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi ưu tiên</SelectItem>
              <SelectItem value="urgent">Khẩn cấp</SelectItem>
              <SelectItem value="high">Cao</SelectItem>
              <SelectItem value="medium">Trung bình</SelectItem>
              <SelectItem value="low">Thấp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-0">
        {boardViewMode === 'table' ? (
          <TaskTableView tasks={myTasks} />
        ) : boardViewMode === 'calendar' ? (
          <TaskCalendarView tasks={myTasks} onTaskClick={(task) => openTaskDetail(task)} />
        ) : (
          /* Kanban Board */
          <div className="flex flex-col h-full">
            {/* Mobile Tab Navigation */}
            {isMobile && (
              <div className="flex gap-1 overflow-x-auto pb-2 shrink-0">
                {columns.map((col) => {
                  const count = myTasks.filter((t) => t.status === col.id).length;
                  return (
                    <button
                      key={col.id}
                      onClick={() => setMobileTab(col.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                        mobileTab === col.id
                          ? cn(col.bgColor, col.color, 'shadow-2xs ring-1 ring-border/50')
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', col.dotColor)} />
                      {col.label}
                      <span className="h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold bg-background/80">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-x-auto">
              <div className={cn('flex gap-3.5 h-full pb-4', !isMobile && 'min-w-max')}>
                {(isMobile ? columns.filter((c) => c.id === mobileTab) : columns).map((column) => {
                  const columnTasks = myTasks.filter((t) => t.status === column.id);
                  const colIdx = getColumnIndex(column.id);

                  return (
                    <div
                      key={column.id}
                      className={cn(
                        'flex-shrink-0 flex flex-col rounded-xl p-3 border border-border/50 transition-colors',
                        isMobile ? 'w-full flex-1' : 'w-80',
                        column.bgColor
                      )}
                    >
                      {/* Column header */}
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2.5 w-2.5 rounded-full', column.dotColor)} />
                          <h3 className={cn('text-xs font-bold tracking-tight uppercase', column.color)}>
                            {column.label}
                          </h3>
                          <span className="text-[11px] font-semibold text-muted-foreground px-1.5 py-0.2 bg-background/80 rounded-full border border-border/40">
                            {columnTasks.length}
                          </span>
                        </div>
                      </div>

                      {/* Task cards list */}
                      <ScrollArea className="flex-1">
                        <div className="space-y-2.5 pr-1 pb-2">
                          {columnTasks.map((task) => {
                            const project = task.project;
                            const priority = priorityConfig[task.priority];
                            const deadline = task.dueDate ? getDeadlineInfo(task.dueDate) : null;
                            const hasLinks = task.links && task.links.length > 0;
                            const isMoving = movingId === task.id;
                            const isReviewing = reviewingId === task.id;

                            return (
                              <Card
                                key={task.id}
                                onClick={() => openTaskDetail(task)}
                                className={cn(
                                  'cursor-pointer bg-card/95 hover:bg-card border-border/70 hover:border-primary/40 transition-all group',
                                  'shadow-2xs hover:shadow-md select-none rounded-xl active:scale-[0.99]'
                                )}
                              >
                                <CardContent className="p-3.5 space-y-2.5">
                                  {/* Top meta */}
                                  <div className="flex items-center justify-between gap-1">
                                    <Badge className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium border-0', priority?.className)}>
                                      {priority?.label}
                                    </Badge>
                                    {project && (
                                      <div className="flex items-center gap-1.5 max-w-[130px]">
                                        <div
                                          className="h-2 w-2 rounded-full shrink-0"
                                          style={{ backgroundColor: project.color }}
                                        />
                                        <span className="text-[11px] text-muted-foreground font-medium truncate">
                                          {project.name}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Title */}
                                  <h4 className="text-xs font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                    {task.title}
                                  </h4>

                                  {/* Deadline & links */}
                                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                    <div className="flex items-center gap-2">
                                      {deadline && (
                                        <span className={cn('text-[11px] flex items-center gap-1', deadline.className)}>
                                          <Calendar className="h-3 w-3" />
                                          {deadline.text}
                                        </span>
                                      )}
                                      {hasLinks && (
                                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                                          <LinkIcon className="h-2.5 w-2.5" />
                                          {task.links?.length}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  <div
                                    className="flex items-center gap-1 pt-1 justify-between"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={colIdx === 0 || isMoving}
                                      onClick={() => handleMoveStatus(task, 'left')}
                                      className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                                      title="Lùi trạng thái"
                                    >
                                      <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                                      Lùi
                                    </Button>

                                    {task.status === 'in_progress' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isReviewing}
                                        onClick={() => handleRequestReview(task)}
                                        className="h-6 px-2 text-[11px] font-medium border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                                      >
                                        <Send className="h-3 w-3 mr-1" />
                                        {isReviewing ? 'Đang gửi...' : 'Nộp duyệt'}
                                      </Button>
                                    )}

                                    {task.status !== 'done' && task.status !== 'review' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={colIdx >= columns.length - 1 || isMoving}
                                        onClick={() => handleMoveStatus(task, 'right')}
                                        className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                                        title="Tiến trạng thái"
                                      >
                                        Tiến
                                        <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}

                          {columnTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground/60 border border-dashed border-border/60 rounded-xl bg-background/30">
                              <span>Không có công việc</span>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
