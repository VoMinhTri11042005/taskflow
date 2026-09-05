'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Project, Task, TaskLink } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Table2,
  Presentation,
  FileQuestion,
  Link as LinkIcon,
  ExternalLink,
  Calendar,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureApiSuccess, readApiJson } from '@/lib/client-api';

const columns: { id: Task['status']; label: string; color: string; bgColor: string }[] = [
  { id: 'todo', label: 'Cần làm', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'in_progress', label: 'Đang làm', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { id: 'review', label: 'Chờ xem xét', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { id: 'done', label: 'Hoàn thành', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
];

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'bg-slate-100 text-slate-700' },
  medium: { label: 'TB', className: 'bg-amber-100 text-amber-700' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Gấp', className: 'bg-red-100 text-red-700' },
};

const linkTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string; bg: string }> = {
  google_doc: { icon: FileText, color: 'text-blue-600', label: 'Google Doc', bg: 'bg-blue-50 border-blue-200' },
  google_sheet: { icon: Table2, color: 'text-emerald-600', label: 'Google Sheet', bg: 'bg-emerald-50 border-emerald-200' },
  google_slide: { icon: Presentation, color: 'text-orange-600', label: 'Google Slides', bg: 'bg-orange-50 border-orange-200' },
  google_form: { icon: FileQuestion, color: 'text-violet-600', label: 'Google Form', bg: 'bg-violet-50 border-violet-200' },
  other: { icon: LinkIcon, color: 'text-slate-600', label: 'Liên kết', bg: 'bg-slate-50 border-slate-200' },
};

export function MyTasksView() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<Task['status']>('todo');
  const { tasks, setTasks, projects, setProjects, selectedProjectId, setSelectedProjectId, user } = useAppStore();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Task detail dialog
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  /* Filter tasks assigned to current member */
  const myTasks = tasks.filter((t) => t.assigneeId === user?.teamMemberId);
  const filteredTasks = selectedProjectId
    ? myTasks.filter((t) => t.projectId === selectedProjectId)
    : myTasks;

  const currentProject = projects.find((p) => p.id === selectedProjectId);

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
        className: 'text-red-600 font-bold',
        overdue: true,
      };
    }
    if (daysRemaining === 0) {
      return {
        text: 'Hạn hôm nay!',
        className: 'text-orange-600 font-semibold',
        overdue: false,
      };
    }
    if (daysRemaining <= 3) {
      return {
        text: `Còn ${daysRemaining} ngày`,
        className: 'text-amber-600',
        overdue: false,
      };
    }
    return {
      text: `Còn ${daysRemaining} ngày`,
      className: 'text-muted-foreground',
      overdue: false,
    };
  }

  /* Request review: the API also creates a durable notification for the task's Leader. */
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

  function openTaskDetail(task: Task) {
    setDetailTask(task);
    setDetailOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {currentProject ? currentProject.name : 'Công việc của tôi'}
          </h1>
          <p className="text-muted-foreground">
            {filteredTasks.length} công việc được giao
          </p>
        </div>
        <Select
          value={selectedProjectId || 'all'}
          onValueChange={(v) => setSelectedProjectId(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Lọc theo dự án" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả dự án</SelectItem>
            {projects.filter((p) => p.status === 'active').map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile tab navigation */}
      {isMobile && (
        <div className="flex gap-1 overflow-x-auto pb-2 shrink-0 -mx-1 px-1">
          {columns.map((col) => {
            const count = filteredTasks.filter((t) => t.status === col.id).length;
            return (
              <button
                key={col.id}
                onClick={() => setMobileTab(col.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  mobileTab === col.id
                    ? cn(col.bgColor, col.color, 'shadow-sm')
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {col.label}
                <span className={cn(
                  'h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  mobileTab === col.id ? 'bg-white/80' : 'bg-muted'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Kanban Board - Desktop: all columns, Mobile: single column */}
      <div className="flex-1 overflow-x-auto">
        <div className={cn(
          'flex gap-4 h-full pb-4',
          !isMobile && 'min-w-max'
        )}>
          {(isMobile ? columns.filter(c => c.id === mobileTab) : columns).map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.id);
            return (
              <div
                key={column.id}
                className={cn(
                  'flex-shrink-0 flex flex-col rounded-xl p-3',
                  isMobile ? 'w-full flex-1' : 'w-80',
                  column.bgColor
                )}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={cn('text-sm font-semibold', column.color)}>
                    {column.label}
                  </h3>
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {columnTasks.length}
                  </Badge>
                </div>

                {/* Task cards */}
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-2">
                    {columnTasks.map((task) => {
                      const project = task.project;
                      const priority = priorityConfig[task.priority];
                      const deadlineInfo = task.dueDate ? getDeadlineInfo(task.dueDate) : null;
                      const hasLinks = task.links && task.links.length > 0;
                      const colIdx = getColumnIndex(task.status);
                      const canMoveLeft = colIdx > 0;
                      const canMoveRight = colIdx < columns.length - 1;
                      const isMoving = movingId === task.id;
                      const isReviewing = reviewingId === task.id;
                      const isInProgress = task.status === 'in_progress';

                      return (
                        <Card
                          key={task.id}
                          className={cn(
                            'cursor-pointer hover:shadow-md transition-all',
                            deadlineInfo?.overdue && 'border-l-4 border-l-red-500'
                          )}
                          onClick={() => openTaskDetail(task)}
                        >
                          <CardContent className="p-3 space-y-2">
                            {/* Priority & project */}
                            <div className="flex items-center justify-between">
                              <Badge className={cn('text-[10px] px-1.5 py-0', priority?.className)}>
                                {priority?.label}
                              </Badge>
                              {!selectedProjectId && project && (
                                <div className="flex items-center gap-1">
                                  <div
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                    {project.name}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Title */}
                            <p className="text-sm font-medium leading-snug line-clamp-2">
                              {task.title}
                            </p>

                            {/* Link badges */}
                            {hasLinks && (
                              <div className="flex flex-wrap gap-1">
                                {task.links!.slice(0, 3).map((link) => {
                                  const config = linkTypeConfig[link.type] || linkTypeConfig.other;
                                  const LIcon = config.icon;
                                  return (
                                    <a
                                      key={link.id}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex"
                                    >
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-1.5 gap-0.5 hover:bg-accent cursor-pointer transition-colors"
                                      >
                                        <LIcon className={cn('h-3 w-3', config.color)} />
                                        {link.title}
                                      </Badge>
                                    </a>
                                  );
                                })}
                                {task.links!.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                    +{task.links!.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Deadline countdown */}
                            {deadlineInfo && (
                              <div className="flex items-center gap-1.5">
                                {deadlineInfo.overdue && (
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                                  </span>
                                )}
                                <Calendar className={cn('h-3.5 w-3.5 shrink-0', deadlineInfo.className)} />
                                <span className={cn('text-xs', deadlineInfo.className)}>
                                  {deadlineInfo.text}
                                </span>
                              </div>
                            )}

                            {/* Move arrows / Review button */}
                            <div className="flex items-center justify-between pt-1 border-t">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={!canMoveLeft || isMoving || isReviewing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStatus(task, 'left');
                                }}
                                title={canMoveLeft ? `Chuyển sang "${columns[colIdx - 1].label}"` : ''}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>

                              {isInProgress ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs gap-1.5"
                                  disabled={isReviewing}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestReview(task);
                                  }}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  {isReviewing ? 'Đang gửi...' : 'Yêu cầu review'}
                                </Button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  {isMoving ? 'Đang chuyển...' : 'Di chuyển'}
                                </span>
                              )}

                              {!isInProgress && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={!canMoveRight || isMoving || isReviewing}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveStatus(task, 'right');
                                  }}
                                  title={canMoveRight ? `Chuyển sang "${columns[colIdx + 1].label}"` : ''}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              )}
                              {isInProgress && (
                                <div className="w-7" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {columnTasks.length === 0 && (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/60">
                        Không có công việc
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Dialog (Member view - read only links) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
          {detailTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg pr-4">{detailTask.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Meta info */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn('text-xs', priorityConfig[detailTask.priority]?.className)}>
                    {priorityConfig[detailTask.priority]?.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {columns.find(c => c.id === detailTask.status)?.label}
                  </Badge>
                  {detailTask.dueDate && (
                    <Badge variant="outline" className={cn('text-xs', detailTask.dueDate && new Date(detailTask.dueDate) < new Date() ? 'text-red-600 border-red-300' : '')}>
                      <Calendar className="mr-1 h-3 w-3" />
                      {detailTask.dueDate && getDeadlineInfo(detailTask.dueDate).text}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {detailTask.description && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Mô tả</Label>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                      {detailTask.description}
                    </p>
                  </div>
                )}

                {/* Project */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Dự án</Label>
                  {detailTask.project && (
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-6 rounded-full" style={{ backgroundColor: detailTask.project.color }} />
                      <span className="text-sm font-medium">{detailTask.project.name}</span>
                    </div>
                  )}
                </div>

                {/* Google Docs/Sheets/Slides Links - Prominent section */}
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">
                    📎 Tài liệu đính kèm ({detailTask.links?.length || 0})
                  </Label>

                  {detailTask.links && detailTask.links.length > 0 ? (
                    <div className="space-y-2">
                      {detailTask.links.map((link) => {
                        const config = linkTypeConfig[link.type] || linkTypeConfig.other;
                        const LinkIconComp = config.icon;
                        return (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'flex items-center gap-3 rounded-lg border p-3 group/link hover:shadow-sm transition-all',
                              config.bg
                            )}
                          >
                            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center bg-white shadow-sm', config.color)}>
                              <LinkIconComp className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{link.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/link:opacity-100 opacity-50 transition-opacity" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 text-center border border-dashed rounded-lg">
                      <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Chưa có tài liệu đính kèm</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Admin sẽ thêm Google Doc, Sheet hoặc Slide khi cần
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
