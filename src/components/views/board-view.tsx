'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Task, TeamMember, Project } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { getProjectDisplayName } from '@/lib/project-name';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  FileText,
  Table2,
  Presentation,
  FileQuestion,
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  Pencil,
  Calendar,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureApiSuccess, readApiJson } from '@/lib/client-api';
import { format, isPast, isToday, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const columns: { id: Task['status']; label: string; color: string; bgColor: string }[] = [
  { id: 'todo', label: 'Cần làm', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'in_progress', label: 'Đang làm', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { id: 'review', label: 'Xem xét', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { id: 'done', label: 'Hoàn thành', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
];

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'bg-slate-100 text-slate-700' },
  medium: { label: 'TB', className: 'bg-amber-100 text-amber-700' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Gấp', className: 'bg-red-100 text-red-700' },
};

const linkTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  google_doc: { label: 'Google Doc', icon: FileText, color: 'text-blue-600' },
  google_sheet: { label: 'Google Sheet', icon: Table2, color: 'text-emerald-600' },
  google_slide: { label: 'Google Slides', icon: Presentation, color: 'text-orange-600' },
  google_form: { label: 'Google Form', icon: FileQuestion, color: 'text-violet-600' },
  other: { label: 'Liên kết', icon: LinkIcon, color: 'text-slate-600' },
};

type ProjectAssignee = Pick<TeamMember, 'id' | 'name' | 'email' | 'color'>;

export function BoardView() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<Task['status']>('todo');
  const {
    tasks, setTasks,
    projects, setProjects,
    selectedProjectId,
  } = useAppStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  // Link form state
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<'google_doc' | 'google_sheet' | 'google_slide' | 'google_form' | 'other'>('google_doc');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

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
    if (!projectId) {
      return;
    }
    setLoadingProjectAssignees(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, { cache: 'no-store' });
      const data = await readApiJson<{
        members: Array<{
          status: string;
          user: { teamMemberId?: string | null; name: string; email: string; color: string };
        }>;
      }>(response, 'Không thể tải thành viên dự án');
      setProjectAssignees(
        (data.members || []).flatMap((membership) =>
          membership.status === 'approved' && membership.user.teamMemberId
            ? [{
                id: membership.user.teamMemberId,
                name: membership.user.name,
                email: membership.user.email,
                color: membership.user.color,
              }]
            : []
        )
      );
    } catch (error) {
      setProjectAssignees([]);
      toast.error(error instanceof Error ? error.message : 'Không thể tải thành viên dự án');
    } finally {
      setLoadingProjectAssignees(false);
    }
  }, []);

  useEffect(() => {
    if (!dialogOpen || !formProjectId) return;
    void Promise.resolve().then(() => fetchProjectAssignees(formProjectId));
  }, [dialogOpen, formProjectId, fetchProjectAssignees]);

  function openCreateDialog(status?: Task['status']) {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormStatus(status || 'todo');
    setFormPriority('medium');
    setFormProjectId(projects.find((project) => project.id === selectedProjectId && project.status === 'active')?.id || '');
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
      setDetailOpen(false);
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

  // Link handlers
  async function handleAddLink() {
    if (!detailTask || !linkUrl.trim()) return;
    try {
      const response = await fetch(`/api/tasks/${detailTask.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: linkTitle.trim() || linkTypeConfig[linkType].label,
          url: linkUrl,
          type: linkType,
        }),
      });
      await ensureApiSuccess(response, 'Không thể thêm liên kết');
      toast.success('Đã thêm liên kết');
      setLinkTitle('');
      setLinkUrl('');
      setLinkDialogOpen(false);
      await fetchTasks();
      // Refresh detail task
      const res = await fetch(`/api/tasks/${detailTask.id}`);
      const updated = await readApiJson<Task>(res, 'Không thể tải chi tiết công việc');
      setDetailTask(updated);
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  }

  async function handleDeleteLink(linkId: string) {
    if (!detailTask) return;
    try {
      const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      await ensureApiSuccess(response, 'Không thể xóa liên kết');
      toast.success('Đã xóa liên kết');
      await fetchTasks();
      const res = await fetch(`/api/tasks/${detailTask.id}`);
      const updated = await readApiJson<Task>(res, 'Không thể tải chi tiết công việc');
      setDetailTask(updated);
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  }

  function openTaskDetail(task: Task) {
    setDetailTask(task);
    setDetailOpen(true);
  }

  function getDueDateInfo(dateStr: string) {
    const date = new Date(dateStr);
    if (isToday(date)) return { text: 'Hôm nay', className: 'text-amber-600' };
    if (isPast(date)) return { text: 'Đã quá hạn', className: 'text-red-600' };
    if (date <= addDays(new Date(), 3)) return { text: format(date, 'dd/MM', { locale: vi }), className: 'text-orange-600' };
    return { text: format(date, 'dd/MM', { locale: vi }), className: 'text-muted-foreground' };
  }

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {currentProject ? getProjectDisplayName(currentProject.name) : 'Bảng công việc'}
          </h1>
          <p className="text-muted-foreground">
            {currentProject ? currentProject.description : 'Tất cả công việc của nhóm'}
          </p>
        </div>
        <Button onClick={() => openCreateDialog('todo')}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm việc
        </Button>
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className={cn('text-sm font-semibold', column.color)}>
                      {column.label}
                    </h3>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openCreateDialog(column.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Task cards */}
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-2">
                    {columnTasks.map((task) => {
                      const assignee = task.assignee;
                      const project = task.project;
                      const priority = priorityConfig[task.priority];
                      const dueInfo = task.dueDate ? getDueDateInfo(task.dueDate) : null;
                      const hasLinks = task.links && task.links.length > 0;

                      return (
                        <Card
                          key={task.id}
                          className="cursor-pointer hover:shadow-md transition-all group"
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
                                    {getProjectDisplayName(project.name)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Title */}
                            <p className="text-sm font-medium leading-snug line-clamp-2">
                              {task.title}
                            </p>

                            {/* Description preview */}
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}

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

                            {/* Bottom row */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2">
                                {dueInfo && (
                                  <span className={cn('text-[10px] flex items-center gap-0.5', dueInfo.className)}>
                                    <Calendar className="h-3 w-3" />
                                    {dueInfo.text}
                                  </span>
                                )}
                                {hasLinks && (
                                  <LinkIcon className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              {assignee && (
                                <div
                                  className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
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
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/60">
                        Kéo việc vào đây
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
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
                <Select value={formProjectId} onValueChange={(projectId) => {
                  setFormProjectId(projectId);
                  setFormAssigneeId('');
                  setProjectAssignees([]);
                }}>
                  <SelectTrigger><SelectValue placeholder="Chọn dự án" /></SelectTrigger>
                  <SelectContent>
                    {projects.filter((project) => project.status === 'active' || project.id === formProjectId).map((p) => (
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
                {!formProjectId ? (
                  <p className="text-xs text-muted-foreground">Chọn dự án trước khi giao việc.</p>
                ) : loadingProjectAssignees ? (
                  <p className="text-xs text-muted-foreground">Đang tải thành viên dự án...</p>
                ) : projectAssignees.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Dự án chưa có Member được duyệt.</p>
                ) : null}
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

      {/* Task Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
          {detailTask && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-lg pr-4">{detailTask.title}</DialogTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setDetailOpen(false);
                        openEditDialog(detailTask);
                      }}>
                        <Pencil className="mr-2 h-4 w-4" />Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteTask(detailTask.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="mr-1 h-3 w-3" />
                      {getDueDateInfo(detailTask.dueDate).text}
                    </Badge>
                  )}
                </div>

                {/* Status quick change */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Chuyển trạng thái</Label>
                  <div className="flex flex-wrap gap-2">
                    {columns.map((col) => (
                      <Button
                        key={col.id}
                        size="sm"
                        variant={detailTask.status === col.id ? 'default' : 'outline'}
                        className="text-xs h-7"
                        onClick={() => {
                          handleStatusChange(detailTask.id, col.id);
                          setDetailTask({ ...detailTask, status: col.id });
                        }}
                      >
                        {col.label}
                      </Button>
                    ))}
                  </div>
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

                {/* Project & Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Dự án</Label>
                    {detailTask.project && (
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-6 rounded-full" style={{ backgroundColor: detailTask.project.color }} />
                        <span className="text-sm font-medium">{getProjectDisplayName(detailTask.project.name)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Người thực hiện</Label>
                    {detailTask.assignee ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: detailTask.assignee.color }}
                        >
                          {detailTask.assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{detailTask.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Chưa gán</span>
                    )}
                  </div>
                </div>

                {/* Google Docs & Sheets Links */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Tài liệu đính kèm ({detailTask.links?.length || 0})
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setLinkDialogOpen(true)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Thêm
                    </Button>
                  </div>

                  {detailTask.links && detailTask.links.length > 0 ? (
                    <div className="space-y-2">
                      {detailTask.links.map((link) => {
                        const config = linkTypeConfig[link.type];
                        const LinkIconComp = config.icon;
                        return (
                          <div
                            key={link.id}
                            className="flex items-center gap-3 rounded-lg border p-3 group/link"
                          >
                            <LinkIconComp className={cn('h-5 w-5 shrink-0', config.color)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{link.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                            </div>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 opacity-100 md:opacity-0 md:group-hover/link:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => handleDeleteLink(link.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 text-center border border-dashed rounded-lg">
                      <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Chưa có tài liệu đính kèm</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Thêm Google Doc hoặc Google Sheet cho công việc này
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm tài liệu đính kèm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Loại tài liệu</Label>
              <Select value={linkType} onValueChange={(v) => setLinkType(v as 'google_doc' | 'google_sheet' | 'google_slide' | 'google_form' | 'other')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_doc">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Google Doc
                    </div>
                  </SelectItem>
                  <SelectItem value="google_sheet">
                    <div className="flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-emerald-600" />
                      Google Sheet
                    </div>
                  </SelectItem>
                  <SelectItem value="google_slide">
                    <div className="flex items-center gap-2">
                      <Presentation className="h-4 w-4 text-orange-600" />
                      Google Slides
                    </div>
                  </SelectItem>
                  <SelectItem value="google_form">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-4 w-4 text-violet-600" />
                      Google Form
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Liên kết khác
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tên tài liệu</Label>
              <Input
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Ví dụ: Báo cáo tiến độ tuần 3"
              />
            </div>
            <div className="space-y-2">
              <Label>Đường dẫn (URL) *</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
              />
              <p className="text-xs text-muted-foreground">
                Dán URL của Google Doc, Google Sheet hoặc bất kỳ liên kết nào
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button onClick={handleAddLink} disabled={!linkUrl.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
