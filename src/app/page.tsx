'use client';

import { useEffect, useCallback } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { BrandMark } from '@/components/layout/brand-mark';

export default function HomePage() {
  const {
    currentView, sidebarOpen, setSidebarOpen, setCurrentView,
    setTasks, setProjects, setMembers, setUser,
    user, setNotifications, setUnreadCount, setPolls
  } = useAppStore();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isLeader = user?.role === 'leader';

  const adminViews = ['members'] as const;
  const leaderViews = ['leader-dashboard', 'projects', 'board', 'members', 'polls', 'leader-time'] as const;
  const memberViews = ['my-tasks', 'time-tracking', 'projects', 'polls', 'team', 'notifications', 'profile'] as const;

  /* Check session on mount */
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
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
      setCurrentView('members');
    }
    if (isLeader && !(leaderViews as readonly string[]).includes(currentView)) {
      setCurrentView('leader-dashboard');
    }
  }, [user, currentView, setCurrentView, isAdmin, isLeader]);

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
    fetch('/api/members').then((r) => r.json()).then(setMembers).catch(() => {});
    if (user.role !== 'admin') {
      fetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {});
      fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {});
      fetch('/api/polls').then((r) => r.json()).then(setPolls).catch(() => {});
    } else {
      setTasks([]);
      setProjects([]);
      setPolls([]);
    }
    trackActivity('login');
  }, [setTasks, setProjects, setMembers, setPolls, user, trackActivity]);

  /* Fetch notifications for all users */
  useEffect(() => {
    if (!user) return;
    fetch(`/api/notifications?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((n: { read: boolean }) => !n.read).length);
        }
      })
      .catch(() => {});
  }, [user, setNotifications, setUnreadCount]);

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

  if (!user) {
    return <LoginForm />;
  }

  const Sidebar = isAdmin ? AdminSidebar : isLeader ? LeaderSidebar : MemberSidebar;

  function renderView() {
    if (isAdmin) {
      switch (currentView) {
        case 'members': return <MembersView />;
        default: return <MembersView />;
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

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className={currentView === 'board' || currentView === 'my-tasks' ? 'p-4 md:p-6 h-full' : 'p-4 md:p-6'}>
            {renderView()}
          </div>

          <footer className="border-t mt-auto">
            <div className="px-4 md:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>TaskFlow v2.0 - {user?.role === 'admin' ? 'Giao diện Quản trị' : user?.role === 'leader' ? 'Giao diện Leader' : 'Giao diện Thành viên'}</span>
              <span>Tích hợp Google Docs, Sheets, Slides</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
