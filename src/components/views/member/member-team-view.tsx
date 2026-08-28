'use client';

import { useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Shield } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  member: 'Thành viên',
};

export function MemberTeamView() {
  const { members, setMembers, tasks, setTasks } = useAppStore();

  useEffect(() => {
    fetch('/api/members').then((r) => r.json()).then(setMembers).catch(() => {});
    fetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {});
  }, [setMembers, setTasks]);

  /* Calculate task count per member and sort descending */
  const membersWithCount = useMemo(() => {
    return members
      .map((m) => ({
        ...m,
        taskCount: tasks.filter((t) => t.assigneeId === m.id && t.status !== 'done').length,
      }))
      .sort((a, b) => b.taskCount - a.taskCount);
  }, [members, tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thành viên nhóm</h1>
        <p className="text-muted-foreground">Danh sách thành viên ({members.length} người)</p>
      </div>

      {/* Members grid */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Chưa có thành viên</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Danh sách thành viên sẽ xuất hiện ở đây
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {membersWithCount.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{member.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    <Shield className="mr-1 h-3 w-3" />
                    {roleLabels[member.role] || member.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {member.taskCount} việc đang làm
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
