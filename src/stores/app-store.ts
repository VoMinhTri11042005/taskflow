import { create } from 'zustand';
import type { ViewType, TeamMember, Project, Task, DashboardStats } from '@/types';

interface AppState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Data
  members: TeamMember[];
  setMembers: (members: TeamMember[]) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  stats: DashboardStats | null;
  setStats: (stats: DashboardStats) => void;

  // Filters
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  members: [],
  setMembers: (members) => set({ members }),
  projects: [],
  setProjects: (projects) => set({ projects }),
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  stats: null,
  setStats: (stats) => set({ stats }),

  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  selectedMemberId: null,
  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
}));
