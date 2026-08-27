export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  assigneeId?: string | null;
  assignee?: TeamMember | null;
  project?: Project | null;
  links?: TaskLink[];
}

export interface TaskLink {
  id: string;
  title: string;
  url: string;
  type: 'google_doc' | 'google_sheet' | 'other';
  taskId: string;
  createdAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  upcomingDeadlines: Task[];
  memberWorkload: { memberId: string; memberName: string; memberColor: string; count: number }[];
}

export type ViewType = 'dashboard' | 'projects' | 'board' | 'members';
