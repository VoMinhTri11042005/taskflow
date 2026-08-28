'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Task } from '@/types';
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
  Link as LinkIcon,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

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

const linkTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  google_doc: { icon: FileText, color: 'text-blue-600' },
  google_sheet: { icon: Table2, color: 'text-emerald-600' },
  other: { icon: LinkIcon, color: 'text-slate-600' },
};

export function MyTasksView() {
  const { tasks, setTasks, projects, setProjects, selectedProjectId, setSelectedProjectId, user } = useAppStore();
  const [movingId, setMovingId] = useState<string | null>(null);

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

  function getDueDateInfo(dateStr: string) {
    const date = new Date(dateStr);
    if (isToday(date)) return { text: 'Hôm nay', className: 'text-amber-600' };
    if (isPast(date)) return { text: 'Đã quá hạn', className: 'text-red-600' };
    if (date <= addDays(new Date(), 3)) return { text: format(date, 'dd/MM', { locale: vi }), className: 'text-orange-600' };
    return { text: format(date, 'dd/MM', { locale: vi }), className: 'text-muted-foreground' };
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
          <SelectTrigger className="w-[200px]">
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

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.id);
            return (
              <div
                key={column.id}
                className={cn(
                  'flex-shrink-0 w-80 flex flex-col rounded-xl p-3',
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
                      const dueInfo = task.dueDate ? getDueDateInfo(task.dueDate) : null;
                      const hasLinks = task.links && task.links.length > 0;
                      const colIdx = getColumnIndex(task.status);
                      const canMoveLeft = colIdx > 0;
                      const canMoveRight = colIdx < columns.length - 1;
                      const isMoving = movingId === task.id;

                      return (
                        <Card
                          key={task.id}
                          className="hover:shadow-md transition-all"
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
                                  const config = linkTypeConfig[link.type];
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

                            {/* Bottom row with due date */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2">
                                {dueInfo && (
                                  <span className={cn('text-[10px] flex items-center gap-0.5', dueInfo.className)}>
                                    <Calendar className="h-3 w-3" />
                                    {dueInfo.text}
                                  </span>
                                )}
                                {!hasLinks && (
                                  <span className="text-[10px] text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Move arrows */}
                            <div className="flex items-center justify-between pt-1 border-t">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={!canMoveLeft || isMoving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStatus(task, 'left');
                                }}
                                title={canMoveLeft ? `Chuyển sang "${columns[colIdx - 1].label}"` : ''}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-[10px] text-muted-foreground">
                                {isMoving ? 'Đang chuyển...' : 'Di chuyển'}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={!canMoveRight || isMoving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStatus(task, 'right');
                                }}
                                title={canMoveRight ? `Chuyển sang "${columns[colIdx + 1].label}"` : ''}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
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
