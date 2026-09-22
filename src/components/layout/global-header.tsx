'use client';

import * as React from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  Bell,
  Search,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  UserCheck,
  Shield,
  LogOut,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Menu,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function GlobalHeader() {
  const {
    currentView,
    user,
    setUser,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    notifications,
    unreadCount,
    setNotifications,
    setUnreadCount,
    setCommandPaletteOpen,
    projects,
    selectedProjectId,
  } = useAppStore();

  const isAdmin = user?.role === 'admin';

  // Get Breadcrumb text based on currentView
  const breadcrumbInfo = React.useMemo(() => {
    switch (currentView) {
      case 'admin-overview':
        return { category: 'Quản trị', title: 'Tổng quan Hệ thống' };
      case 'leaders':
        return { category: 'Quản trị', title: 'Danh sách Leader' };
      case 'leader-dashboard':
        return { category: 'Leader', title: 'Tổng quan Điều hành' };
      case 'leader-time':
        return { category: 'Leader', title: 'Chấm công Thành viên' };
      case 'board':
        return { category: 'Dự án', title: 'Bảng công việc Kanban' };
      case 'projects':
        return { category: isAdmin ? 'Quản trị' : 'Không gian làm việc', title: 'Danh sách Dự án' };
      case 'members':
        return { category: isAdmin ? 'Quản trị' : 'Không gian làm việc', title: 'Danh sách Thành viên' };
      case 'polls':
        return { category: 'Nhóm', title: 'Khảo sát & Biểu quyết' };
      case 'my-tasks':
        return { category: 'Cá nhân', title: 'Công việc của tôi' };
      case 'time-tracking':
        return { category: 'Cá nhân', title: 'Chấm công & Theo dõi thời gian' };
      case 'team':
        return { category: 'Nhóm', title: 'Đội ngũ Thành viên' };
      case 'notifications':
        return { category: 'Cá nhân', title: 'Trung tâm Thông báo' };
      case 'profile':
        return { category: 'Cá nhân', title: 'Hồ sơ của tôi' };
      default:
        return { category: 'TaskFlow', title: 'Không gian làm việc' };
    }
  }, [currentView, isAdmin]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, markAll: true }),
      });
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-4 md:px-6 backdrop-blur-xl transition-all">
      {/* Left section: Collapse button & Dynamic Breadcrumbs */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile Hamburger Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-menu'))}
          className="flex md:hidden h-8 w-8 -ml-1.5 text-muted-foreground hover:text-foreground"
          title="Mở menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebarCollapsed}
          className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground"
          title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>

        {/* Breadcrumb path */}
        <div className="flex items-center text-xs md:text-sm text-muted-foreground">
          <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            TaskFlow
          </span>
          <ChevronRight className="h-3.5 w-3.5 mx-1 md:mx-1.5 opacity-40 shrink-0" />
          <span className="hidden sm:inline font-medium text-muted-foreground/80">{breadcrumbInfo.category}</span>
          <ChevronRight className="hidden sm:inline h-3.5 w-3.5 mx-1.5 opacity-40 shrink-0" />
          <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">{breadcrumbInfo.title}</span>
        </div>
      </div>

      {/* Right section: Global Search Cmd+K, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Search Button (Cmd + K) */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="h-8 md:h-9 px-2.5 md:px-3 text-xs text-muted-foreground hover:text-foreground bg-muted/40 border-border/60 hover:bg-muted/70 gap-2 rounded-lg font-normal shadow-xs"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Tìm kiếm nhanh...</span>
          <kbd className="hidden md:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border/70 text-muted-foreground/90">
            ⌘K
          </kbd>
        </Button>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg border border-border/40 hover:bg-muted/60 transition-colors"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-in zoom-in">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 md:w-96 p-0 shadow-2xl border border-border/60 bg-popover/95 backdrop-blur-xl">
            <div className="flex items-center justify-between p-3.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Thông báo</span>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-7 text-xs text-muted-foreground hover:text-primary">
                  Đánh dấu đã đọc
                </Button>
              )}
            </div>

            <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  Bạn chưa có thông báo nào.
                </div>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 text-xs transition-colors hover:bg-muted/40 ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-foreground">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi }) : ''}
                      </span>
                    </div>
                    <p className="text-muted-foreground/90 mt-1 line-clamp-2">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggle />

        {/* User Profile Dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-2 rounded-lg border border-border/40 hover:bg-muted/60 transition-colors">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: user.color || '#6366f1' }}
                >
                  {user.name?.charAt(0) || 'U'}
                </div>
                <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-xl border border-border/60">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold leading-none">{user.name}</p>
                  <p className="text-[11px] leading-none text-muted-foreground">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isAdmin ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {isAdmin ? 'Quản trị viên (Admin)' : 'Thành viên (Member)'}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer gap-2 text-xs font-medium"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
