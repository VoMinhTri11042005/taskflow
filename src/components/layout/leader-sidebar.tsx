'use client';

import { useAppStore } from '@/stores/app-store';
import type { LeaderViewType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  BarChart3,
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

const navItems: { id: LeaderViewType; label: string; icon: React.ElementType }[] = [
  { id: 'leader-dashboard', label: 'Không gian nhóm', icon: LayoutDashboard },
  { id: 'projects', label: 'Dự án của tôi', icon: FolderKanban },
  { id: 'board', label: 'Công việc', icon: KanbanSquare },
  { id: 'members', label: 'Thành viên & duyệt', icon: UsersRound },
  { id: 'polls', label: 'Bình chọn', icon: BarChart3 },
  { id: 'leader-time', label: 'Theo dõi thời gian', icon: Clock3 },
];

export function LeaderSidebar() {
  const {
    currentView,
    setCurrentView,
    sidebarOpen,
    toggleSidebar,
    tasks,
    user,
    setUser,
  } = useAppStore();
  const isMobile = useIsMobile();
  const showFull = isMobile || sidebarOpen;
  const activeTasks = tasks.filter((task) => task.status !== 'done').length;

  function closeMobileMenu() {
    window.dispatchEvent(new CustomEvent('close-mobile-menu'));
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      toast.success('Đã đăng xuất thành công');
    } catch {
      toast.error('Không thể đăng xuất. Vui lòng thử lại.');
    }
  }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-dvh shrink-0 flex-col border-r border-amber-200/70 bg-gradient-to-b from-amber-50/80 via-background to-background transition-all duration-300',
        showFull ? 'w-72' : 'w-16'
      )}
    >
      <div className="flex min-h-[72px] items-center gap-3 px-4">
        <BrandMark size={36} />
        {showFull && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">TaskFlow Leader</p>
            <p className="truncate text-xs text-amber-700">Không gian điều phối nhóm</p>
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
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white/80 p-3 shadow-sm">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: user.color || '#f59e0b' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <Badge className="mt-1 bg-amber-100 text-[10px] text-amber-800 hover:bg-amber-100">Leader</Badge>
            </div>
          </div>
        </div>
      )}

      <Separator />
      <nav className="min-h-0 flex-1 overflow-y-auto space-y-1 p-3">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setCurrentView(id);
              closeMobileMenu();
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              currentView === id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-amber-100/80 hover:text-amber-950'
            )}
            title={!showFull ? label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {showFull && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      <Separator />
      <div className="space-y-2 p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            'w-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground',
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
        {showFull && <p className="text-center text-xs text-muted-foreground">{activeTasks} việc đang theo dõi</p>}
      </div>
    </aside>
  );
}
