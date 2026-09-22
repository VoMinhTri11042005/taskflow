'use client';

import { useEffect, useState, useMemo } from 'react';
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
  const { projects, setProjects, setCurrentView, setSelectedProjectId } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('#10b981');
  const [showArchived, setShowArchived] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  async function fetchProjects() {
    const res = await fetch('/api/projects');
    const data = await readApiJson<Project[]>(res, 'Không thể tải danh sách dự án');
    setProjects(data);
  }

  useEffect(() => {
    void fetchProjects().catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể tải danh sách dự án');
    });
  }, [setProjects]);

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
    const projectName = normalizeProjectName(formName);
    if (!projectName) {
      toast.error('Vui lòng nhập tên dự án');
      return;
    }
    try {
      if (editingProject) {
        const response = await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, description: formDesc || null, color: formColor }),
        });
        await ensureApiSuccess(response, 'Không thể cập nhật dự án');
        toast.success('Đã cập nhật dự án');
      } else {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, description: formDesc || null, color: formColor }),
        });
        await ensureApiSuccess(response, 'Không thể tạo dự án');
        toast.success('Đã tạo dự án mới');
      }
      setDialogOpen(false);
      await fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      await ensureApiSuccess(response, 'Không thể xóa dự án');
      toast.success('Đã xóa dự án');
      await fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  }

  async function handleToggleArchive(project: Project) {
    const newStatus = project.status === 'active' ? 'archived' : 'active';
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await ensureApiSuccess(response, 'Không thể cập nhật trạng thái');
      toast.success(newStatus === 'archived' ? 'Đã lưu trữ dự án' : 'Đã kích hoạt dự án');
      await fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
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
            className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tạo dự án mới</span>
          </Button>
        </div>
      </div>

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
      {filteredProjects.length === 0 ? (
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
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(project)}
                        title="Chỉnh sửa dự án"
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                onChange={(e) => setFormName(e.target.value)}
                placeholder="VD: Thiết kế Website Landing Page..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả mục tiêu</Label>
              <Textarea
                value={formDesc}
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
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {editingProject ? 'Lưu thay đổi' : 'Tạo dự án'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
