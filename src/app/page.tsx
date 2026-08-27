'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { DashboardView } from '@/components/views/dashboard-view';
import { ProjectsView } from '@/components/views/projects-view';
import { BoardView } from '@/components/views/board-view';
import { MembersView } from '@/components/views/members-view';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const { currentView, sidebarOpen, setSidebarOpen, setTasks, setProjects, setMembers } = useAppStore();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile, setSidebarOpen]);

  // Fetch initial data
  useEffect(() => {
    fetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {});
    fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {});
    fetch('/api/members').then((r) => r.json()).then(setMembers).catch(() => {});
  }, [setTasks, setProjects, setMembers]);

  function renderView() {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'projects':
        return <ProjectsView />;
      case 'board':
        return <BoardView />;
      case 'members':
        return <MembersView />;
      default:
        return <DashboardView />;
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
              <AppSidebar />
            </div>
          </>
        )}

        {/* Desktop sidebar */}
        {!isMobile && <AppSidebar />}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className={
            currentView === 'board'
              ? 'p-4 md:p-6 h-full'
              : 'p-4 md:p-6'
          }>
            {renderView()}
          </div>

          {/* Sticky footer */}
          <footer className="border-t mt-auto">
            <div className="px-4 md:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>TaskFlow v1.0 - Quản lý công việc nhóm</span>
              <span>Tích hợp Google Docs & Sheets</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
