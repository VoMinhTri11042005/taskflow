'use client';

import * as React from 'react';
import { useAppStore } from '@/stores/app-store';
import type { MemberViewType } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  CheckSquare,
  Timer,
  Layers,
  Users,
  Vote,
  Bell,
  User,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const memberNavItems: { id: MemberViewType; label: string; icon: React.ElementType }[] = [
  { id: 'my-tasks', label: 'Công việc của tôi', icon: CheckSquare },
  { id: 'time-tracking', label: 'Chấm công', icon: Timer },
  { id: 'projects', label: 'Dự án', icon: Layers },
  { id: 'polls', label: 'Khảo sát', icon: Vote },
  { id: 'team', label: 'Đội ngũ', icon: Users },
  { id: 'notifications', label: 'Thông báo', icon: Bell },
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: User },
];

export function MemberSidebar() {
  const {
    currentView,
    setCurrentView,
    sidebarCollapsed,
    user,
    setUser,
    tasks,
    unreadCount,
    polls,
    activeTimeLog,
  } = useAppStore();

  const isMobile = useIsMobile();
  const showFull = isMobile || !sidebarCollapsed;

  const closeMobileMenu = () => {
    window.dispatchEvent(new CustomEvent('close-mobile-menu'));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      toast.success('Đã đăng xuất thành công');
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  const getItemBadge = (id: MemberViewType) => {
    switch (id) {
      case 'my-tasks':
        return tasks.filter((t) => t.status !== 'done').length;
      case 'notifications':
        return unreadCount;
      case 'polls':
        return polls.filter((p) => p.status === 'active').length;
      case 'time-tracking':
        return activeTimeLog ? 'Đang bật' : 0;
      default:
        return 0;
    }
  };

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl transition-all duration-300 ease-in-out z-20',
        isMobile ? 'w-[min(18rem,calc(100vw-1rem))]' : showFull ? 'w-64' : 'w-[68px]'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border/40">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
            TF
          </div>
          {showFull && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-sm tracking-tight leading-tight">TaskFlow</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Thành viên</span>
            </div>
          )}
        </div>

        {isMobile && (
          <Button variant="ghost" size="icon" onClick={closeMobileMenu} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {memberNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const badge = getItemBadge(item.id);

          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                if (isMobile) closeMobileMenu();
              }}
              title={!showFull ? item.label : undefined}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground')} />
              
              {showFull && (
                <div className="flex-1 flex items-center justify-between text-left truncate">
                  <span className="truncate">{item.label}</span>
                  {badge !== 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.2 rounded-full',
                        isActive
                          ? 'bg-white/20 text-white'
                          : typeof badge === 'string'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border/50'
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <Separator className="opacity-50" />

      {/* Footer Profile & Action */}
      <div className="p-3 space-y-2">
        {showFull && user && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/40">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs"
              style={{ backgroundColor: user.color || '#10b981' }}
            >
              {user.name?.charAt(0)}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            'w-full text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors',
            showFull ? 'justify-start gap-2 px-3' : 'justify-center px-0'
          )}
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {showFull && <span>Đăng xuất</span>}
        </Button>
      </div>
    </aside>
  );
}
