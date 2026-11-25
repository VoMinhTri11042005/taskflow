'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  Archive,
  Search,
  Users,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureApiSuccess, readApiJson } from '@/lib/client-api';
import { ProjectMembersDialog } from '@/components/views/leader/project-members-dialog';
import { getProjectDisplayName, normalizeProjectName } from '@/lib/project-name';

const projectColors = [
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
];

export function ProjectsView() {
  const { user, notificationSession, projects, setProjects, setCurrentView, setSelectedProjectId } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('#10b981');
  const [showArchived, setShowArchived] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const mutationPending = useRef(false);
  const mounted = useRef(false);
  const lifecycle = useRef(0);
  const requestSequence = useRef(0);
  const appliedRequest = useRef(0);
  const lastLoaded = useRef<Project[] | null>(null);
  const userId = user?.id;
  const userRole = user?.role;

  const isCurrent = useCallback(() => {
    const state = useAppStore.getState();
    return mounted.current && state.user?.id === userId && state.user?.role === userRole
      && state.notificationSession === notificationSession;
  }, [userId, userRole, notificationSession]);

  const fetchProjects = useCallback(async () => {
    if (!isCurrent()) return;
    const generation = lifecycle.current;
    const request = ++requestSequence.current;
    const previous = useAppStore.getState().projects;
    setLoading(true);
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' });
      const data = await readApiJson<Project[]>(res, 'Không thể tải danh sách dự án');
      if (!Array.isArray(data)) throw new Error('Dữ liệu dự án không hợp lệ');
      if (!isCurrent() || generation !== lifecycle.current || request <= appliedRequest.current) return;
      appliedRequest.current = request;
      const current = useAppStore.getState().projects;
      if (current === previous || current === lastLoaded.current) {
        setProjects(data);
        lastLoaded.current = useAppStore.getState().projects;
      }
      setLoadError(false);
    } catch {
      if (isCurrent() && generation === lifecycle.current && request >= appliedRequest.current) setLoadError(true);
    } finally {
      if (isCurrent() && generation === lifecycle.current && request === requestSequence.current) setLoading(false);
    }
  }, [isCurrent, setProjects]);

  useEffect(() => {
    mounted.current = true;
    const generation = ++lifecycle.current;
    requestSequence.current = 0;
    appliedRequest.current = 0;
    lastLoaded.current = null;
    queueMicrotask(() => {
      if (!isCurrent() || generation !== lifecycle.current) return;
      setDialogOpen(false);
      setEditingProject(null);
      setSaving(false);
      mutationPending.current = false;
      setLoadError(false);
      void fetchProjects();
    });
    return () => { mounted.current = false; lifecycle.current += 1; };
  }, [fetchProjects, isCurrent]);

  function openCreateDialog() {
    setEditingProject(null);
    setFormName('');
    setFormDesc('');
    setFormColor('#10b981');
    setDialogOpen(true);
  }

  function openEditDialog(project: Project) {
    setEditingProject(project);
    setFormName(normalizeProjectName(project.name));
    setFormDesc(project.description || '');
    setFormColor(project.color);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (mutationPending.current || !isCurrent()) return;
    const generation = lifecycle.current;
    const current = () => isCurrent() && generation === lifecycle.current;
    const projectName = normalizeProjectName(formName);
    if (!projectName) {
      toast.error('Vui lòng nhập tên dự án');
      return;
    }
    mutationPending.current = true;
    setSaving(true);
    requestSequence.current += 1;
    appliedRequest.current = requestSequence.current;
    try {
      if (editingProject) {
        const response = await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, description: formDesc || null, color: formColor }),
        });
        await ensureApiSuccess(response, 'Không thể cập nhật dự án');
        if (current()) toast.success('Đã cập nhật dự án');
      } else {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, description: formDesc || null, color: formColor }),
        });
        await ensureApiSuccess(response, 'Không thể tạo dự án');
        if (current()) toast.success('Đã tạo dự án mới');
      }
      if (!current()) return;
      appliedRequest.current = ++requestSequence.current;
      setDialogOpen(false);
      await fetchProjects();
    } catch (error) {
      if (current()) toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      if (current()) { mutationPending.current = false; setSaving(false); }
    }
  }

  async function handleDelete(id: string) {
    if (mutationPending.current || !isCurrent()) return;
    const generation = lifecycle.current;
    const current = () => isCurrent() && generation === lifecycle.current;
    mutationPending.current = true;
    setSaving(true);
    requestSequence.current += 1;
    appliedRequest.current = requestSequence.current;
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      await ensureApiSuccess(response, 'Không thể xóa dự án');
      if (!current()) return;
      toast.success('Đã xóa dự án');
      appliedRequest.current = ++requestSequence.current;
      await fetchProjects();
    } catch (error) {
      if (current()) toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      if (current()) { mutationPending.current = false; setSaving(false); }
    }
  }

  async function handleToggleArchive(project: Project) {
    if (mutationPending.current || !isCurrent()) return;
    const generation = lifecycle.current;
    const current = () => isCurrent() && generation === lifecycle.current;
    mutationPending.current = true;
    setSaving(true);
    requestSequence.current += 1;
    appliedRequest.current = requestSequence.current;
    const newStatus = project.status === 'active' ? 'archived' : 'active';
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await ensureApiSuccess(response, 'Không thể cập nhật trạng thái');
      if (!current()) return;
      toast.success(newStatus === 'archived' ? 'Đã lưu trữ dự án' : 'Đã kích hoạt dự án');
      appliedRequest.current = ++requestSequence.current;
      await fetchProjects();
    } catch (error) {
      if (current()) toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      if (current()) { mutationPending.current = false; setSaving(false); }
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus = showArchived ? p.status === 'archived' : p.status === 'active';
      if (!matchesStatus) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [projects, showArchived, searchFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Không gian Dự án</h1>
            <Badge variant="outline" className="text-xs font-mono bg-muted/40">
              {projects.filter((p) => p.status === 'active').length} hoạt động
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản trị danh mục dự án, phân công nhân sự và kiểm soát tài nguyên
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateDialog}
            disabled={saving}
            className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tạo dự án mới</span>
          </Button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <span>Không thể tải danh sách dự án mới nhất. Dữ liệu đã tải trước đó vẫn được giữ lại.</span>
          <Button variant="outline" size="sm" onClick={() => void fetchProjects()} disabled={loading}>Thử lại</Button>
        </div>
      )}

      {/* Toolbar: Search & Tab filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm kiếm dự án..."
              className="pl-8 h-8 text-xs bg-muted/20 border-border/60"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-muted-foreground">
          <Button
            variant={!showArchived ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'h-7 px-3 text-xs font-medium rounded-md transition-all',
              !showArchived && 'bg-background text-foreground shadow-2xs'
            )}
            onClick={() => setShowArchived(false)}
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Đang hoạt động ({projects.filter((p) => p.status === 'active').length})
          </Button>
          <Button
            variant={showArchived ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'h-7 px-3 text-xs font-medium rounded-md transition-all',
              showArchived && 'bg-background text-foreground shadow-2xs'
            )}
            onClick={() => setShowArchived(true)}
          >
            <Archive className="h-3.5 w-3.5 mr-1.5" />
            Đã lưu trữ ({projects.filter((p) => p.status === 'archived').length})
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading && projects.length === 0 ? (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">Đang tải danh sách dự án...</p>
      ) : loadError && projects.length === 0 ? null : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border/70 bg-card/40">
          <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            {showArchived ? 'Không có dự án nào trong lưu trữ' : 'Chưa có dự án nào'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {showArchived
              ? 'Các dự án hoàn thành hoặc ngưng hoạt động sẽ xuất hiện ở đây khi bạn chuyển sang chế độ lưu trữ.'
              : 'Tạo dự án mới để bắt đầu thiết lập công việc, tài liệu Google Docs/Sheets và phân quyền nhóm.'}
          </p>
          {!showArchived && (
            <Button size="sm" onClick={openCreateDialog} className="mt-4 text-xs font-semibold h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Tạo dự án ngay
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const projectName = getProjectDisplayName(project.name);
            const taskCount = project._count?.tasks || 0;
            const memberCount = project._count?.members || 0;

            return (
              <Card
                key={project.id}
                className="group relative flex flex-col justify-between overflow-hidden border-border/70 bg-card/85 hover:bg-card shadow-2xs hover:shadow-md transition-all rounded-2xl"
              >
                {/* Accent colored top strip */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: project.color }}
                />

                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: project.color }}
                        />
                        <CardTitle className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">
                          {projectName}
                        </CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                        {project.description || 'Chưa có mô tả chi tiết cho dự án này.'}
                      </p>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(project)}
                        disabled={saving}
                        title="Chỉnh sửa dự án"
                        aria-label={`Chỉnh sửa dự án ${projectName}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
                            title="Xóa dự án"
                            disabled={saving}
                            aria-label={`Xóa dự án ${projectName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa dự án &quot;{projectName}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tất cả công việc, liên kết tài liệu và dữ liệu thành viên trong dự án này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(project.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Xác nhận xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  {/* Stats Badges */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
                      <FolderKanban className="h-3 w-3 text-primary" />
                      {taskCount} việc
                    </span>
                    <span className="flex items-center gap-1 font-medium bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
                      <Users className="h-3 w-3 text-emerald-500" />
                      {memberCount} thành viên
                    </span>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1">
                      <ProjectMembersDialog project={project} onChanged={() => { void fetchProjects(); }} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => handleToggleArchive(project)}
                        disabled={saving}
                      >
                        {project.status === 'active' ? (
                          <><Archive className="mr-1 h-3 w-3" />Lưu trữ</>
                        ) : (
                          'Kích hoạt'
                        )}
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5 font-medium gap-1 group-hover:border-primary/50 group-hover:bg-primary/5"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setCurrentView('board');
                      }}
                    >
                      <span>Mở bảng</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tên dự án *</Label>
              <Input
                value={formName}
                disabled={saving}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="VD: Thiết kế Website Landing Page..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả mục tiêu</Label>
              <Textarea
                value={formDesc}
                disabled={saving}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Mô tả phạm vi và mục tiêu của dự án..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Màu đại diện dự án</Label>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {projectColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={saving}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all shadow-xs',
                      formColor === color
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Hủy</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {editingProject ? 'Lưu thay đổi' : 'Tạo dự án'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
