'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/app-store';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { LeaderSidebar } from '@/components/layout/leader-sidebar';
import { MemberSidebar } from '@/components/layout/member-sidebar';
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
import { useState } from 'react';
import { BrandMark } from '@/components/layout/brand-mark';
import { readApiJson } from '@/lib/client-api';
import type { Notification, Poll, Project, Task, TeamMember, User } from '@/types';
import { toast } from 'sonner';

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
  // New QR codes use /join, but keep older printed QR codes safe too. A
  // Leader/Admin who scans an old invite must see registration, not their
  // already-open workspace.
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

  /* Check session on mount */
  useEffect(() => {
    fetch('/api/auth/session')
      .then((response) => readApiJson<{ user: User | null }>(response, 'Không thể xác thực phiên đăng nhập'))
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setUser]);

  useEffect(() => {
    if (isMobile) { setSidebarOpen(false); } else { setSidebarOpen(true); }
  }, [isMobile, setSidebarOpen]);

  /* Close mobile menu when view changes via custom event */
  useEffect(() => {
    function handleCloseMobile() {
      setMobileMenuOpen(false);
    }
    window.addEventListener('close-mobile-menu', handleCloseMobile);
    return () => window.removeEventListener('close-mobile-menu', handleCloseMobile);
  }, [setMobileMenuOpen]);

  /* Set correct initial view based on role */
  useEffect(() => {
    if (!user) return;
    if (user.role === 'member' && !(memberViews as readonly string[]).includes(currentView)) {
      setCurrentView('my-tasks');
    }
    if (isAdmin && !(adminViews as readonly string[]).includes(currentView)) {
      setCurrentView('admin-overview');
    }
    if (isLeader && !(leaderViews as readonly string[]).includes(currentView)) {
      setCurrentView('leader-dashboard');
    }
  }, [user, currentView, setCurrentView, isAdmin, isLeader]);

  /* A signed-in Member can open a project QR/link directly. LoginForm handles
     the first-login path; this catches an already-authenticated browser. */
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

    // Do not clear the token or send a Leader/Admin to their dashboard. The
    // render below leaves the invitation form visible so this browser can
    // create or sign in to a Member account deliberately.
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

  /* Track login activity */
  const trackActivity = useCallback((action: string) => {
    if (!user) return;
    fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, action }),
    }).catch(() => {});
  }, [user]);

  /* Fetch data when user is logged in */
  useEffect(() => {
    if (!user) return;
    fetch('/api/members')
      .then((response) => readApiJson<TeamMember[]>(response, 'Không thể tải danh sách thành viên'))
      .then(setMembers)
      .catch(() => {});
    if (user.role !== 'admin') {
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
    } else {
      setTasks([]);
      setProjects([]);
      setPolls([]);
    }
    trackActivity('login');
  }, [setTasks, setProjects, setMembers, setPolls, user, trackActivity]);

  /* Keep the inbox current while the user is signed in. Server-side events
     (for example a new registration in another browser) cannot update this
     tab directly, so refresh on focus and at a modest interval. */
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
      } catch {
        // A temporary request failure must not clear the notifications already shown.
      }
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

  /* Track logout on unmount */
  useEffect(() => {
    return () => {
      if (user) {
        fetch('/api/activity-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, action: 'logout' }),
        }).catch(() => {});
      }
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
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
      {isMobile && (
        <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 backdrop-blur px-4 h-14">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <BrandMark size={28} />
            <span className="font-bold">TaskFlow</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'leader' ? 'Leader' : 'Thành viên'}
          </span>
        </header>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isMobile && mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left duration-200">
              <Sidebar />
            </div>
          </>
        )}

        {!isMobile && <Sidebar />}

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className={currentView === 'board' || currentView === 'my-tasks' ? 'p-4 md:p-6 h-full' : 'p-4 md:p-6'}>
            {renderView()}
          </div>

          <footer className="mt-auto border-t pb-16 md:pb-0">
            <div className="flex flex-col gap-1 px-4 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
              <span>TaskFlow v2.0 - {user?.role === 'admin' ? 'Giao diện Quản trị' : user?.role === 'leader' ? 'Giao diện Leader' : 'Giao diện Thành viên'}</span>
              <span>Tích hợp Google Docs, Sheets, Slides</span>
            </div>
          </footer>
        </main>
      </div>

      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
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
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground active:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="max-w-full truncate">{label}</span>
                  {hasUnread && (
                    <span className="absolute top-1 right-1/2 ml-3 h-2 w-2 rounded-full bg-destructive" />
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
                <span>Thêm</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
