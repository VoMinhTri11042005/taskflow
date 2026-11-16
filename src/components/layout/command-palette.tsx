'use client';

import * as React from 'react';
import { useAppStore } from '@/stores/app-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  CheckSquare,
  FolderKanban,
  Users,
  Timer,
  Vote,
  Sun,
  Moon,
  ArrowRight,
  LayoutDashboard,
  UserRound,
  Bell,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type { ViewType } from '@/types';

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    tasks,
    projects,
    members,
    user,
    setCurrentView,
    setSelectedProjectId,
    openTaskDetail,
  } = useAppStore();
  const { setTheme } = useTheme();
  const [query, setQuery] = React.useState('');

  const isAdmin = user?.role === 'admin';
  const isLeader = user?.role === 'leader';

  const actions: { view: ViewType; label: string; icon: typeof Search }[] = isAdmin
    ? [
        { view: 'admin-overview', label: 'Tổng quan hệ thống', icon: LayoutDashboard },
        { view: 'leaders', label: 'Danh sách Leader', icon: UserRound },
        { view: 'members', label: 'Danh sách thành viên', icon: Users },
        { view: 'notifications', label: 'Thông báo', icon: Bell },
      ]
    : isLeader
      ? [
          { view: 'leader-dashboard', label: 'Tổng quan điều hành', icon: LayoutDashboard },
          { view: 'board', label: 'Bảng công việc', icon: CheckSquare },
          { view: 'projects', label: 'Dự án', icon: FolderKanban },
          { view: 'members', label: 'Thành viên', icon: Users },
          { view: 'leader-time', label: 'Chấm công thành viên', icon: Timer },
          { view: 'polls', label: 'Khảo sát & biểu quyết', icon: Vote },
          { view: 'notifications', label: 'Thông báo', icon: Bell },
        ]
      : [
          { view: 'my-tasks', label: 'Công việc của tôi', icon: CheckSquare },
          { view: 'projects', label: 'Dự án', icon: FolderKanban },
          { view: 'time-tracking', label: 'Chấm công & theo dõi giờ', icon: Timer },
          { view: 'team', label: 'Nhóm', icon: Users },
          { view: 'polls', label: 'Khảo sát & biểu quyết', icon: Vote },
          { view: 'notifications', label: 'Thông báo', icon: Bell },
          { view: 'profile', label: 'Hồ sơ của tôi', icon: UserRound },
        ];
  const visibleActions = actions.filter((action) => action.label.toLowerCase().includes(query.trim().toLowerCase()));

  // Listen to keyboard shortcut (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const filteredTasks = React.useMemo(() => {
    if (isAdmin) return [];
    if (!query.trim()) return tasks.slice(0, 5);
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [tasks, query, isAdmin]);

  const filteredProjects = React.useMemo(() => {
    if (isAdmin) return [];
    if (!query.trim()) return projects.slice(0, 3);
    const q = query.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    ).slice(0, 4);
  }, [projects, query, isAdmin]);

  const filteredMembers = React.useMemo(() => {
    if (!query.trim()) return members.slice(0, 3);
    const q = query.trim().toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    ).slice(0, 4);
  }, [members, query]);

  const handleSelectTask = (task: typeof tasks[0]) => {
    setCommandPaletteOpen(false);
    openTaskDetail(task);
  };

  const handleNavigate = (view: ViewType) => {
    setCommandPaletteOpen(false);
    setCurrentView(view);
  };

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden shadow-2xl border border-border/60 bg-popover/95 backdrop-blur-xl">
        <DialogTitle className="sr-only">Tìm kiếm và điều hướng nhanh</DialogTitle>
        <DialogDescription className="sr-only">Tìm công việc, dự án, thành viên hoặc chọn một mục điều hướng.</DialogDescription>
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border/50">
          <Search className="h-5 w-5 text-muted-foreground mr-3 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm kiếm nhanh"
            placeholder="Tìm kiếm công việc, dự án, thành viên hoặc thao tác..."
            className="flex-1 bg-transparent text-sm md:text-base outline-none placeholder:text-muted-foreground/70"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-4 text-sm">
          {/* Quick Actions */}
          {visibleActions.length > 0 && <div>
            <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Điều hướng & Thao tác nhanh
            </div>
            <div className="space-y-0.5 mt-1">
              {visibleActions.map(({ view, label, icon: Icon }) => (
                <button key={view} type="button" onClick={() => handleNavigate(view)} className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/80 text-left transition-colors group">
                  <div className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-primary" /><span>{label}</span></div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>}

          {/* Tasks Results */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Công việc ({filteredTasks.length})</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTask(t)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/80 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">{t.title}</span>
                      {t.project && (
                        <span className="hidden sm:inline-flex text-[11px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 shrink-0">
                          {t.project.name}
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      t.status === 'done' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      t.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                      t.status === 'review' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {t.status === 'done' ? 'Hoàn thành' : t.status === 'in_progress' ? 'Đang làm' : t.status === 'review' ? 'Xem xét' : 'Cần làm'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects Results */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Dự án ({filteredProjects.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCommandPaletteOpen(false);
                      setSelectedProjectId(p.id);
                      setCurrentView(isLeader ? 'board' : 'my-tasks');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/80 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{p._count?.tasks || 0} công việc</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Members Results */}
          {filteredMembers.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Thành viên ({filteredMembers.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCommandPaletteOpen(false);
                      setCurrentView(isAdmin || isLeader ? 'members' : 'team');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/80 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: m.color }}>
                        {m.name.charAt(0)}
                      </div>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">({m.email})</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground capitalize">{m.role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() && visibleActions.length === 0 && filteredTasks.length === 0 && filteredProjects.length === 0 && filteredMembers.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Không tìm thấy kết quả phù hợp.</p>
          )}

          {/* Theme Quick Actions */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between px-3 text-xs text-muted-foreground">
            <span>Giao diện:</span>
            <div className="flex gap-2">
              <button onClick={() => setTheme('light')} className="hover:text-foreground flex items-center gap-1">
                <Sun className="h-3.5 w-3.5 text-amber-500" /> Sáng
              </button>
              <span>•</span>
              <button onClick={() => setTheme('dark')} className="hover:text-foreground flex items-center gap-1">
                <Moon className="h-3.5 w-3.5 text-indigo-400" /> Tối
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
