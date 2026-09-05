import { create } from 'zustand';
import type { ViewType, TeamMember, Project, Task, DashboardStats, User, Notification, ActivityLog, Poll } from '@/types';

interface AppState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // Data
  members: TeamMember[];
  setMembers: (members: TeamMember[]) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  stats: DashboardStats | null;
  setStats: (stats: DashboardStats) => void;

  // Polls
  polls: Poll[];
  setPolls: (polls: Poll[]) => void;

  // Activity
  activityLogs: ActivityLog[];
  setActivityLogs: (logs: ActivityLog[]) => void;

  // Filters
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'members',
  setCurrentView: (view) => set({ currentView: view }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Auth
  user: null,
  setUser: (user) => set({ user }),

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications: Array.isArray(notifications) ? notifications : [] }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),

  // Data
  members: [],
  setMembers: (members) => set({ members: Array.isArray(members) ? members : [] }),
  projects: [],
  setProjects: (projects) => set({ projects: Array.isArray(projects) ? projects : [] }),
  tasks: [],
  setTasks: (tasks) => set({ tasks: Array.isArray(tasks) ? tasks : [] }),
  stats: null,
  setStats: (stats) => set({ stats }),

  // Polls
  polls: [],
  setPolls: (polls) => set({ polls: Array.isArray(polls) ? polls : [] }),

  // Activity
  activityLogs: [],
  setActivityLogs: (logs) => set({ activityLogs: Array.isArray(logs) ? logs : [] }),

  // Filters
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  selectedMemberId: null,
  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
}));
