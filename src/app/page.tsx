'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { LeaderSidebar } from '@/components/layout/leader-sidebar';
import { MemberSidebar } from '@/components/layout/member-sidebar';
import { GlobalHeader } from '@/components/layout/global-header';
import { CommandPalette } from '@/components/layout/command-palette';
import { TaskDrawer } from '@/components/tasks/task-drawer';
import { FloatingTimer } from '@/components/time-tracking/floating-timer';
import { LoginForm } from '@/components/auth/login-form';
import { ProjectsView } from '@/components/views/projects-view';
import { BoardView } from '@/components/views/board-view';
import { MembersView } from '@/components/views/members-view';
import { AdminPollsView } from '@/components/views/admin/admin-polls-view';
import { LeaderDashboardView } from '@/components/views/leader/leader-dashboard-view';
import { LeaderTimeView } from '@/components/views/leader/leader-time-view';
import { MyTasksView } from '@/components/views/member/my-tasks-view';
import { MemberProjectsView } from '@/components/views/member/member-projects-view';
import { MemberTeamView } from '@/components/views/member/member-team-view';
import { MemberPollsView } from '@/components/views/member/member-polls-view';
import { NotificationsView } from '@/components/views/member/notifications-view';
import { ProfileView } from '@/components/views/member/profile-view';
import { TimeTrackingView } from '@/components/views/member/time-tracking-view';
import { AdminOverviewView } from '@/components/views/admin/admin-overview-view';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Bell, FolderKanban, KanbanSquare, LayoutDashboard, ListTodo, Menu, UserRound, Users } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { readApiJson } from '@/lib/client-api';
import { AUTH_SESSION_CHANGE_KEY } from '@/lib/auth-session-client';
import type { Notification, Poll, Project, Task, TeamMember, User } from '@/types';
import { toast } from 'sonner';

function sessionUsersMatch(current: User | null, next: User) {
  return current?.id === next.id
    && current.email === next.email
    && current.name === next.name
    && current.role === next.role
    && current.color === next.color
    && current.avatar === next.avatar
    && current.teamMemberId === next.teamMemberId;
}

function defaultViewForRole(role: User['role']) {
  if (role === 'admin') return 'admin-overview' as const;
  if (role === 'leader') return 'leader-dashboard' as const;
  return 'my-tasks' as const;
}

export default function HomePage() {
  const {
    currentView, sidebarOpen, setSidebarOpen, setCurrentView,
    setTasks, setProjects, setMembers, setUser, setSelectedProjectId,
    user, setNotifications, unreadCount, setUnreadCount, setPolls
  } = useAppStore();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const handledProjectInvite = useRef<string | null>(null);
  const activeUserRef = useRef<User | null>(null);

  const [hasInviteLink] = useState(() => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    return Boolean(searchParams.get('projectInvite')?.trim() || searchParams.get('invite')?.trim());
  });

  const isAdmin = user?.role === 'admin';
  const isLeader = user?.role === 'leader';

  const mobileNavItems = isAdmin
    ? [
        { view: 'admin-overview' as const, label: 'Tổng quan', icon: LayoutDashboard },
        { view: 'leaders' as const, label: 'Leader', icon: UserRound },
        { view: 'members' as const, label: 'Thành viên', icon: Users },
      ]
    : isLeader
      ? [
          { view: 'leader-dashboard' as const, label: 'Tổng quan', icon: LayoutDashboard },
          { view: 'projects' as const, label: 'Dự án', icon: FolderKanban },
          { view: 'board' as const, label: 'Công việc', icon: KanbanSquare },
        ]
      : [
          { view: 'my-tasks' as const, label: 'Việc của tôi', icon: ListTodo },
          { view: 'projects' as const, label: 'Dự án', icon: FolderKanban },
          { view: 'notifications' as const, label: 'Thông báo', icon: Bell },
        ];

  const adminViews = ['admin-overview', 'leaders', 'members'] as const;
  const leaderViews = ['leader-dashboard', 'projects', 'board', 'members', 'polls', 'leader-time', 'notifications'] as const;
  const memberViews = ['my-tasks', 'time-tracking', 'projects', 'polls', 'team', 'notifications', 'profile'] as const;

  useEffect(() => {
    activeUserRef.current = user;
  }, [user]);

  useEffect(() => {
    const handleOpen = () => setMobileMenuOpen(true);
    const handleClose = () => setMobileMenuOpen(false);
    window.addEventListener('open-mobile-menu', handleOpen);
    window.addEventListener('close-mobile-menu', handleClose);
    return () => {
      window.removeEventListener('open-mobile-menu', handleOpen);
      window.removeEventListener('close-mobile-menu', handleClose);
    };
  }, []);

  const clearWorkspaceState = useCallback(() => {
    setTasks([]);
    setProjects([]);
    setMembers([]);
    setPolls([]);
    setNotifications([]);
    setUnreadCount(0);
    setSelectedProjectId(null);
  }, [setMembers, setNotifications, setPolls, setProjects, setSelectedProjectId, setTasks, setUnreadCount]);

  const syncSession = useCallback(async (announceChange = false) => {
    try {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await readApiJson<{ user: User | null }>(response, 'Không thể xác thực phiên đăng nhập');
      const nextUser = data.user;
      const currentUser = activeUserRef.current;

      if (!nextUser) {
        if (currentUser) {
          activeUserRef.current = null;
          clearWorkspaceState();
          setUser(null);
          if (announceChange) toast.info('Phiên đăng nhập đã kết thúc hoặc đã được thay đổi ở tab khác.');
        }
        return null;
      }

      if (!sessionUsersMatch(currentUser, nextUser)) {
        const identityChanged = Boolean(
          currentUser && (currentUser.id !== nextUser.id || currentUser.role !== nextUser.role)
        );
        activeUserRef.current = nextUser;

        if (identityChanged) {
          clearWorkspaceState();
          setCurrentView(defaultViewForRole(nextUser.role));
          if (announceChange) {
            toast.info(`Tab này đã chuyển sang tài khoản ${nextUser.name}.`);
          }
        }

        setUser(nextUser);
      }

      return nextUser;
    } catch {
      return null;
    }
  }, [clearWorkspaceState, setCurrentView, setUser]);

  useEffect(() => {
    let mounted = true;
    void syncSession().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [syncSession]);

  useEffect(() => {
    if (!user) return;
    const revalidate = () => { void syncSession(true); };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_SESSION_CHANGE_KEY) revalidate();
    };
    const intervalId = window.setInterval(revalidate, 30_000);
    window.addEventListener('focus', revalidate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncSession, user?.id]);

  useEffect(() => {
    if (isMobile) { setSidebarOpen(false); } else { setSidebarOpen(true); }
  }, [isMobile, setSidebarOpen]);

  useEffect(() => {
    function handleCloseMobile() {
      setMobileMenuOpen(false);
    }
    window.addEventListener('close-mobile-menu', handleCloseMobile);
    return () => window.removeEventListener('close-mobile-menu', handleCloseMobile);
  }, [setMobileMenuOpen]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'member' && !(memberViews as readonly string[]).includes(currentView as any)) {
      setCurrentView('my-tasks');
    }
    if (isAdmin && !(adminViews as readonly string[]).includes(currentView as any)) {
      setCurrentView('admin-overview');
    }
    if (isLeader && !(leaderViews as readonly string[]).includes(currentView as any)) {
      setCurrentView('leader-dashboard');
    }
  }, [user, currentView, setCurrentView, isAdmin, isLeader]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    const token = new URLSearchParams(window.location.search).get('projectInvite')?.trim();
    if (!token) return;
    const requestKey = `${user.id}:${token}`;
    if (handledProjectInvite.current === requestKey) return;
    handledProjectInvite.current = requestKey;

    const clearInviteFromUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('projectInvite');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    if (user.role !== 'member') return;

    void fetch('/api/project-invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể gửi yêu cầu tham gia dự án');
        toast.success(data.message || 'Đã gửi yêu cầu tham gia dự án.');
        if (data.status === 'approved' && data.projectId) {
          setSelectedProjectId(data.projectId);
          setCurrentView('my-tasks');
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Không thể gửi yêu cầu tham gia dự án');
      })
      .finally(clearInviteFromUrl);
  }, [user, setCurrentView, setSelectedProjectId]);

  const trackActivity = useCallback((action: string) => {
    if (!user) return;
    fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, action }),
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      setMembers([]);
      setTasks([]);
      setProjects([]);
      setPolls([]);
    } else {
      fetch('/api/members')
        .then((response) => readApiJson<TeamMember[]>(response, 'Không thể tải danh sách thành viên'))
        .then(setMembers)
        .catch(() => {});
      fetch('/api/tasks')
        .then((response) => readApiJson<Task[]>(response, 'Không thể tải danh sách công việc'))
        .then(setTasks)
        .catch(() => {});
      fetch('/api/projects')
        .then((response) => readApiJson<Project[]>(response, 'Không thể tải danh sách dự án'))
        .then(setProjects)
        .catch(() => {});
      fetch('/api/polls')
        .then((response) => readApiJson<Poll[]>(response, 'Không thể tải danh sách bình chọn'))
        .then(setPolls)
        .catch(() => {});
    }
    trackActivity('login');
  }, [setTasks, setProjects, setMembers, setPolls, user, trackActivity]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`, {
          cache: 'no-store',
        });
        const data = await readApiJson<Notification[]>(response, 'Không thể tải thông báo');
        if (active && Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((notification) => !notification.read).length);
        }
      } catch {}
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => void loadNotifications(), 15_000);
    window.addEventListener('focus', loadNotifications);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', loadNotifications);
    };
  }, [user?.id, setNotifications, setUnreadCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-pulse text-muted-foreground">
          <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center font-bold text-primary">TF</div>
          <span className="text-sm font-medium">Đang tải không gian làm việc...</span>
        </div>
      </div>
    );
  }

  if (!user || (hasInviteLink && user.role !== 'member')) {
    return <LoginForm initialMode={hasInviteLink ? 'register' : 'login'} />;
  }

  const Sidebar = isAdmin ? AdminSidebar : isLeader ? LeaderSidebar : MemberSidebar;

  function renderView() {
    if (isAdmin) {
      switch (currentView) {
        case 'leaders': return <MembersView roleFilter="leader" />;
        case 'members': return <MembersView roleFilter="member" />;
        case 'admin-overview': return <AdminOverviewView />;
        default: return <AdminOverviewView />;
      }
    }
    if (isLeader) {
      switch (currentView) {
        case 'leader-dashboard': return <LeaderDashboardView />;
        case 'projects': return <ProjectsView />;
        case 'board': return <BoardView />;
        case 'members': return <MembersView />;
        case 'polls': return <AdminPollsView />;
        case 'leader-time': return <LeaderTimeView />;
        case 'notifications': return <NotificationsView />;
        default: return <LeaderDashboardView />;
      }
    }
    switch (currentView) {
      case 'my-tasks': return <MyTasksView />;
      case 'time-tracking': return <TimeTrackingView />;
      case 'projects': return <MemberProjectsView />;
      case 'team': return <MemberTeamView />;
      case 'polls': return <MemberPollsView />;
      case 'notifications': return <NotificationsView />;
      case 'profile': return <ProfileView />;
      default: return <MyTasksView />;
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />

      {/* Global Task Detail Drawer (Slide-over) */}
      <TaskDrawer />

      {/* Live Floating Timer */}
      <FloatingTimer />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile Drawer */}
        {isMobile && mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left duration-200 shadow-2xl">
              <Sidebar />
            </div>
          </>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && <Sidebar />}

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Global Header */}
          <GlobalHeader />

          <main className="flex-1 overflow-y-auto overscroll-contain bg-muted/10 pb-20 md:pb-0">
            <div className={currentView === 'board' || currentView === 'my-tasks' ? 'p-3 md:p-5 h-full' : 'p-3 sm:p-4 md:p-6'}>
              {renderView()}
            </div>

            <footer className="border-t border-border/40 bg-background/50 py-3 px-4 md:px-6 mt-auto hidden md:block">
              <div className="flex flex-col gap-1 text-[11px] text-muted-foreground md:flex-row md:items-center md:justify-between">
                <span>TaskFlow Enterprise v2.0 • {isAdmin ? 'Quản trị' : isLeader ? 'Leader' : 'Thành viên'}</span>
                <span>Tích hợp Google Docs, Sheets, Slides, Forms & Chấm công</span>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-lg backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {mobileNavItems.map(({ view, label, icon: Icon }) => {
              const isActive = currentView === view;
              const hasUnread = view === 'notifications' && unreadCount > 0;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => {
                    setCurrentView(view);
                    setMobileMenuOpen(false);
                  }}
                  className={`relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium transition-colors ${
                    isActive ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground active:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="max-w-full truncate">{label}</span>
                  {hasUnread && (
                    <span className="absolute top-1 right-1/2 ml-3 h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </button>
              );
            })}
            {!isAdmin && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium text-muted-foreground transition-colors active:bg-muted"
              >
                <Menu className="h-4 w-4" />
                <span>Menu</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
