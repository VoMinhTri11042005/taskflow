import { create } from 'zustand';
import type { ViewType, TeamMember, Project, Task, DashboardStats, User, Notification, ActivityLog, Poll, TimeLog } from '@/types';
import { withNormalizedProjectName } from '@/lib/project-name';

function normalizeTaskProject(task: Task): Task {
  return task.project
    ? { ...task, project: withNormalizedProjectName(task.project) }
    : task;
}

interface AppState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Task Drawer & Selection
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  taskDrawerOpen: boolean;
  setTaskDrawerOpen: (open: boolean) => void;
  openTaskDetail: (task: Task) => void;
  closeTaskDetail: () => void;

  // Board Multi-view Mode
  boardViewMode: 'kanban' | 'table' | 'calendar';
  setBoardViewMode: (mode: 'kanban' | 'table' | 'calendar') => void;

  // Live Active Time Log (Floating Timer)
  activeTimeLog: TimeLog | null;
  setActiveTimeLog: (log: TimeLog | null) => void;

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

  // Filters & Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
  selectedPriority: string | null;
  setSelectedPriority: (priority: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'admin-overview',
  setCurrentView: (view) => set({ currentView: view }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Command Palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  // Task Drawer & Selection
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task }),
  taskDrawerOpen: false,
  setTaskDrawerOpen: (open) => set({ taskDrawerOpen: open }),
  openTaskDetail: (task) => set({ selectedTask: task, taskDrawerOpen: true }),
  closeTaskDetail: () => set({ selectedTask: null, taskDrawerOpen: false }),

  // Board View Mode
  boardViewMode: 'kanban',
  setBoardViewMode: (mode) => set({ boardViewMode: mode }),

  // Live Active Time Log
  activeTimeLog: null,
  setActiveTimeLog: (activeTimeLog) => set({ activeTimeLog }),

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
  setProjects: (projects) => set({
    projects: Array.isArray(projects) ? projects.map(withNormalizedProjectName) : [],
  }),
  tasks: [],
  setTasks: (tasks) => set({
    tasks: Array.isArray(tasks) ? tasks.map(normalizeTaskProject) : [],
  }),
  stats: null,
  setStats: (stats) => set({ stats }),

  // Polls
  polls: [],
  setPolls: (polls) => set({ polls: Array.isArray(polls) ? polls : [] }),

  // Activity
  activityLogs: [],
  setActivityLogs: (logs) => set({ activityLogs: Array.isArray(logs) ? logs : [] }),

  // Filters & Search
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  selectedMemberId: null,
  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
  selectedPriority: null,
  setSelectedPriority: (selectedPriority) => set({ selectedPriority }),
}));
