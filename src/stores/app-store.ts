import { create } from 'zustand';
import type { ViewType, TeamMember, Project, Task, DashboardStats, User, Notification, ActivityLog, Poll, TimeLog } from '@/types';
import { withNormalizedProjectName } from '@/lib/project-name';

function normalizeTaskProject(task: Task): Task {
  return task.project
    ? { ...task, project: withNormalizedProjectName(task.project) }
    : task;
}

type NotificationLoadToken = { session: number; revision: number; request: number; userId: string };
type NotificationMutationToken = { session: number; revision: number; userId: string };

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
  notificationSession: number;
  notificationRevision: number;
  notificationRequest: number;
  notificationAppliedRequest: number;
  notificationMutationPending: boolean;
  beginNotificationLoad: () => NotificationLoadToken | null;
  applyNotificationLoad: (token: NotificationLoadToken, notifications: Notification[]) => void;
  beginNotificationMutation: () => NotificationMutationToken | null;
  finishNotificationMutation: (token: NotificationMutationToken, readIds?: string[]) => void;

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
  setUser: (user) => set((state) => {
    const identityChanged = state.user?.id !== user?.id || state.user?.role !== user?.role;
    if (!identityChanged) return { user };
    return {
      user,
      notificationSession: state.notificationSession + 1,
      notificationRevision: state.notificationRevision + 1,
      notificationMutationPending: false,
      tasks: [], projects: [], members: [], polls: [], notifications: [], unreadCount: 0,
      selectedTask: null, taskDrawerOpen: false, activeTimeLog: null, stats: null, activityLogs: [],
      selectedProjectId: null, selectedMemberId: null, selectedPriority: null, searchQuery: '',
      commandPaletteOpen: false,
    };
  }),

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications: Array.isArray(notifications) ? notifications : [] }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  notificationSession: 0,
  notificationRevision: 0,
  notificationRequest: 0,
  notificationAppliedRequest: 0,
  notificationMutationPending: false,
  beginNotificationLoad: () => {
    let token: NotificationLoadToken | null = null;
    set((state) => {
      if (!state.user || state.notificationMutationPending) return state;
      const request = state.notificationRequest + 1;
      token = { session: state.notificationSession, revision: state.notificationRevision, request, userId: state.user.id };
      return { notificationRequest: request };
    });
    return token;
  },
  applyNotificationLoad: (token, notifications) => set((state) => {
    if (state.user?.id !== token.userId || state.notificationSession !== token.session ||
      state.notificationRevision !== token.revision || token.request <= state.notificationAppliedRequest ||
      state.notificationMutationPending || !Array.isArray(notifications)) return state;
    return { notifications, unreadCount: notifications.filter((item) => !item.read).length, notificationAppliedRequest: token.request };
  }),
  beginNotificationMutation: () => {
    let token: NotificationMutationToken | null = null;
    set((state) => {
      if (!state.user || state.notificationMutationPending) return state;
      const revision = state.notificationRevision + 1;
      token = { session: state.notificationSession, revision, userId: state.user.id };
      return { notificationRevision: revision, notificationMutationPending: true };
    });
    return token;
  },
  finishNotificationMutation: (token, readIds) => set((state) => {
    if (state.user?.id !== token.userId || state.notificationSession !== token.session ||
      state.notificationRevision !== token.revision || !state.notificationMutationPending) return state;
    const ids = new Set(readIds || []);
    const notifications = readIds ? state.notifications.map((item) => ids.has(item.id) ? { ...item, read: true } : item) : state.notifications;
    return {
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      notificationRevision: state.notificationRevision + 1,
      notificationMutationPending: false,
    };
  }),

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
