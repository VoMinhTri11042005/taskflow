'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { ActivityLog } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogIn, LogOut, Eye, Activity } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday, subDays, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  login: { label: 'Đăng nhập', icon: LogIn, color: 'text-emerald-600 bg-emerald-50' },
  logout: { label: 'Đăng xuất', icon: LogOut, color: 'text-slate-600 bg-slate-50' },
  page_view: { label: 'Xem trang', icon: Eye, color: 'text-amber-600 bg-amber-50' },
};

function getRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return dateStr;
  }
}

interface GroupedLogs {
  label: string;
  dateKey: string;
  logs: ActivityLog[];
}

export function AdminActivityView() {
  const { members, setActivityLogs, activityLogs } = useAppStore();
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (userId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId && userId !== 'all') {
        params.set('userId', userId);
      }
      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await res.json();
      setActivityLogs(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [setActivityLogs]);

  useEffect(() => {
    const run = () => {
      void fetchLogs(filterUserId);
    };
    queueMicrotask(run);
  }, [fetchLogs, filterUserId]);

  const groupedLogs = useMemo((): GroupedLogs[] => {
    const groups: Record<string, ActivityLog[]> = {};

    for (const log of activityLogs) {
      const logDate = startOfDay(new Date(log.createdAt));
      let dateKey: string;
      let label: string;

      if (isToday(logDate)) {
        dateKey = 'today';
        label = 'Hôm nay';
      } else if (isYesterday(logDate)) {
        dateKey = 'yesterday';
        label = 'Hôm qua';
      } else {
        dateKey = format(logDate, 'yyyy-MM-dd');
        label = format(logDate, 'dd/MM/yyyy');
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'today') return -1;
      if (b === 'today') return 1;
      if (a === 'yesterday') return -1;
      if (b === 'yesterday') return 1;
      return b.localeCompare(a);
    });

    return sortedKeys.map((key) => {
      const firstLog = groups[key][0];
      let label: string;
      if (key === 'today') label = 'Hôm nay';
      else if (key === 'yesterday') label = 'Hôm qua';
      else label = format(new Date(key + 'T00:00:00'), 'EEEE, dd/MM/yyyy', { locale: vi });

      return {
        label,
        dateKey: key,
        logs: groups[key],
      };
    });
  }, [activityLogs]);

  function getUserInitials(name: string, color: string) {
    return name
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hoạt động</h1>
          <p className="text-muted-foreground">Nhật ký hoạt động của nhóm</p>
        </div>
        <Select value={filterUserId} onValueChange={setFilterUserId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Lọc theo thành viên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả thành viên</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              {[1, 2].map((j) => (
                <div key={j} className="flex gap-4 p-4 rounded-lg border">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && activityLogs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Chưa có hoạt động</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Nhật ký hoạt động sẽ xuất hiện khi thành viên sử dụng hệ thống
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grouped timeline */}
      {!loading && groupedLogs.length > 0 && (
        <div className="space-y-8">
          {groupedLogs.map((group) => (
            <div key={group.dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="secondary" className="font-medium">
                  {group.label}
                </Badge>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Timeline items */}
              <div className="relative sm:ml-5 sm:border-l-2 sm:border-border sm:pl-6 space-y-4">
                {group.logs.map((log, idx) => {
                  const config = actionConfig[log.action] || actionConfig.page_view;
                  const Icon = config.icon;
                  const userName = log.user?.name || 'Người dùng';
                  const userColor = log.user?.color || '#6b7280';
                  const initials = getUserInitials(userName, userColor);

                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'hidden sm:flex absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-background',
                        )}
                      >
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>

                      {/* Card */}
                      <Card className="group-hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: userColor }}
                            >
                              {initials}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{userName}</span>
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                      config.color
                                    )}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {config.label}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {getRelativeTime(log.createdAt)}
                                </span>
                              </div>
                              {log.details && (
                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                  {log.details}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
