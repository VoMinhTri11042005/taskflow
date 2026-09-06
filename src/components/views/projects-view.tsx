'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, FolderKanban, Archive } from 'lucide-react';
import { toast } from 'sonner';
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
      await ensureApiSuccess(response, 'Không thể cập nhật trạng thái dự án');
      toast.success(newStatus === 'archived' ? 'Đã lưu trữ dự án' : 'Đã kích hoạt dự án');
      await fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  }

  const filteredProjects = projects.filter((p) =>
    showArchived ? true : p.status === 'active'
  );

  const activeProjects = projects.filter((p) => p.status === 'active');
  const archivedProjects = projects.filter((p) => p.status === 'archived');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dự án</h1>
          <p className="text-muted-foreground">Quản lý các dự án của nhóm</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchived ? 'Dự án hoạt động' : 'Đã lưu trữ'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo dự án
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Tên dự án</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nhập tên dự án..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Mô tả ngắn về dự án..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Màu sắc</Label>
                  <div className="flex flex-wrap gap-2">
                    {projectColors.map((color) => (
                      <button
                        key={color}
                        className={`h-8 w-8 rounded-full transition-all ${
                          formColor === color
                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                            : 'hover:scale-105'
                        }`}
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
                  {editingProject ? 'Cập nhật' : 'Tạo mới'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {showArchived ? 'Không có dự án lưu trữ' : 'Chưa có dự án nào'}
            </h3>
            {!showArchived && (
              <p className="text-sm text-muted-foreground mt-1">
                Tạo dự án đầu tiên để bắt đầu quản lý công việc
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const projectName = getProjectDisplayName(project.name);
            return (
            <Card
              key={project.id}
              className="group hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-3 w-10 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <CardTitle className="text-base truncate">
                      {projectName}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setCurrentView('board');
                      }}
                      title="Xem công việc"
                    >
                      <FolderKanban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(project)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa dự án?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Dự án &quot;{projectName}&quot; và tất cả công việc liên quan sẽ bị xóa vĩnh viễn.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(project.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {project.description || 'Không có mô tả'}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground">
                    {project._count?.tasks || 0} công việc · {project._count?.members || 0} thành viên
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    <ProjectMembersDialog project={project} onChanged={() => { void fetchProjects(); }} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleToggleArchive(project)}
                    >
                      {project.status === 'active' ? (
                        <><Archive className="mr-1 h-3 w-3" />Lưu trữ</>
                      ) : (
                        'Kích hoạt'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
