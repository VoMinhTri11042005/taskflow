'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { MemberSidebar } from '@/components/layout/member-sidebar';
import { LoginForm } from '@/components/auth/login-form';
import { DashboardView } from '@/components/views/dashboard-view';
import { ProjectsView } from '@/components/views/projects-view';
import { BoardView } from '@/components/views/board-view';
import { MembersView } from '@/components/views/members-view';
import { AdminReportsView } from '@/components/views/admin/admin-reports-view';
import { AdminSettingsView } from '@/components/views/admin/admin-settings-view';
import { MyTasksView } from '@/components/views/member/my-tasks-view';
import { MemberProjectsView } from '@/components/views/member/member-projects-view';
import { MemberTeamView } from '@/components/views/member/member-team-view';
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
    user, setNotifications, setUnreadCount
  } = useAppStore();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

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
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile, setSidebarOpen]);

  /* Set correct initial view based on role */
  useEffect(() => {
    if (!user) return;
    if (user.role === 'member' && currentView !== 'my-tasks' && !(['my-tasks', 'projects', 'team', 'notifications', 'profile'] as const).includes(currentView as any)) {
      setCurrentView('my-tasks');
    }
    if (user.role === 'admin' && currentView !== 'dashboard' && !(['dashboard', 'projects', 'board', 'members', 'reports', 'settings'] as const).includes(currentView as any)) {
      setCurrentView('dashboard');
    }
  }, [user, currentView, setCurrentView]);

  /* Fetch data when user is logged in */
  useEffect(() => {
    if (!user) return;
    fetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {});
    fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {});
    fetch('/api/members').then((r) => r.json()).then(setMembers).catch(() => {});
  }, [setTasks, setProjects, setMembers, user]);

  /* Fetch notifications for members */
  useEffect(() => {
    if (!user || user.role === 'admin') return;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  /* Login gate */
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
        case 'reports': return <AdminReportsView />;
        case 'settings': return <AdminSettingsView />;
        default: return <DashboardView />;
      }
    } else {
      switch (currentView) {
        case 'my-tasks': return <MyTasksView />;
        case 'projects': return <MemberProjectsView />;
        case 'team': return <MemberTeamView />;
        case 'notifications': return <NotificationsView />;
        case 'profile': return <ProfileView />;
        default: return <MyTasksView />;
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile header */}
      {isMobile && (
        <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 backdrop-blur px-4 h-14">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
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
        {/* Mobile overlay sidebar */}
        {isMobile && mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50">
              <Sidebar />
            </div>
          </>
        )}

        {/* Desktop sidebar */}
        {!isMobile && <Sidebar />}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className={
            currentView === 'board' || currentView === 'my-tasks'
              ? 'p-4 md:p-6 h-full'
              : 'p-4 md:p-6'
          }>
            {renderView()}
          </div>

          {/* Sticky footer */}
          <footer className="border-t mt-auto">
            <div className="px-4 md:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>TaskFlow v2.0 - {isAdmin ? 'Giao diện Quản trị' : 'Giao diện Thành viên'}</span>
              <span>Tích hợp Google Docs & Sheets</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
