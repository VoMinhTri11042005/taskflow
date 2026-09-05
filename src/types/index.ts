export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  leaderId?: string | null;
  userId?: string | null;
  accountStatus?: 'pending' | 'approved' | 'rejected' | string;
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
  leaderId?: string | null;
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
  type: 'google_doc' | 'google_sheet' | 'google_slide' | 'google_form' | 'other';
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'leader' | 'member';
  status?: 'pending' | 'approved' | 'rejected';
  color: string;
  avatar?: string | null;
  teamMemberId?: string | null;
}

export type ManagementRole = 'admin' | 'leader';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'task_assigned' | 'deadline' | 'overdue' | 'task_completed';
  read: boolean;
  createdAt: string;
  userId: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
  userId: string;
  user?: { id: string; name: string; color: string } | null;
}

export interface TimeLog {
  id: string;
  checkIn: string;
  checkOut?: string | null;
  note?: string | null;
  createdAt: string;
  userId: string;
  user?: { id: string; name: string; color: string; email: string } | null;
}

export interface MemberWorkHours {
  userId: string;
  userName: string;
  userColor: string;
  userEmail: string;
  todayMinutes: number;
  weekMinutes: number;
  totalMinutes: number;
  todaySessions: number;
  weekSessions: number;
  isCurrentlyWorking: boolean;
  checkInTime?: string | null;
}

export interface Poll {
  id: string;
  title: string;
  description?: string | null;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  options?: PollOption[];
  _count?: { votes: number };
}

export interface PollOption {
  id: string;
  label: string;
  pollId: string;
  votes?: PollVote[];
}

export interface PollVote {
  id: string;
  createdAt: string;
  userId: string;
  optionId: string;
  pollId: string;
}

export type AdminViewType = 'members';
export type LeaderViewType = 'leader-dashboard' | 'projects' | 'board' | 'members' | 'polls' | 'leader-time';
export type MemberViewType = 'my-tasks' | 'projects' | 'team' | 'polls' | 'notifications' | 'profile' | 'time-tracking';
export type ViewType = AdminViewType | LeaderViewType | MemberViewType;
