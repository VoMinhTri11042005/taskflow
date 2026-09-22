'use client';

import { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';

const priorityColors: Record<string, string> = {
  low: 'border-l-slate-400 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  medium: 'border-l-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  high: 'border-l-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  urgent: 'border-l-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const statusColors: Record<string, { label: string; dot: string }> = {
  todo: { label: 'Cần làm', dot: 'bg-slate-400' },
  in_progress: { label: 'Đang làm', dot: 'bg-amber-500' },
  review: { label: 'Xem xét', dot: 'bg-violet-500' },
  done: { label: 'Hoàn thành', dot: 'bg-emerald-500' },
};

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onDateClick?: (date: Date) => void;
}

export function TaskCalendarView({ tasks, onTaskClick, onDateClick }: TaskCalendarViewProps) {
  const { openTaskDetail } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      openTaskDetail(task);
    }
  };

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.dueDate) {
        try {
          const dateStr = format(parseISO(task.dueDate), 'yyyy-MM-dd');
          const existing = map.get(dateStr) || [];
          existing.push(task);
          map.set(dateStr, existing);
        } catch {
          // ignore invalid date
        }
      }
    });
    return map;
  }, [tasks]);

  const weekDayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden">
      {/* Calendar Header / Navigation */}
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-border/60 bg-muted/20 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold capitalize text-foreground">
              {format(currentMonth, 'MMMM yyyy', { locale: vi })}
            </h2>
            <p className="text-xs text-muted-foreground">
              {tasks.filter((t) => t.dueDate).length} công việc có lịch hạn chót
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs h-8 px-3 font-medium"
          >
            Hôm nay
          </Button>
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Week Day Header */}
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40 text-center text-xs font-semibold text-muted-foreground py-2.5">
        {weekDayHeaders.map((day, idx) => (
          <div key={idx} className={cn(idx >= 5 && 'text-rose-500/80')}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-border/40 min-h-[550px] overflow-y-auto">
        {days.map((day, dayIdx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);

          return (
            <div
              key={dayIdx}
              onClick={() => onDateClick?.(day)}
              className={cn(
                'group relative min-h-[110px] p-2 flex flex-col transition-colors',
                !isCurrentMonth && 'bg-muted/10 text-muted-foreground/50 opacity-60',
                isDayToday && 'bg-primary/[0.03]',
                'hover:bg-accent/40'
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    'inline-flex items-center justify-center text-xs font-semibold rounded-full h-6 w-6 transition-all',
                    isDayToday
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'text-foreground/80 group-hover:text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {dayTasks.length} việc
                  </span>
                )}
              </div>

              {/* Task Cards in Day */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-none">
                {dayTasks.map((task) => {
                  const statusInfo = statusColors[task.status] || statusColors.todo;
                  const priorityClass = priorityColors[task.priority] || priorityColors.medium;

                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task);
                      }}
                      className={cn(
                        'cursor-pointer text-[11px] p-1.5 rounded border-l-2 font-medium truncate transition-all shadow-xs',
                        'hover:scale-[1.02] hover:shadow-sm select-none',
                        priorityClass,
                        task.status === 'done' && 'opacity-60 line-through'
                      )}
                      title={`${task.title} (${statusInfo.label})`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', statusInfo.dot)} />
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
