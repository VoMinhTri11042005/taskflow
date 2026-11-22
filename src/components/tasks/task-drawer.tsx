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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DocumentLink } from '@/components/tasks/document-link';
import { AssigneePicker, getTaskAssigneeIds, getTaskAssignees } from '@/components/tasks/assignee-picker';
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
  const [initialDetails, setInitialDetails] = React.useState<{ task: Task; state: 'loading' | 'ready' | 'error' } | null>(null);
  const [initialRetry, setInitialRetry] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);
  const [conflictPreview, setConflictPreview] = React.useState<Task | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const formVersion = React.useRef<string | null>(null);
  const [checklistBusyId, setChecklistBusyId] = React.useState<string | null>(null);
  const [newChecklistItem, setNewChecklistItem] = React.useState('');
  const [addingChecklist, setAddingChecklist] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [sendingComment, setSendingComment] = React.useState(false);
  const [collaborationOffline, setCollaborationOffline] = React.useState(false);
  const refreshGeneration = React.useRef(0);
  const drawerGeneration = React.useRef(0);
  const initialDetailsPending = React.useRef(false);
  const formDirty = React.useRef(false);
  const pendingMutations = React.useRef(0);
  const draftOwner = React.useRef('');
  const linkDraftRevision = React.useRef(0);
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
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState('');
  const [reviewNotes, setReviewNotes] = React.useState('');

  const selectedTaskId = selectedTask?.id;
  const userId = user?.id;
  const userRole = user?.role;
  const task = detailTask?.id === selectedTaskId ? detailTask : selectedTask;
  const initialDetailsState = initialDetails?.task === selectedTask ? initialDetails.state : 'loading';
  const detailLoading = initialDetailsState === 'loading';
  const canEditTask = initialDetailsState === 'ready' && !saving;
  const canManage = user?.role === 'leader';
  const isMember = user?.role === 'member';
  const canContribute = Boolean(user && user.role !== 'admin');

  const hydrateForm = React.useCallback((nextTask: Task) => {
    formVersion.current = nextTask.updatedAt;
    setTitle(nextTask.title || '');
    setDescription(nextTask.description || '');
    setStatus(nextTask.status || 'todo');
    setPriority(nextTask.priority || 'medium');
    setStoryPoints(String(nextTask.storyPoints || 1));
    setAssigneeIds(getTaskAssigneeIds(nextTask));
    setDueDate(nextTask.dueDate ? format(new Date(nextTask.dueDate), 'yyyy-MM-dd') : '');
    setReviewNotes(nextTask.reviewNotes || '');
  }, []);

  const replaceTask = React.useCallback((nextTask: Task) => {
    setDetailTask(nextTask);
    setTasks(tasks.map((item) => (item.id === nextTask.id ? { ...item, ...nextTask } : item)));
    hydrateForm(nextTask);
  }, [hydrateForm, setTasks, tasks]);

  const isCurrentTask = React.useCallback(() => {
    const state = useAppStore.getState();
    return Boolean(state.taskDrawerOpen && state.selectedTask?.id === selectedTaskId
      && state.user?.id === userId && state.user?.role === userRole);
  }, [selectedTaskId, userId, userRole]);

  const beginMutation = React.useCallback(() => {
    pendingMutations.current += 1;
    refreshGeneration.current += 1;
    return drawerGeneration.current;
  }, []);

  const isCurrentMutation = React.useCallback((generation: number) =>
    generation === drawerGeneration.current && isCurrentTask(), [isCurrentTask]);

  const endMutation = React.useCallback(() => {
    pendingMutations.current = Math.max(0, pendingMutations.current - 1);
  }, []);

  const handleAccessLost = React.useCallback(() => {
    if (!isCurrentTask()) return;
    refreshGeneration.current += 1;
    setDetailTask(null);
    setInitialDetails(null);
    setCommentDraft('');
    closeTaskDetail();
    toast.error('Công việc không còn khả dụng hoặc bạn không còn quyền truy cập.');
  }, [closeTaskDetail, isCurrentTask]);

  const loadTaskDetails = React.useCallback(async () => {
    if (!selectedTaskId) return null;
    const generation = ++refreshGeneration.current;
    const response = await fetch(`/api/tasks/${selectedTaskId}`, { cache: 'no-store' });
    if (!isCurrentTask() || generation !== refreshGeneration.current) return null;
    if ([401, 403, 404].includes(response.status)) {
      handleAccessLost();
      return null;
    }
    const nextTask = await readApiJson<Task>(response, 'Không thể tải chi tiết công việc');
    if (!isCurrentTask() || generation !== refreshGeneration.current) return null;
    setDetailTask(nextTask);
    return nextTask;
  }, [handleAccessLost, isCurrentTask, selectedTaskId]);

  React.useEffect(() => {
    if (!taskDrawerOpen || !selectedTask) return;

    let active = true;
    drawerGeneration.current += 1;
    initialDetailsPending.current = true;
    formDirty.current = false;
    const generation = ++refreshGeneration.current;
    const nextDraftOwner = `${userId}:${userRole}:${selectedTask.id}`;
    // Defer the optimistic form hydration. The task detail request remains the
    // source of truth while avoiding an unnecessary cascading render.
    queueMicrotask(() => {
      if (!active) return;
      setInitialDetails({ task: selectedTask, state: 'loading' });
      setSaving(false);
      setConflict(false);
      setConflictPreview(null);
      setPreviewLoading(false);
      setCollaborationOffline(false);
      if (draftOwner.current !== nextDraftOwner) {
        draftOwner.current = nextDraftOwner;
        setCommentDraft('');
      }
      setDetailTask(selectedTask);
      hydrateForm(selectedTask);
    });
    void fetch(`/api/tasks/${selectedTask.id}`, { cache: 'no-store' })
      .then((response) => {
        if (active && isCurrentTask() && [401, 403, 404].includes(response.status)) {
          handleAccessLost();
          return null;
        }
        return readApiJson<Task>(response, 'Không thể tải chi tiết công việc');
      })
      .then((nextTask) => {
        if (!active || !nextTask || !isCurrentTask()) return;
        // Another local mutation can supersede the comment/activity snapshot,
        // but it cannot change the locked task form during this initial load.
        if (generation === refreshGeneration.current) setDetailTask(nextTask);
        if (!formDirty.current) hydrateForm(nextTask);
        setInitialDetails({ task: selectedTask, state: 'ready' });
      })
      .catch((error) => {
        if (active && isCurrentTask()) {
          setInitialDetails({ task: selectedTask, state: 'error' });
          toast.error(getErrorMessage(error, 'Không thể tải chi tiết công việc'));
        }
      })
      .finally(() => { if (active) initialDetailsPending.current = false; });

    return () => { active = false; refreshGeneration.current += 1; drawerGeneration.current += 1; };
  }, [handleAccessLost, hydrateForm, initialRetry, isCurrentTask, selectedTask, taskDrawerOpen, userId, userRole]);

  React.useEffect(() => {
    if (!taskDrawerOpen || !selectedTaskId || !userId) return;

    let active = true;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (!active || document.visibilityState !== 'visible' || initialDetailsPending.current || pendingMutations.current || controller) return;
      const generation = ++refreshGeneration.current;
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch(`/api/tasks/${selectedTaskId}`, { cache: 'no-store', signal: request.signal });
        if (!active || !isCurrentTask() || generation !== refreshGeneration.current) return;
        if ([401, 403, 404].includes(response.status)) {
          handleAccessLost();
          return;
        }
        const nextTask = await readApiJson<Task>(response, 'Không thể cập nhật trao đổi');
        if (!active || !isCurrentTask() || generation !== refreshGeneration.current || document.visibilityState !== 'visible') return;
        setDetailTask((current) => current?.id === selectedTaskId
          ? { ...current, comments: nextTask.comments, activities: nextTask.activities }
          : current);
        setCollaborationOffline(false);
      } catch {
        if (active && !request.signal.aborted && isCurrentTask() && generation === refreshGeneration.current) setCollaborationOffline(true);
      } finally {
        if (controller === request) controller = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
      else { refreshGeneration.current += 1; controller?.abort(); }
    };
    const onFocus = () => { void refresh(); };
    const timer = window.setInterval(() => void refresh(), 15_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      refreshGeneration.current += 1;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [handleAccessLost, isCurrentTask, selectedTaskId, taskDrawerOpen, userId]);

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

  async function refreshAfterMutation(mutationGeneration: number) {
    if (!isCurrentMutation(mutationGeneration)) return;
    try {
      await loadTaskDetails();
    } catch {
      if (isCurrentMutation(mutationGeneration)) {
        setCollaborationOffline(true);
        toast.warning('Đã lưu thay đổi nhưng chưa thể tải lại chi tiết. Vui lòng mở lại công việc.');
      }
    }
  }

  async function updateTask(payload: Record<string, unknown>, successMessage: string) {
    if (!canEditTask || conflict || !formVersion.current) return null;
    const mutationGeneration = beginMutation();
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, expectedUpdatedAt: formVersion.current }),
      });
      if (response.status === 409) {
        const body = await response.clone().json().catch(() => null);
        if (body?.code === 'TASK_CONFLICT') {
          if (isCurrentMutation(mutationGeneration)) {
            setConflict(true);
            setConflictPreview(null);
            toast.warning('Công việc đã thay đổi. Nội dung bạn đang sửa vẫn được giữ lại.');
          }
          return null;
        }
      }
      const updated = await readApiJson<Task>(response, 'Không thể lưu thay đổi công việc');
      if (!isCurrentMutation(mutationGeneration)) return null;
      replaceTask(updated);
      toast.success(successMessage);
      return updated;
    } catch (error) {
      if (isCurrentMutation(mutationGeneration)) toast.error(getErrorMessage(error, 'Không thể lưu thay đổi công việc'));
      return null;
    } finally {
      endMutation();
      if (isCurrentMutation(mutationGeneration)) setSaving(false);
    }
  }

  async function fetchConflictVersion(apply: boolean) {
    const mutationGeneration = beginMutation();
    if (apply) setSaving(true);
    else setPreviewLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: 'no-store' });
      if (!isCurrentMutation(mutationGeneration)) return;
      if ([401, 403, 404].includes(response.status)) {
        handleAccessLost();
        return;
      }
      const latest = await readApiJson<Task>(response, 'Không thể tải phiên bản mới');
      if (!isCurrentMutation(mutationGeneration)) return;
      if (apply) {
        replaceTask(latest);
        formDirty.current = false;
        setConflict(false);
        setConflictPreview(null);
        toast.success('Đã tải phiên bản mới nhất');
      } else {
        setConflictPreview(latest);
      }
    } catch (error) {
      if (isCurrentMutation(mutationGeneration)) toast.error(getErrorMessage(error, 'Không thể tải phiên bản mới'));
    } finally {
      endMutation();
      if (isCurrentMutation(mutationGeneration)) {
        if (apply) setSaving(false);
        else setPreviewLoading(false);
      }
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
      payload.assigneeIds = assigneeIds;
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
    const mutationGeneration = beginMutation();
    setChecklistBusyId(item.id);
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, isCompleted: checked }),
      });
      await readApiJson<unknown>(response, 'Không thể cập nhật checklist');
      await refreshAfterMutation(mutationGeneration);
    } catch (error) {
      if (isCurrentMutation(mutationGeneration)) toast.error(getErrorMessage(error, 'Không thể cập nhật checklist'));
    } finally {
      endMutation();
      setChecklistBusyId(null);
    }
  }

  async function handleAddChecklist() {
    const itemTitle = newChecklistItem.trim();
    if (!itemTitle) return;
    const mutationGeneration = beginMutation();
    setAddingChecklist(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: itemTitle }),
      });
      await readApiJson<unknown>(response, 'Không thể thêm checklist');
      if (isCurrentMutation(mutationGeneration)) setNewChecklistItem((current) => current.trim() === itemTitle ? '' : current);
      await refreshAfterMutation(mutationGeneration);
    } catch (error) {
      if (isCurrentMutation(mutationGeneration)) toast.error(getErrorMessage(error, 'Không thể thêm checklist'));
    } finally {
      endMutation();
      setAddingChecklist(false);
    }
  }

  async function handleDeleteChecklist(item: TaskChecklistItem) {
    const mutationGeneration = beginMutation();
    setChecklistBusyId(item.id);
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      await readApiJson<unknown>(response, 'Không thể xóa checklist');
      await refreshAfterMutation(mutationGeneration);
    } catch (error) {
      if (isCurrentMutation(mutationGeneration)) toast.error(getErrorMessage(error, 'Không thể xóa checklist'));
    } finally {
      endMutation();
      setChecklistBusyId(null);
    }
  }

  async function handleSendComment() {
    const content = commentDraft.trim();
    if (!content) return;
    const mutationGeneration = beginMutation();
    setSendingComment(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      await readApiJson<unknown>(response, 'Không thể gửi bình luận');
      if (isCurrentMutation(mutationGeneration)) setCommentDraft((current) => current.trim() === content ? '' : current);
      await refreshAfterMutation(mutationGeneration);
    } catch (error) {
      if (isCurrentMutation(mutationGeneration)) toast.error(getErrorMessage(error, 'Không thể gửi bình luận'));
    } finally {
      endMutation();
      setSendingComment(false);
    }
  }

  async function handleAddLink() {
    const linkTitle = newLinkTitle.trim();
    const linkUrl = newLinkUrl.trim();
    if (!linkTitle || !linkUrl) {
      toast.error('Vui lòng nhập tên và đường dẫn tài liệu');
      return;
    }
    const mutationGeneration = beginMutation();
    const submittedRevision = linkDraftRevision.current;
    setAddingLink(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: linkTitle, url: linkUrl, type: newLinkType }),
      });
      await readApiJson<unknown>(response, 'Không thể thêm liên kết');
      if (isCurrentMutation(mutationGeneration) && submittedRevision === linkDraftRevision.current) {
        setNewLinkTitle('');
        setNewLinkUrl('');
      }
      await refreshAfterMutation(mutationGeneration);
    } catch (error) {
      if (isCurrentMutation(mutationGeneration)) toast.error(getErrorMessage(error, 'Không thể thêm liên kết'));
    } finally {
      endMutation();
      setAddingLink(false);
    }
  }

  async function handleDeleteLink(linkId: string) {
    const mutationGeneration = beginMutation();
    try {
      const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      await readApiJson<unknown>(response, 'Không thể xóa liên kết');
      if (isCurrentMutation(mutationGeneration)) {
        await refreshAfterMutation(mutationGeneration);
        if (isCurrentMutation(mutationGeneration)) toast.success('Đã xóa liên kết');
      }
    } catch (error) {
      if (isCurrentMutation(mutationGeneration)) toast.error(getErrorMessage(error, 'Không thể xóa liên kết'));
    } finally {
      endMutation();
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
    <Sheet open={taskDrawerOpen} onOpenChange={(open) => { if (!open) { setInitialDetails(null); closeTaskDetail(); } }}>
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
            {getTaskAssignees(task).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5" aria-label="Người thực hiện">
                {getTaskAssignees(task).map((member) => (
                  <div key={member.id} className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-2 py-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: member.color }}>{member.name.charAt(0).toUpperCase()}</span>
                    <span className="max-w-28 truncate text-xs font-medium">{member.name}</span>
                  </div>
                ))}
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
              {initialDetailsState === 'error' && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                  <span>Không thể tải chi tiết mới nhất. Hãy thử lại trước khi chỉnh sửa hoặc lưu.</span>
                  <Button size="sm" variant="outline" onClick={() => { setInitialDetails({ task: selectedTask, state: 'loading' }); setInitialRetry((value) => value + 1); }}>Thử lại</Button>
                </div>
              )}
              {conflict && (
                <div role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                  <p className="font-semibold">Công việc đã được người khác cập nhật.</p>
                  <p>Nội dung bạn đang sửa vẫn được giữ bên dưới. Hãy đối chiếu và lưu lại nội dung cần giữ trước khi tải phiên bản mới. Bạn chưa thể lưu cho đến khi tải lại.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={previewLoading || saving} onClick={() => void fetchConflictVersion(false)}>{previewLoading ? 'Đang tải...' : 'Xem phiên bản mới'}</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" disabled={previewLoading || saving}>Tải phiên bản mới</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Bỏ nội dung đang sửa?</AlertDialogTitle>
                          <AlertDialogDescription>Phiên bản mới nhất sẽ thay thế các thông tin công việc bạn đang nhập nhưng chưa lưu. Hãy sao chép nội dung cần giữ trước khi tiếp tục.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Giữ bản nháp</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void fetchConflictVersion(true)}>Bỏ bản nháp và tải mới</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {conflictPreview && (
                    <div className="space-y-1 rounded-lg border border-amber-200 bg-background/80 p-3 text-foreground dark:border-amber-800">
                      <p className="font-semibold">Thông tin mới tại thời điểm xem</p>
                      <p><strong>Tên:</strong> {conflictPreview.title}</p>
                      <p className="whitespace-pre-wrap break-words"><strong>Mô tả:</strong> {conflictPreview.description || 'Chưa có'}</p>
                      <p><strong>Trạng thái:</strong> {statusConfig[conflictPreview.status]?.label || conflictPreview.status}</p>
                      <p><strong>Ưu tiên:</strong> {priorityOptions.find((option) => option.value === conflictPreview.priority)?.label || conflictPreview.priority}</p>
                      <p><strong>Người thực hiện:</strong> {getTaskAssignees(conflictPreview).map((member) => member.name).join(', ') || 'Chưa phân công'}</p>
                      <p><strong>Hạn hoàn thành:</strong> {conflictPreview.dueDate ? format(new Date(conflictPreview.dueDate), 'dd/MM/yyyy') : 'Chưa có'}</p>
                      <p><strong>Độ phức tạp:</strong> {conflictPreview.storyPoints || 1}</p>
                      <p className="whitespace-pre-wrap break-words"><strong>Ghi chú xem xét:</strong> {conflictPreview.reviewNotes || 'Chưa có'}</p>
                    </div>
                  )}
                </div>
              )}
              <Input
                value={title}
                onChange={(event) => { formDirty.current = true; setTitle(event.target.value); }}
                disabled={!canManage || !canEditTask}
                className="h-11 border-border/60 bg-muted/20 text-base font-bold shadow-none focus-visible:bg-background"
                aria-label="Tiêu đề công việc"
              />
              <Textarea
                value={description}
                onChange={(event) => { formDirty.current = true; setDescription(event.target.value); }}
                disabled={!canManage || !canEditTask}
                rows={4}
                placeholder="Mô tả, mục tiêu và hướng dẫn thực hiện..."
                className="resize-none border-border/60 bg-muted/20 text-sm leading-relaxed shadow-none focus-visible:bg-background"
              />
            </section>

            <section className="grid grid-cols-1 gap-3 rounded-2xl border border-border/50 bg-muted/15 p-3 sm:grid-cols-2">
              <div className="rounded-xl bg-background/75 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Tiến độ</label>
                <Select value={status} onValueChange={(value) => { formDirty.current = true; setStatus(value as Task['status']); }} disabled={!canContribute || !canEditTask}>
                  <SelectTrigger className="h-9 border-border/60 bg-background text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectableStatuses.map((value) => <SelectItem key={value} value={value}>{statusConfig[value].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl bg-background/75 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Flag className="h-3.5 w-3.5 text-rose-500" /> Ưu tiên</label>
                <Select value={priority} onValueChange={(value) => { formDirty.current = true; setPriority(value as Task['priority']); }} disabled={!canManage || !canEditTask}>
                  <SelectTrigger className="h-9 border-border/60 bg-background text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl bg-background/75 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><UserRound className="h-3.5 w-3.5 text-blue-500" /> Người thực hiện</label>
                {canManage ? (
                  <AssigneePicker members={visibleProjectAssignees} selectedIds={assigneeIds} onChange={(value) => { formDirty.current = true; setAssigneeIds(value); }} disabled={!canEditTask} loading={assigneesProjectId !== task.projectId} />
                ) : (
                  <p className="text-xs">{getTaskAssignees(task).map((member) => member.name).join(', ') || 'Chưa phân công'}</p>
                )}
              </div>
              <div className="rounded-xl bg-background/75 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Calendar className="h-3.5 w-3.5 text-amber-500" /> Hạn hoàn thành</label>
                <Input type="date" value={dueDate} onChange={(event) => { formDirty.current = true; setDueDate(event.target.value); }} disabled={!canManage || !canEditTask} className="h-9 border-border/60 bg-background text-xs" />
              </div>
              {canManage && (
                <div className="rounded-xl bg-background/75 p-3 sm:col-span-2">
                  <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-violet-500" /> Độ phức tạp (Story points)</label>
                  <Input type="number" min="1" max="100" value={storyPoints} onChange={(event) => { formDirty.current = true; setStoryPoints(event.target.value); }} disabled={!canEditTask} className="h-9 max-w-32 border-border/60 bg-background text-xs" />
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
                    {canManage && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600" title="Xóa mục checklist" aria-label={`Xóa mục checklist: ${item.title}`} onClick={() => void handleDeleteChecklist(item)} disabled={checklistBusyId === item.id}><Trash2 className="h-3.5 w-3.5" /></Button>}
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
              <p role="status" className="text-[11px] text-muted-foreground">{collaborationOffline ? 'Chưa thể cập nhật trao đổi. Sẽ tự thử lại khi có kết nối.' : 'Trao đổi tự cập nhật khi bạn đang mở công việc.'}</p>
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
                  <Textarea aria-label="Viết ghi chú hoặc trao đổi" maxLength={4000} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Viết cập nhật, câu hỏi hoặc phản hồi..." rows={3} className="resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0" />
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
                    <DocumentLink link={link} />
                    {canManage && <Button variant="ghost" size="icon" onClick={() => void handleDeleteLink(link.id)} className="h-8 w-8 text-muted-foreground hover:text-rose-600" title="Xóa tài liệu" aria-label={`Xóa tài liệu: ${link.title}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                ))}
              </div>
              {canManage && (
                <div className="grid gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 p-3 sm:grid-cols-[1fr_1.2fr_auto_auto]">
                  <Input value={newLinkTitle} onChange={(event) => { linkDraftRevision.current += 1; setNewLinkTitle(event.target.value); }} placeholder="Tên tài liệu" className="h-9 text-xs" />
                  <Input value={newLinkUrl} onChange={(event) => { linkDraftRevision.current += 1; setNewLinkUrl(event.target.value); }} placeholder="https://..." className="h-9 text-xs" />
                  <Select value={newLinkType} onValueChange={(value) => { linkDraftRevision.current += 1; setNewLinkType(value); }}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="google_doc">Google Docs</SelectItem><SelectItem value="google_sheet">Google Sheets</SelectItem><SelectItem value="google_slide">Google Slides</SelectItem><SelectItem value="google_form">Google Forms</SelectItem><SelectItem value="other">Khác</SelectItem></SelectContent></Select>
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
              <Textarea value={reviewNotes} onChange={(event) => { formDirty.current = true; setReviewNotes(event.target.value); }} disabled={!canContribute || !canEditTask} rows={3} placeholder={isMember ? 'Ví dụ: Đã hoàn thành, cần Leader kiểm tra phần...' : 'Thêm phản hồi cho thành viên...'} className="resize-none border-border/60 bg-background text-sm" />
              {canManage && task.reviewStatus === 'pending' && (
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end"><Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => void handleReviewDecision(false)} disabled={!canEditTask || conflict}><CircleDashed className="h-3.5 w-3.5" /> Gửi lại cập nhật</Button><Button size="sm" className="gap-1.5 text-xs" onClick={() => void handleReviewDecision(true)} disabled={!canEditTask || conflict}><Check className="h-3.5 w-3.5" /> Duyệt hoàn thành</Button></div>
              )}
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <p className="hidden text-xs text-muted-foreground sm:block">{canManage ? 'Thay đổi được lưu an toàn và thông báo đến người liên quan.' : 'Cập nhật tiến độ để Leader theo dõi công việc.'}</p>
          <div className="ml-auto flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => { setInitialDetails(null); closeTaskDetail(); }}>Đóng</Button>{canContribute && <Button size="sm" className="gap-1.5" onClick={() => void handleSave()} disabled={!canEditTask || conflict || (canManage && !title.trim())}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{isMember && status === 'review' ? 'Gửi Leader duyệt' : 'Lưu thay đổi'}</Button>}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
