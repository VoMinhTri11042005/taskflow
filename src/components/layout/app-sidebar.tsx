'use client';

import { useAppStore } from '@/stores/app-store';
import type { ViewType } from '@/types';
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  Users,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'projects', label: 'Dự án', icon: FolderKanban },
  { id: 'board', label: 'Bảng công việc', icon: KanbanSquare },
  { id: 'members', label: 'Thành viên', icon: Users },
];

export function AppSidebar() {
  const { currentView, setCurrentView, sidebarOpen, toggleSidebar, projects, setSelectedProjectId, selectedProjectId, tasks } = useAppStore();

  const activeTasks = tasks.filter((t) => t.status !== 'done').length;

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-full',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 min-h-[65px]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ClipboardList className="h-5 w-5" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-bold truncate">TaskFlow</h2>
            <p className="text-xs text-muted-foreground truncate">Quản lý nhóm</p>
          </div>
        )}
      </div>

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

      {/* Footer with toggle */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        {sidebarOpen && (
          <p className="text-xs text-center text-muted-foreground mt-1">
            {activeTasks} việc cần làm
          </p>
        )}
      </div>
    </aside>
  );
}
