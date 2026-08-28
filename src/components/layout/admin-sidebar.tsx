'use client';

import { useAppStore } from '@/stores/app-store';
import type { AdminViewType } from '@/types';
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const navItems: { id: AdminViewType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'projects', label: 'Dự án', icon: FolderKanban },
  { id: 'board', label: 'Bảng công việc', icon: KanbanSquare },
  { id: 'members', label: 'Thành viên', icon: Users },
  { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export function AdminSidebar() {
  const {
    currentView,
    setCurrentView,
    sidebarOpen,
    toggleSidebar,
    projects,
    setSelectedProjectId,
    selectedProjectId,
    tasks,
    user,
    setUser,
  } = useAppStore();

  const activeTasks = tasks.filter((t) => t.status !== 'done').length;

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      toast.success('Đã đăng xuất thành công');
    } catch {
      toast.error('Có lỗi xảy ra khi đăng xuất');
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-full',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Header with user info */}
      <div className="flex items-center gap-3 p-4 min-h-[65px]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ClipboardList className="h-5 w-5" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-bold truncate">TaskFlow</h2>
            <p className="text-xs text-muted-foreground truncate">Quản trị viên</p>
          </div>
        )}
      </div>

      {/* User info section */}
      {sidebarOpen && user && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: user.color || '#6366f1' }}
            >
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-sm font-medium truncate">{user.name}</span>
              <Badge variant="secondary" className="text-[10px] w-fit px-1.5 py-0">
                {user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {!sidebarOpen && user && (
        <div className="flex justify-center px-2 pb-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: user.color || '#6366f1' }}
            title={user.name}
          >
            {userInitials}
          </div>
        </div>
      )}

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                if (item.id === 'board') setSelectedProjectId(null);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* Projects quick filter */}
      {sidebarOpen && (
        <div className="p-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Dự án nhanh
          </p>
          <div className="max-h-36 overflow-y-auto space-y-0.5">
            <button
              onClick={() => setSelectedProjectId(null)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                selectedProjectId === null ? 'bg-accent font-medium' : 'text-muted-foreground'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              Tất cả dự án
            </button>
            {projects.filter((p) => p.status === 'active').map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setCurrentView('board');
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent truncate',
                  selectedProjectId === project.id ? 'bg-accent font-medium' : 'text-muted-foreground'
                )}
                title={project.name}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Footer with toggle and logout */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        {sidebarOpen && (
          <p className="text-xs text-center text-muted-foreground">
            {activeTasks} việc cần làm
          </p>
        )}
      </div>
    </aside>
  );
}
