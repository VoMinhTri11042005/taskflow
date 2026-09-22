'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Task, TeamMember, Project } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { getProjectDisplayName } from '@/lib/project-name';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskTableView } from '@/components/tasks/task-table-view';
import { TaskCalendarView } from '@/components/tasks/task-calendar-view';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  Link as LinkIcon,
  Trash2,
  Pencil,
  Calendar,
  LayoutGrid,
  Table as TableIcon,
  CalendarDays,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureApiSuccess, readApiJson } from '@/lib/client-api';
import { format, isPast, isToday, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const columns: { id: Task['status']; label: string; color: string; bgColor: string; dotColor: string }[] = [
  { id: 'todo', label: 'Cần làm', color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100/70 dark:bg-slate-900/40', dotColor: 'bg-slate-400' },
  { id: 'in_progress', label: 'Đang làm', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50/70 dark:bg-amber-950/20', dotColor: 'bg-amber-500' },
  { id: 'review', label: 'Xem xét', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50/70 dark:bg-violet-950/20', dotColor: 'bg-violet-500' },
  { id: 'done', label: 'Hoàn thành', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50/70 dark:bg-emerald-950/20', dotColor: 'bg-emerald-500' },
];

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  medium: { label: 'Trung bình', className: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
  high: { label: 'Cao', className: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300' },
  urgent: { label: 'Khẩn cấp', className: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold' },
};

type ProjectAssignee = Pick<TeamMember, 'id' | 'name' | 'email' | 'color'>;

export function BoardView() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<Task['status']>('todo');
  const {
    tasks, setTasks,
    projects, setProjects,
    selectedProjectId,
    boardViewMode, setBoardViewMode,
    openTaskDetail,
    searchQuery, setSearchQuery,
  } = useAppStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filters
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<Task['status']>('todo');
  const [formPriority, setFormPriority] = useState<Task['priority']>('medium');
  const [formProjectId, setFormProjectId] = useState('');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [projectAssignees, setProjectAssignees] = useState<ProjectAssignee[]>([]);
  const [loadingProjectAssignees, setLoadingProjectAssignees] = useState(false);

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

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

  const fetchProjectAssignees = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoadingProjectAssignees(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, { cache: 'no-store' });
      const data = await readApiJson<{
        members: Array<{ member: ProjectAssignee }>;
      }>(response, 'Không thể tải thành viên dự án');
      setProjectAssignees(data.members.map((item) => item.member));
    } catch {
      setProjectAssignees([]);
    } finally {
      setLoadingProjectAssignees(false);
    }
  }, []);

  useEffect(() => {
    if (formProjectId) {
      void fetchProjectAssignees(formProjectId);
    } else {
      setProjectAssignees([]);
    }
  }, [formProjectId, fetchProjectAssignees]);

  function openCreateDialog(status: Task['status'] = 'todo') {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormStatus(status);
    setFormPriority('medium');
    setFormProjectId(selectedProjectId || (projects[0]?.id ?? ''));
    setFormAssigneeId('');
    setFormDueDate('');
    setProjectAssignees([]);
    setDialogOpen(true);
  }

  function openEditDialog(task: Task) {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormStatus(task.status);
    setFormPriority(task.priority);
    setFormProjectId(task.projectId);
    setFormAssigneeId(task.assigneeId || '');
    setFormDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
    setProjectAssignees([]);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formProjectId) return;
    try {
      const body: Record<string, unknown> = {
        title: formTitle,
        description: formDesc || null,
        status: formStatus,
        priority: formPriority,
        projectId: formProjectId,
        assigneeId: formAssigneeId || null,
        dueDate: formDueDate ? new Date(formDueDate).toISOString() : null,
      };

      if (editingTask) {
        const response = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        await ensureApiSuccess(response, 'Không thể cập nhật công việc');
        toast.success('Đã cập nhật công việc');
      } else {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        await ensureApiSuccess(response, 'Không thể tạo công việc');
        toast.success('Đã tạo công việc mới');
      }
      setDialogOpen(false);
      await fetchTasks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      await ensureApiSuccess(response, 'Không thể xóa công việc');
      toast.success('Đã xóa công việc');
      await fetchTasks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  }

  async function handleStatusChange(taskId: string, newStatus: Task['status']) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await ensureApiSuccess(response, 'Không thể cập nhật trạng thái');
      await fetchTasks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái');
    }
  }

  function getDueDateInfo(dateStr: string) {
    const date = new Date(dateStr);
    if (isToday(date)) return { text: 'Hôm nay', className: 'text-amber-600 dark:text-amber-400 font-medium' };
    if (isPast(date)) return { text: 'Quá hạn', className: 'text-rose-600 dark:text-rose-400 font-medium' };
    if (date <= addDays(new Date(), 3)) return { text: format(date, 'dd/MM', { locale: vi }), className: 'text-orange-600 dark:text-orange-400' };
    return { text: format(date, 'dd/MM', { locale: vi }), className: 'text-muted-foreground' };
  }

  // Filtered tasks calculation
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedProjectId && t.projectId !== selectedProjectId) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned' && t.assigneeId) return false;
        if (filterAssignee !== 'unassigned' && t.assigneeId !== filterAssignee) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description ? t.description.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [tasks, selectedProjectId, filterPriority, filterAssignee, searchQuery]);

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  // Extract all unique assignees from tasks for filter
  const allAssignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach((t) => {
      if (t.assignee) {
        map.set(t.assignee.id, { id: t.assignee.id, name: t.assignee.name });
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/40 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
              {currentProject ? getProjectDisplayName(currentProject.name) : 'Bảng công việc'}
            </h1>
            <Badge variant="outline" className="text-xs h-5 px-2 bg-muted/40 font-mono">
              {filteredTasks.length} việc
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {currentProject ? currentProject.description : 'Quản lý và cộng tác toàn bộ tác vụ của nhóm'}
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

          <Button
            onClick={() => openCreateDialog('todo')}
            className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm việc</span>
          </Button>
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
              placeholder="Tìm công việc..."
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

          {/* Priority filter */}
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 text-xs w-[125px] bg-muted/20 border-border/60">
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

          {/* Assignee filter */}
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="h-8 text-xs w-[135px] bg-muted/20 border-border/60">
              <SelectValue placeholder="Người làm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả người làm</SelectItem>
              <SelectItem value="unassigned">Chưa gán</SelectItem>
              {allAssignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filterPriority !== 'all' || filterAssignee !== 'all' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterPriority('all');
                setFilterAssignee('all');
                setSearchQuery('');
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-0">
        {boardViewMode === 'table' ? (
          <TaskTableView tasks={filteredTasks} />
        ) : boardViewMode === 'calendar' ? (
          <TaskCalendarView tasks={filteredTasks} onTaskClick={(task) => openTaskDetail(task)} />
        ) : (
          /* Kanban Board */
          <div className="flex flex-col h-full">
            {/* Mobile Tab Pills */}
            {isMobile && (
              <div className="flex gap-1 overflow-x-auto pb-2 shrink-0">
                {columns.map((col) => {
                  const count = filteredTasks.filter((t) => t.status === col.id).length;
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
                  const columnTasks = filteredTasks.filter((t) => t.status === column.id);
                  return (
                    <div
                      key={column.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedTaskId) {
                          void handleStatusChange(draggedTaskId, column.id);
                          setDraggedTaskId(null);
                        }
                      }}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md hover:bg-background/80"
                          onClick={() => openCreateDialog(column.id)}
                          title="Thêm nhanh"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Task cards list */}
                      <ScrollArea className="flex-1">
                        <div className="space-y-2.5 pr-1 pb-2">
                          {columnTasks.map((task) => {
                            const assignee = task.assignee;
                            const project = task.project;
                            const priority = priorityConfig[task.priority];
                            const dueInfo = task.dueDate ? getDueDateInfo(task.dueDate) : null;
                            const hasLinks = task.links && task.links.length > 0;

                            return (
                              <Card
                                key={task.id}
                                draggable
                                onDragStart={() => setDraggedTaskId(task.id)}
                                onClick={() => openTaskDetail(task)}
                                className={cn(
                                  'cursor-pointer bg-card/95 hover:bg-card border-border/70 hover:border-primary/40 transition-all group',
                                  'shadow-2xs hover:shadow-md select-none rounded-xl active:scale-[0.99]'
                                )}
                              >
                                <CardContent className="p-3.5 space-y-2.5">
                                  {/* Priority & project */}
                                  <div className="flex items-center justify-between gap-1">
                                    <Badge className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium border-0', priority?.className)}>
                                      {priority?.label}
                                    </Badge>
                                    {!selectedProjectId && project && (
                                      <div className="flex items-center gap-1.5 max-w-[130px]">
                                        <div
                                          className="h-2 w-2 rounded-full shrink-0"
                                          style={{ backgroundColor: project.color }}
                                        />
                                        <span className="text-[11px] text-muted-foreground font-medium truncate">
                                          {getProjectDisplayName(project.name)}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Title */}
                                  <h4 className="text-xs font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                    {task.title}
                                  </h4>

                                  {/* Footer: Due date, links & Assignee */}
                                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                    <div className="flex items-center gap-2">
                                      {dueInfo && (
                                        <span className={cn('text-[11px] flex items-center gap-1', dueInfo.className)}>
                                          <Calendar className="h-3 w-3" />
                                          {dueInfo.text}
                                        </span>
                                      )}
                                      {hasLinks && (
                                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                                          <LinkIcon className="h-2.5 w-2.5" />
                                          {task.links?.length}
                                        </span>
                                      )}
                                    </div>

                                    {assignee && (
                                      <div
                                        className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs"
                                        style={{ backgroundColor: assignee.color }}
                                        title={assignee.name}
                                      >
                                        {assignee.name.charAt(0).toUpperCase()}
                                      </div>
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

      {/* Create/Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tiêu đề *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Nhập tiêu đề công việc..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Mô tả chi tiết..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as Task['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ưu tiên</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Task['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Thấp</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                    <SelectItem value="urgent">Khẩn cấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dự án</Label>
                <Select
                  value={formProjectId}
                  onValueChange={(projectId) => {
                    setFormProjectId(projectId);
                    setFormAssigneeId('');
                    setProjectAssignees([]);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Chọn dự án" /></SelectTrigger>
                  <SelectContent>
                    {projects
                      .filter((project) => project.status === 'active' || project.id === formProjectId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Người thực hiện</Label>
                <Select
                  value={formAssigneeId || '__unassigned__'}
                  onValueChange={(value) => setFormAssigneeId(value === '__unassigned__' ? '' : value)}
                  disabled={!formProjectId || loadingProjectAssignees}
                >
                  <SelectTrigger><SelectValue placeholder="Chưa gán" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Chưa gán</SelectItem>
                    {projectAssignees.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hạn chót</Label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!formTitle.trim() || !formProjectId}>
              {editingTask ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
