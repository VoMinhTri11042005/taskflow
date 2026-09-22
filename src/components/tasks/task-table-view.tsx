'use client';

import * as React from 'react';
import type { Task } from '@/types';
import { useAppStore } from '@/stores/app-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Flag,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

interface TaskTableViewProps {
  tasks: Task[];
}

export function TaskTableView({ tasks }: TaskTableViewProps) {
  const { openTaskDetail } = useAppStore();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Khẩn cấp</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Cao</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Trung bình</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/40">Thấp</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">✓ Hoàn thành</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">● Đang làm</span>;
      case 'review':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">⚑ Xem xét</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/40">○ Cần làm</span>;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-border/60 bg-card/30">
        <p className="text-sm font-medium text-muted-foreground">Không có công việc nào phù hợp với bộ lọc.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          <TableRow>
            <TableHead className="w-[30%]">Tên công việc</TableHead>
            <TableHead>Dự án</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Mức ưu tiên</TableHead>
            <TableHead>Người phụ trách</TableHead>
            <TableHead>Hạn chót</TableHead>
            <TableHead className="text-right">Tài liệu</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs divide-y divide-border/40">
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              onClick={() => openTaskDetail(task)}
              className="cursor-pointer hover:bg-muted/50 transition-colors group"
            >
              <TableCell className="font-semibold text-foreground flex items-center gap-2 py-3.5">
                <span className="truncate max-w-[280px]">{task.title}</span>
              </TableCell>

              <TableCell>
                {task.project ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-medium border border-border/40">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                    <span className="truncate max-w-[120px]">{task.project.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell>{getStatusBadge(task.status)}</TableCell>

              <TableCell>{getPriorityBadge(task.priority)}</TableCell>

              <TableCell>
                {task.assignee ? (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: task.assignee.color || '#6366f1' }}
                    >
                      {task.assignee.name.charAt(0)}
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[100px]">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Chưa gán</span>
                )}
              </TableCell>

              <TableCell className="text-muted-foreground font-medium">
                {task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yyyy') : '—'}
              </TableCell>

              <TableCell className="text-right">
                {task.links && task.links.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {task.links.length} tài liệu
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
