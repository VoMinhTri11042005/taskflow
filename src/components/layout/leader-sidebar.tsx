'use client';

import { useAppStore } from '@/stores/app-store';
import type { LeaderViewType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  UsersRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/layout/brand-mark';
import { toast } from 'sonner';
import { notifyAuthSessionChange } from '@/lib/auth-session-client';
import { ensureApiSuccess } from '@/lib/client-api';

const navItems: { id: LeaderViewType; label: string; icon: React.ElementType; showBadge?: boolean }[] = [
  { id: 'leader-dashboard', label: 'Không gian nhóm', icon: LayoutDashboard },
  { id: 'projects', label: 'Dự án của tôi', icon: FolderKanban },
  { id: 'board', label: 'Công việc', icon: KanbanSquare },
  { id: 'members', label: 'Thành viên & duyệt', icon: UsersRound },
  { id: 'polls', label: 'Bình chọn', icon: BarChart3 },
  { id: 'leader-time', label: 'Theo dõi thời gian', icon: Clock3 },
  { id: 'notifications', label: 'Thông báo', icon: Bell, showBadge: true },
];

export function LeaderSidebar() {
  const {
    currentView,
    setCurrentView,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    tasks,
    user,
    setUser,
    unreadCount,
  } = useAppStore();
  const isMobile = useIsMobile();
  const showFull = isMobile || !sidebarCollapsed;
  const activeTasks = tasks.filter((task) => task.status !== 'done').length;

  function closeMobileMenu() {
    window.dispatchEvent(new CustomEvent('close-mobile-menu'));
  }

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      await ensureApiSuccess(response, 'Không thể đăng xuất. Vui lòng thử lại.');
      setUser(null);
      notifyAuthSessionChange();
      toast.success('Đã đăng xuất thành công');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đăng xuất. Vui lòng thử lại.');
    }
  }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-dvh shrink-0 flex-col border-r border-primary/20 bg-gradient-to-b from-primary/8 via-background to-background transition-all duration-300',
        isMobile ? 'w-[min(20rem,calc(100vw-1rem))]' : showFull ? 'w-72' : 'w-16'
      )}
      aria-label="Điều hướng Leader"
    >
      <div className="flex min-h-[72px] items-center gap-3 px-4">
        <BrandMark size={36} decorative />
        {showFull && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">TaskFlow Leader</p>
            <p className="truncate text-xs text-primary">Không gian điều phối nhóm</p>
          </div>
        )}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={closeMobileMenu} aria-label="Đóng menu">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showFull && user && (
        <div className="px-3 pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-background/80 p-3 shadow-sm">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-primary/20"
              style={{ backgroundColor: user.color || '#2563eb' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <Badge className="mt-1 bg-primary/10 text-[10px] text-primary hover:bg-primary/15">Leader</Badge>
            </div>
          </div>
        </div>
      )}

      <Separator />
      <nav className="min-h-0 flex-1 overflow-y-auto space-y-1 p-3" aria-label="Menu Leader">
        {navItems.map(({ id, label, icon: Icon, showBadge }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setCurrentView(id);
              closeMobileMenu();
            }}
            aria-current={currentView === id ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              currentView === id
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
            )}
            title={!showFull ? label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {showFull && <span className="flex-1 truncate text-left">{label}</span>}
            {showBadge && unreadCount > 0 && (
              <Badge className="h-5 min-w-5 bg-primary px-1.5 text-[10px] text-primary-foreground hover:bg-primary">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </button>
        ))}
      </nav>

      <Separator />
      <div className="space-y-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleLogout}
          className={cn(
            'w-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white',
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
            type="button"
            onClick={toggleSidebarCollapsed}
            className="w-full justify-center"
            title={showFull ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}
            aria-label={showFull ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}
          >
            {showFull ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        {showFull && <p className="text-center text-xs text-muted-foreground">{activeTasks} việc đang theo dõi</p>}
      </div>
    </aside>
  );
}
