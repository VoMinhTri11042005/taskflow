'use client';

import { useAppStore } from '@/stores/app-store';
import type { MemberViewType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  CheckSquare,
  FolderKanban,
  BarChart3,
  Users,
  Bell,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LogOut,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems: { id: MemberViewType; label: string; icon: React.ElementType; showBadge?: boolean }[] = [
  { id: 'my-tasks', label: 'Công việc của tôi', icon: CheckSquare },
  { id: 'projects', label: 'Dự án', icon: FolderKanban },
  { id: 'polls', label: 'Bình chọn', icon: BarChart3 },
  { id: 'team', label: 'Nhóm', icon: Users },
  { id: 'notifications', label: 'Thông báo', icon: Bell, showBadge: true },
  { id: 'profile', label: 'Hồ sơ', icon: UserCircle },
];

export function MemberSidebar() {
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
    unreadCount,
  } = useAppStore();

  const isMobile = useIsMobile();
  const showFull = isMobile || sidebarOpen;

  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.assigneeId === user?.teamMemberId).length;

  function closeMobileMenu() {
    window.dispatchEvent(new CustomEvent('close-mobile-menu'));
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch {
      /* silent fail */
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-full relative',
        showFull ? 'w-64' : 'w-16'
      )}
    >
      {/* Header with user info */}
      <div className="flex items-center gap-3 p-4 min-h-[65px]">
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={closeMobileMenu}
            className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent z-10"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground text-sm font-bold"
          style={{ backgroundColor: user?.color || '#6b7280' }}
        >
          {user?.name?.charAt(0).toUpperCase() || '?'}
        </div>
        {showFull && (
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-bold truncate">{user?.name || 'Thành viên'}</h2>
            <Badge variant="secondary" className="text-[10px] h-4 w-fit px-1.5 mt-0.5">
              Thành viên
            </Badge>
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
                if (item.id === 'my-tasks') setSelectedProjectId(null);
                closeMobileMenu();
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground'
              )}
              title={!showFull ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {showFull && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
              {showFull && item.showBadge && unreadCount > 0 && (
                <Badge className="h-5 min-w-[20px] px-1.5 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
              {!showFull && item.showBadge && unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* Projects quick filter */}
      {showFull && (
        <div className="p-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Dự án nhanh
          </p>
          <div className="max-h-36 overflow-y-auto space-y-0.5">
            <button
              onClick={() => {
                setSelectedProjectId(null);
                setCurrentView('my-tasks');
              }}
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
                  setCurrentView('my-tasks');
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            'w-full justify-center text-muted-foreground hover:text-destructive',
            isMobile ? 'justify-start gap-2 px-3' : (!showFull && 'p-0 h-8 w-8 mx-auto')
          )}
          title={!showFull ? 'Đăng xuất' : undefined}
        >
          <LogOut className="h-4 w-4" />
          {showFull && <span className="ml-2">Đăng xuất</span>}
        </Button>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center"
          >
            {showFull ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        {showFull && (
          <p className="text-xs text-center text-muted-foreground">
            {activeTasks} việc cần làm
          </p>
        )}
      </div>
    </aside>
  );
}
