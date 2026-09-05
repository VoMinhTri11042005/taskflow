'use client';

import { useAppStore } from '@/stores/app-store';
import type { AdminViewType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  Users,
  BarChart3,
  Activity,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/layout/brand-mark';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const navItems: { id: AdminViewType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'board', label: 'Bảng công việc', icon: KanbanSquare },
  { id: 'projects', label: 'Dự án', icon: FolderKanban },
  { id: 'members', label: 'Thành viên', icon: Users },
  { id: 'polls', label: 'Bình chọn', icon: BarChart3 },
  { id: 'activity', label: 'Hoạt động', icon: Activity },
  { id: 'reports', label: 'Báo cáo', icon: TrendingUp },
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
    notifications,
    unreadCount,
  } = useAppStore();

  const isMobile = useIsMobile();
  // On mobile drawer, always show full content. On desktop, respect sidebarOpen.
  const showFull = isMobile || sidebarOpen;

  const activeTasks = tasks.filter((t) => t.status !== 'done').length;
  const isLeader = user?.role === 'leader';

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  const latestNotifications = notifications.slice(0, 5);

  function closeMobileMenu() {
    window.dispatchEvent(new CustomEvent('close-mobile-menu'));
  }

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
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-full relative',
        showFull ? 'w-64' : 'w-16'
      )}
    >
      {/* Header with logo and notification bell */}
      <div className="flex items-center gap-2 p-4 min-h-[65px]">
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={closeMobileMenu}
            className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent z-10"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <BrandMark />
        {showFull && (
          <div className="flex flex-col overflow-hidden flex-1">
            <h2 className="text-sm font-bold truncate">TaskFlow</h2>
            <p className="text-xs text-muted-foreground truncate">{isLeader ? 'Leader' : 'Quản trị viên'}</p>
          </div>
        )}
        {showFull && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn('w-80', isMobile && 'w-[calc(100vw-2rem)]')}>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Thông báo</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} mới
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {latestNotifications.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Chưa có thông báo</p>
                </div>
              ) : (
                latestNotifications.map((notif) => (
                  <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate flex-1">
                        {notif.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 pl-4">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!showFull && unreadCount > 0 && (
          <div className="relative">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}
      </div>

      {/* User info section */}
      {showFull && user && (
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
                {user.role === 'admin' ? 'Quản trị viên' : user.role === 'leader' ? 'Leader' : 'Thành viên'}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {!showFull && user && (
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
              {showFull && <span>{item.label}</span>}
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
                  closeMobileMenu();
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
            'w-full text-destructive hover:text-destructive hover:bg-destructive/10',
            showFull ? 'justify-start gap-2 px-3' : 'justify-center px-0'
          )}
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4" />
          {showFull && <span>Đăng xuất</span>}
        </Button>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center"
            title={showFull ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}
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
