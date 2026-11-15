'use client';

import { Checkbox } from '@/components/ui/checkbox';
import type { Task, TeamMember } from '@/types';

export type AssigneeOption = Pick<TeamMember, 'id' | 'name' | 'email' | 'color'>;

export function getTaskAssignees(task: Task): TeamMember[] {
  return task.assignees ?? (task.assignee ? [task.assignee] : []);
}

export function getTaskAssigneeIds(task: Task): string[] {
  return task.assigneeIds ?? (task.assignees ? task.assignees.map((member) => member.id) : task.assigneeId ? [task.assigneeId] : []);
}

export function AssigneePicker({ members, selectedIds, onChange, disabled = false, loading = false }: {
  members: AssigneeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-md border border-input bg-background p-2">
      <p className="mb-2 text-xs text-muted-foreground">{selectedIds.length ? `Đã chọn ${selectedIds.length} người` : 'Chưa phân công · Có thể chọn nhiều người'}</p>
      {loading ? <p className="py-1 text-xs text-muted-foreground">Đang tải thành viên...</p> : members.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">Không có thành viên khả dụng trong dự án.</p>
      ) : (
        <div className="max-h-36 space-y-1 overflow-y-auto" role="group" aria-label="Chọn người thực hiện">
          {members.map((member) => (
            <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-xs hover:bg-muted/60">
              <Checkbox
                checked={selectedIds.includes(member.id)}
                disabled={disabled}
                onCheckedChange={(checked) => onChange(checked === true ? [...selectedIds, member.id] : selectedIds.filter((id) => id !== member.id))}
              />
              <span className="truncate">{member.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
