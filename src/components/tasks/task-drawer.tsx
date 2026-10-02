'use client';

import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  ExternalLink,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Flag,
  Globe,
  ListChecks,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Presentation,
  Send,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/app-store';
import type { Task, TaskChecklistItem } from '@/types';
import { readApiJson } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusConfig = {
  todo: { label: 'Cần làm', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  in_progress: { label: 'Đang làm', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  review: { label: 'Chờ xem xét', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  done: { label: 'Hoàn thành', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
} as const;

const priorityOptions = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn cấp' },
] as const;

const reviewLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'Đang chờ Leader duyệt', className: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200' },
  approved: { label: 'Đã được Leader duyệt', className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' },
  changes_requested: { label: 'Cần cập nhật thêm', className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200' },
};

type ProjectAssignee = { id: string; name: string; email: string; color: string };

type ProjectMembersResponse = {
  members: Array<{
    status: string;
    user: { name: string; email: string; color: string; teamMemberId?: string | null };
  }>;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    created: 'đã tạo công việc',
    updated: 'đã cập nhật thông tin',
    status_changed: 'đã đổi trạng thái',
    progress_updated: 'đã cập nhật tiến độ',
    review_requested: 'đã gửi yêu cầu xem xét',
    review_approved: 'đã duyệt hoàn thành',
    review_changes_requested: 'đã yêu cầu cập nhật thêm',
    review_note_updated: 'đã cập nhật ghi chú',
    comment_added: 'đã để lại bình luận',
    comment_created: 'đã để lại bình luận',
    checklist_item_added: 'đã thêm mục checklist',
    checklist_item_created: 'đã thêm mục checklist',
    checklist_item_renamed: 'đã đổi tên một mục checklist',
    checklist_item_completed: 'đã hoàn thành một mục checklist',
    checklist_item_reopened: 'đã mở lại một mục checklist',
    checklist_item_deleted: 'đã xóa một mục checklist',
  };
  return labels[action] || 'đã cập nhật công việc';
}

export function TaskDrawer() {
  const {
    selectedTask,
    taskDrawerOpen,
    closeTaskDetail,
    tasks,
    setTasks,
    user,
  } = useAppStore();

  const [detailTask, setDetailTask] = React.useState<Task | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [checklistBusyId, setChecklistBusyId] = React.useState<string | null>(null);
  const [newChecklistItem, setNewChecklistItem] = React.useState('');
  const [addingChecklist, setAddingChecklist] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [sendingComment, setSendingComment] = React.useState(false);
  const [newLinkTitle, setNewLinkTitle] = React.useState('');
  const [newLinkUrl, setNewLinkUrl] = React.useState('');
  const [newLinkType, setNewLinkType] = React.useState('google_doc');
  const [addingLink, setAddingLink] = React.useState(false);
  const [projectAssignees, setProjectAssignees] = React.useState<ProjectAssignee[]>([]);
  const [assigneesProjectId, setAssigneesProjectId] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<Task['status']>('todo');
  const [priority, setPriority] = React.useState<Task['priority']>('medium');
  const [storyPoints, setStoryPoints] = React.useState('1');
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null);
  const [dueDate, setDueDate] = React.useState('');
  const [reviewNotes, setReviewNotes] = React.useState('');

  const selectedTaskId = selectedTask?.id;
  const task = detailTask?.id === selectedTaskId ? detailTask : selectedTask;
  const detailLoading = Boolean(taskDrawerOpen && selectedTaskId && detailTask?.id !== selectedTaskId);
  const canManage = user?.role === 'leader';
  const isMember = user?.role === 'member';
  const canContribute = Boolean(user && user.role !== 'admin');

  const hydrateForm = React.useCallback((nextTask: Task) => {
    setTitle(nextTask.title || '');
    setDescription(nextTask.description || '');
    setStatus(nextTask.status || 'todo');
    setPriority(nextTask.priority || 'medium');
    setStoryPoints(String(nextTask.storyPoints || 1));
    setAssigneeId(nextTask.assigneeId || null);
    setDueDate(nextTask.dueDate ? format(new Date(nextTask.dueDate), 'yyyy-MM-dd') : '');
    setReviewNotes(nextTask.reviewNotes || '');
  }, []);

  const replaceTask = React.useCallback((nextTask: Task) => {
    setDetailTask(nextTask);
    setTasks(tasks.map((item) => (item.id === nextTask.id ? { ...item, ...nextTask } : item)));
    hydrateForm(nextTask);
  }, [hydrateForm, setTasks, tasks]);

  const loadTaskDetails = React.useCallback(async () => {
    if (!selectedTaskId) return null;
    const response = await fetch(`/api/tasks/${selectedTaskId}`, { cache: 'no-store' });
    const nextTask = await readApiJson<Task>(response, 'Không thể tải chi tiết công việc');
    setDetailTask(nextTask);
    hydrateForm(nextTask);
    return nextTask;
  }, [hydrateForm, selectedTaskId]);

  React.useEffect(() => {
    if (!taskDrawerOpen || !selectedTask) return;

    let active = true;
    // Defer the optimistic form hydration. The task detail request remains the
    // source of truth while avoiding an unnecessary cascading render.
    queueMicrotask(() => {
      if (!active) return;
      setDetailTask(selectedTask);
      hydrateForm(selectedTask);
    });
    void fetch(`/api/tasks/${selectedTask.id}`, { cache: 'no-store' })
      .then((response) => readApiJson<Task>(response, 'Không thể tải chi tiết công việc'))
      .then((nextTask) => {
        if (!active) return;
        setDetailTask(nextTask);
        hydrateForm(nextTask);
      })
      .catch((error) => {
        if (active) toast.error(getErrorMessage(error, 'Không thể tải chi tiết công việc'));
      });

    return () => { active = false; };
  }, [hydrateForm, loadTaskDetails, selectedTask, taskDrawerOpen]);

  React.useEffect(() => {
    const projectId = task?.projectId;
    if (!canManage || !projectId) return;

    let active = true;
    void fetch(`/api/projects/${projectId}/members`, { cache: 'no-store' })
      .then((response) => readApiJson<ProjectMembersResponse>(response, 'Không thể tải thành viên dự án'))
      .then((data) => {
        if (!active) return;
        setAssigneesProjectId(projectId);
        setProjectAssignees(
          data.members
            .filter((item) => item.status === 'approved' && item.user.teamMemberId)
            .map((item) => ({
              id: item.user.teamMemberId as string,
              name: item.user.name,
              email: item.user.email,
              color: item.user.color,
            }))
        );
      })
      .catch(() => {
        if (!active) return;
        setAssigneesProjectId(projectId);
        setProjectAssignees([]);
      });

    return () => { active = false; };
  }, [canManage, task?.projectId]);

  if (!selectedTask || !task) return null;

  // Keep a stable, non-null ID for event handlers. React's closure analysis
  // cannot retain the render-time null guard for asynchronous callbacks.
  const taskId = task.id;
  const visibleProjectAssignees = canManage && assigneesProjectId === task.projectId
    ? projectAssignees
    : [];

  const checklist = task.checklist || [];
  const completedChecklistCount = checklist.filter((item) => item.isCompleted).length;
  const checklistPercent = checklist.length ? Math.round((completedChecklistCount / checklist.length) * 100) : 0;
  const review = task.reviewStatus ? reviewLabels[task.reviewStatus] : null;
  const selectableStatuses = canManage
    ? (Object.keys(statusConfig) as Task['status'][])
    : (['todo', 'in_progress', 'review'] as Task['status'][]);

  async function updateTask(payload: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const updated = await readApiJson<Task>(response, 'Không thể lưu thay đổi công việc');
      replaceTask(updated);
      toast.success(successMessage);
      return updated;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể lưu thay đổi công việc'));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {
      status,
      reviewNotes: reviewNotes.trim() || null,
    };

    if (canManage) {
      payload.title = title.trim();
      payload.description = description.trim() || null;
      payload.priority = priority;
      payload.storyPoints = Number(storyPoints) || 1;
      payload.assigneeId = assigneeId || null;
      payload.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
    }

    await updateTask(payload, 'Đã lưu thay đổi');
  }

  async function handleReviewDecision(approved: boolean) {
    await updateTask(
      { status: approved ? 'done' : 'in_progress', reviewNotes: reviewNotes.trim() || null },
      approved ? 'Đã duyệt hoàn thành công việc' : 'Đã gửi lại công việc để cập nhật'
    );
  }

  async function handleChecklistToggle(item: TaskChecklistItem, checked: boolean) {
    setChecklistBusyId(item.id);
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, isCompleted: checked }),
      });
      await readApiJson<unknown>(response, 'Không thể cập nhật checklist');
      await loadTaskDetails();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật checklist'));
    } finally {
      setChecklistBusyId(null);
    }
  }

  async function handleAddChecklist() {
    const itemTitle = newChecklistItem.trim();
    if (!itemTitle) return;
    setAddingChecklist(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: itemTitle }),
      });
      await readApiJson<unknown>(response, 'Không thể thêm checklist');
      setNewChecklistItem('');
      await loadTaskDetails();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể thêm checklist'));
    } finally {
      setAddingChecklist(false);
    }
  }

  async function handleDeleteChecklist(item: TaskChecklistItem) {
    setChecklistBusyId(item.id);
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      await readApiJson<unknown>(response, 'Không thể xóa checklist');
      await loadTaskDetails();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xóa checklist'));
    } finally {
      setChecklistBusyId(null);
    }
  }

  async function handleSendComment() {
    const content = commentDraft.trim();
    if (!content) return;
    setSendingComment(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      await readApiJson<unknown>(response, 'Không thể gửi bình luận');
      setCommentDraft('');
      await loadTaskDetails();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể gửi bình luận'));
    } finally {
      setSendingComment(false);
    }
  }

  async function handleAddLink() {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast.error('Vui lòng nhập tên và đường dẫn tài liệu');
      return;
    }
    setAddingLink(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newLinkTitle.trim(), url: newLinkUrl.trim(), type: newLinkType }),
      });
      await readApiJson<unknown>(response, 'Không thể thêm liên kết');
      setNewLinkTitle('');
      setNewLinkUrl('');
      await loadTaskDetails();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể thêm liên kết'));
    } finally {
      setAddingLink(false);
    }
  }

  async function handleDeleteLink(linkId: string) {
    try {
      const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      await readApiJson<unknown>(response, 'Không thể xóa liên kết');
      await loadTaskDetails();
      toast.success('Đã xóa liên kết');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xóa liên kết'));
    }
  }

  function linkIcon(type: string) {
    if (type === 'google_doc') return <FileText className="h-4 w-4 text-blue-600" />;
    if (type === 'google_sheet') return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
    if (type === 'google_slide') return <Presentation className="h-4 w-4 text-amber-600" />;
    if (type === 'google_form') return <FileQuestion className="h-4 w-4 text-violet-600" />;
    return <Globe className="h-4 w-4 text-muted-foreground" />;
  }

  const currentStatus = statusConfig[status];

  return (
    <Sheet open={taskDrawerOpen} onOpenChange={(open) => !open && closeTaskDetail()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-l border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl">
        <SheetHeader className="border-b border-border/50 bg-muted/15 px-4 py-4 text-left sm:px-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.project?.color || '#6366f1' }} />
            <span className="truncate">{task.project?.name || 'Chi tiết công việc'}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-foreground/80">Công việc</span>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <SheetTitle className="line-clamp-2 text-xl leading-tight tracking-tight sm:text-2xl">{task.title}</SheetTitle>
              <SheetDescription className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', currentStatus.className)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', currentStatus.dot)} />
                  {currentStatus.label}
                </span>
                {detailLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </SheetDescription>
            </div>
            {task.assignee && (
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-2.5 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: task.assignee.color }}>
                  {task.assignee.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-28 truncate text-xs font-medium">{task.assignee.name}</span>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-7 px-4 py-5 sm:px-6">
            {review && (
              <section className={cn('rounded-2xl border p-4', review.className)}>
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{review.label}</p>
                    <p className="mt-1 text-xs leading-relaxed opacity-80">
                      {canManage && task.reviewStatus === 'pending'
                        ? 'Kiểm tra kết quả, thêm phản hồi nếu cần rồi duyệt hoặc gửi lại cho thành viên.'
                        : 'Trạng thái xem xét và phản hồi được đồng bộ cho các thành viên liên quan.'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Thông tin công việc</label>
                {canManage && <span className="text-[11px] text-muted-foreground">Leader có thể chỉnh sửa toàn bộ</span>}
              </div>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={!canManage}
                className="h-11 border-border/60 bg-muted/20 text-base font-bold shadow-none focus-visible:bg-background"
                aria-label="Tiêu đề công việc"
              />
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={!canManage}
                rows={4}
                placeholder="Mô tả, mục tiêu và hướng dẫn thực hiện..."
                className="resize-none border-border/60 bg-muted/20 text-sm leading-relaxed shadow-none focus-visible:bg-background"
              />
            </section>

            <section className="grid grid-cols-1 gap-3 rounded-2xl border border-border/50 bg-muted/15 p-3 sm:grid-cols-2">
              <div className="rounded-xl bg-background/75 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Tiến độ</label>
                <Select value={status} onValueChange={(value) => setStatus(value as Task['status'])} disabled={!canContribute}>
                  <SelectTrigger className="h-9 border-border/60 bg-background text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectableStatuses.map((value) => <SelectItem key={value} value={value}>{statusConfig[value].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl bg-background/75 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Flag className="h-3.5 w-3.5 text-rose-500" /> Ưu tiên</label>
                <Select value={priority} onValueChange={(value) => setPriority(value as Task['priority'])} disabled={!canManage}>
                  <SelectTrigger className="h-9 border-border/60 bg-background text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl bg-background/75 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><UserRound className="h-3.5 w-3.5 text-blue-500" /> Người thực hiện</label>
                <Select value={assigneeId || '__unassigned__'} onValueChange={(value) => setAssigneeId(value === '__unassigned__' ? null : value)} disabled={!canManage}>
                  <SelectTrigger className="h-9 border-border/60 bg-background text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Chưa phân công</SelectItem>
                    {visibleProjectAssignees.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl bg-background/75 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Calendar className="h-3.5 w-3.5 text-amber-500" /> Hạn hoàn thành</label>
                <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={!canManage} className="h-9 border-border/60 bg-background text-xs" />
              </div>
              {canManage && (
                <div className="rounded-xl bg-background/75 p-3 sm:col-span-2">
                  <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-violet-500" /> Độ phức tạp (Story points)</label>
                  <Input type="number" min="1" max="100" value={storyPoints} onChange={(event) => setStoryPoints(event.target.value)} className="h-9 max-w-32 border-border/60 bg-background text-xs" />
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Checklist thực hiện</h3></div>
                <span className="text-xs font-semibold text-muted-foreground">{completedChecklistCount}/{checklist.length || 0} · {checklistPercent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${checklistPercent}%` }} /></div>
              <div className="space-y-1.5">
                {checklist.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-center text-xs text-muted-foreground">Chưa có mục checklist. Leader có thể tạo các bước cần hoàn thành.</div>
                ) : checklist.map((item) => (
                  <div key={item.id} className="group flex items-center gap-3 rounded-xl border border-border/45 bg-card px-3 py-2.5 transition-colors hover:bg-muted/30">
                    <Checkbox checked={item.isCompleted} disabled={!canContribute || checklistBusyId === item.id} onCheckedChange={(checked) => void handleChecklistToggle(item, checked === true)} aria-label={`Hoàn thành: ${item.title}`} />
                    <span className={cn('min-w-0 flex-1 text-sm', item.isCompleted && 'text-muted-foreground line-through')}>{item.title}</span>
                    {canManage && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-100 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => void handleDeleteChecklist(item)} disabled={checklistBusyId === item.id}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                ))}
              </div>
              {canManage && (
                <div className="flex gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 p-2">
                  <Input value={newChecklistItem} onChange={(event) => setNewChecklistItem(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleAddChecklist(); } }} placeholder="Thêm một bước cần hoàn thành..." className="h-9 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0" />
                  <Button size="sm" className="h-9 shrink-0 gap-1.5 text-xs" onClick={() => void handleAddChecklist()} disabled={addingChecklist || !newChecklistItem.trim()}>{addingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Thêm</Button>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Ghi chú & trao đổi</h3><span className="text-xs text-muted-foreground">{task.comments?.length || 0}</span></div>
              <div className="space-y-3">
                {(task.comments || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-center text-xs text-muted-foreground">Chưa có trao đổi. Hãy để lại cập nhật hoặc câu hỏi cho nhóm.</div>
                ) : (task.comments || []).map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: comment.user?.color || '#64748b' }}>{comment.user?.name?.charAt(0).toUpperCase() || '?'}</div>
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-muted/45 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{comment.user?.name || 'Thành viên'}</span><span className="shrink-0 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}</span></div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              {canContribute && (
                <div className="rounded-2xl border border-border/60 bg-card p-2.5 shadow-2xs">
                  <Textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Viết cập nhật, câu hỏi hoặc phản hồi..." rows={3} className="resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0" />
                  <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2"><span className="text-[11px] text-muted-foreground">Mọi người trong công việc này đều xem được.</span><Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void handleSendComment()} disabled={sendingComment || !commentDraft.trim()}>{sendingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Gửi</Button></div>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Tài liệu dùng chung</h3><span className="text-xs text-muted-foreground">{task.links?.length || 0}</span></div>
              <div className="space-y-2">
                {(task.links || []).length === 0 ? <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-4 text-center text-xs text-muted-foreground">Chưa có tài liệu được đính kèm.</p> : (task.links || []).map((link) => (
                  <div key={link.id} className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 hover:border-primary/40">
                    <div className="rounded-lg bg-muted p-2">{linkIcon(link.type)}</div>
                    <a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate text-xs font-semibold hover:text-primary">{link.title}<ExternalLink className="h-3 w-3 shrink-0" /></p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{link.url}</p></a>
                    {canManage && <Button variant="ghost" size="icon" onClick={() => void handleDeleteLink(link.id)} className="h-8 w-8 text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                ))}
              </div>
              {canManage && (
                <div className="grid gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 p-3 sm:grid-cols-[1fr_1.2fr_auto_auto]">
                  <Input value={newLinkTitle} onChange={(event) => setNewLinkTitle(event.target.value)} placeholder="Tên tài liệu" className="h-9 text-xs" />
                  <Input value={newLinkUrl} onChange={(event) => setNewLinkUrl(event.target.value)} placeholder="https://..." className="h-9 text-xs" />
                  <Select value={newLinkType} onValueChange={setNewLinkType}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="google_doc">Google Docs</SelectItem><SelectItem value="google_sheet">Google Sheets</SelectItem><SelectItem value="google_slide">Google Slides</SelectItem><SelectItem value="google_form">Google Forms</SelectItem><SelectItem value="other">Khác</SelectItem></SelectContent></Select>
                  <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => void handleAddLink()} disabled={addingLink}>{addingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Thêm</Button>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Lịch sử hoạt động</h3></div>
              <div className="relative space-y-3 border-l border-border/70 pl-4">
                {(task.activities || []).length === 0 ? <p className="py-2 text-xs text-muted-foreground">Hoạt động mới sẽ xuất hiện tại đây.</p> : (task.activities || []).map((activity) => (
                  <div key={activity.id} className="relative"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border-2 border-background bg-primary" /><p className="text-xs leading-relaxed"><span className="font-semibold">{activity.user?.name || 'Hệ thống'}</span> {activityLabel(activity.action)}{activity.details ? <span className="text-muted-foreground"> · {activity.details}</span> : null}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: vi })}</p></div>
                ))}
              </div>
            </section>

            <section className="space-y-2 rounded-2xl border border-border/50 bg-muted/10 p-4">
              <div className="flex items-center gap-2"><CircleDashed className="h-4 w-4 text-violet-500" /><h3 className="text-sm font-bold">Ghi chú xem xét</h3></div>
              <p className="text-xs leading-relaxed text-muted-foreground">{isMember ? 'Khi gửi chờ xem xét, bạn có thể tóm tắt kết quả hoặc nêu phần cần Leader hỗ trợ.' : 'Dùng phần này để phản hồi hoặc hướng dẫn trước khi duyệt công việc.'}</p>
              <Textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} disabled={!canContribute} rows={3} placeholder={isMember ? 'Ví dụ: Đã hoàn thành, cần Leader kiểm tra phần...' : 'Thêm phản hồi cho thành viên...'} className="resize-none border-border/60 bg-background text-sm" />
              {canManage && task.reviewStatus === 'pending' && (
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end"><Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => void handleReviewDecision(false)} disabled={saving}><CircleDashed className="h-3.5 w-3.5" /> Gửi lại cập nhật</Button><Button size="sm" className="gap-1.5 text-xs" onClick={() => void handleReviewDecision(true)} disabled={saving}><Check className="h-3.5 w-3.5" /> Duyệt hoàn thành</Button></div>
              )}
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <p className="hidden text-xs text-muted-foreground sm:block">{canManage ? 'Thay đổi được lưu an toàn và thông báo đến người liên quan.' : 'Cập nhật tiến độ để Leader theo dõi công việc.'}</p>
          <div className="ml-auto flex items-center gap-2"><Button variant="outline" size="sm" onClick={closeTaskDetail}>Đóng</Button>{canContribute && <Button size="sm" className="gap-1.5" onClick={() => void handleSave()} disabled={saving || (canManage && !title.trim())}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{isMember && status === 'review' ? 'Gửi Leader duyệt' : 'Lưu thay đổi'}</Button>}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
