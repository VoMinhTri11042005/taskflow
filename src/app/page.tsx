'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { MemberSidebar } from '@/components/layout/member-sidebar';
import { LoginForm } from '@/components/auth/login-form';
import { DashboardView } from '@/components/views/dashboard-view';
import { ProjectsView } from '@/components/views/projects-view';
import { BoardView } from '@/components/views/board-view';
import { MembersView } from '@/components/views/members-view';
import { AdminPollsView } from '@/components/views/admin/admin-polls-view';
import { AdminActivityView } from '@/components/views/admin/admin-activity-view';
import { AdminReportsView } from '@/components/views/admin/admin-reports-view';
import { AdminSettingsView } from '@/components/views/admin/admin-settings-view';
import { MyTasksView } from '@/components/views/member/my-tasks-view';
import { MemberProjectsView } from '@/components/views/member/member-projects-view';
import { MemberTeamView } from '@/components/views/member/member-team-view';
import { MemberPollsView } from '@/components/views/member/member-polls-view';
import { NotificationsView } from '@/components/views/member/notifications-view';
import { ProfileView } from '@/components/views/member/profile-view';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useState } from 'react';

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

  const adminViews = ['dashboard', 'board', 'projects', 'members', 'polls', 'activity', 'reports', 'settings'] as const;
  const memberViews = ['my-tasks', 'projects', 'polls', 'team', 'notifications', 'profile'] as const;

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

  /* Set correct initial view based on role */
  useEffect(() => {
    if (!user) return;
    if (user.role === 'member' && !(memberViews as readonly string[]).includes(currentView)) {
      setCurrentView('my-tasks');
    }
    if (user.role === 'admin' && !(adminViews as readonly string[]).includes(currentView)) {
      setCurrentView('dashboard');
    }
  }, [user, currentView, setCurrentView]);

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
    fetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {});
    fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {});
    fetch('/api/members').then((r) => r.json()).then(setMembers).catch(() => {});
    fetch('/api/polls').then((r) => r.json()).then(setPolls).catch(() => {});
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

  const Sidebar = isAdmin ? AdminSidebar : MemberSidebar;

  function renderView() {
    if (isAdmin) {
      switch (currentView) {
        case 'dashboard': return <DashboardView />;
        case 'projects': return <ProjectsView />;
        case 'board': return <BoardView />;
        case 'members': return <MembersView />;
        case 'polls': return <AdminPollsView />;
        case 'activity': return <AdminActivityView />;
        case 'reports': return <AdminReportsView />;
        case 'settings': return <AdminSettingsView />;
        default: return <DashboardView />;
      }
    } else {
      switch (currentView) {
        case 'my-tasks': return <MyTasksView />;
        case 'projects': return <MemberProjectsView />;
        case 'team': return <MemberTeamView />;
        case 'polls': return <MemberPollsView />;
        case 'notifications': return <NotificationsView />;
        case 'profile': return <ProfileView />;
        default: return <MyTasksView />;
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isMobile && (
        <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 backdrop-blur px-4 h-14">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-bold">TaskFlow</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {isAdmin ? 'Quản trị viên' : 'Thành viên'}
          </span>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {isMobile && mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50">
              <Sidebar />
            </div>
          </>
        )}

        {!isMobile && <Sidebar />}

        <main className="flex-1 overflow-y-auto">
          <div className={currentView === 'board' || currentView === 'my-tasks' ? 'p-4 md:p-6 h-full' : 'p-4 md:p-6'}>
            {renderView()}
          </div>

          <footer className="border-t mt-auto">
            <div className="px-4 md:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>TaskFlow v2.0 - {isAdmin ? 'Giao diện Quản trị' : 'Giao diện Thành viên'}</span>
              <span>Tích hợp Google Docs, Sheets, Slides</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
