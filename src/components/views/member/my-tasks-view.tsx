'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Task } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const linkTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  google_doc: { icon: FileText, color: 'text-blue-600', label: 'Doc' },
  google_sheet: { icon: Table2, color: 'text-emerald-600', label: 'Sheet' },
  google_slide: { icon: Presentation, color: 'text-orange-600', label: 'Slide' },
  google_form: { icon: FileQuestion, color: 'text-violet-600', label: 'Form' },
  other: { icon: LinkIcon, color: 'text-slate-600', label: 'Link' },
};

export function MyTasksView() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<Task['status']>('todo');
  const { tasks, setTasks, projects, setProjects, selectedProjectId, setSelectedProjectId, user } = useAppStore();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedProjectId) params.set('projectId', selectedProjectId);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    const data = await res.json();
    setTasks(data);
  }, [selectedProjectId, setTasks]);

  useEffect(() => {
    fetchTasks();
    fetch('/api/projects').then((r) => r.json()).then(setProjects);
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
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Đã chuyển sang "${columns[newIdx].label}"`);
      fetchTasks();
    } catch {
      toast.error('Không thể cập nhật trạng thái');
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

  /* Request review: change task status to 'review' and notify admin */
  async function handleRequestReview(task: Task) {
    setReviewingId(task.id);
    try {
      /* Change task status to review */
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'review' }),
      });

      /* Find admin user to send notification */
      try {
        const membersRes = await fetch('/api/members');
        const members = await membersRes.json();
        const adminMember = members.find((m: { role: string }) => m.role === 'admin');
        if (adminMember) {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Yêu cầu review',
              message: `${user?.name || 'Thành viên'} đã hoàn thành và yêu cầu review công việc "${task.title}"`,
              type: 'task_completed',
              userId: adminMember.id,
            }),
          });
        }
      } catch {
        /* Notification fail is non-critical */
      }

      toast.success('Đã gửi yêu cầu review cho Admin');
      fetchTasks();
    } catch {
      toast.error('Không thể gửi yêu cầu review');
    } finally {
      setReviewingId(null);
    }
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
                            'hover:shadow-md transition-all',
                            deadlineInfo?.overdue && 'border-l-4 border-l-red-500'
                          )}
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
                                {task.links!.map((link) => {
                                  const config = linkTypeConfig[link.type] || linkTypeConfig.other;
                                  const LIcon = config.icon;
                                  return (
                                    <Badge
                                      key={link.id}
                                      variant="outline"
                                      className="text-[10px] h-5 px-1.5 gap-0.5"
                                    >
                                      <LIcon className={cn('h-3 w-3', config.color)} />
                                      {link.title}
                                    </Badge>
                                  );
                                })}
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
    </div>
  );
}
