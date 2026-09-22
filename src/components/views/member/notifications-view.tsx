'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Notification } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Info,
  AlertTriangle,
  Bell,
  BellOff,
  UserCheck,
  UserPlus,
  UserX,
  CheckCheck,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureApiSuccess, readApiJson } from '@/lib/client-api';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  task_assigned: { icon: ClipboardList, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Giao việc' },
  deadline: { icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10', label: 'Hạn chót' },
  overdue: { icon: AlertTriangle, color: 'text-rose-500', bgColor: 'bg-rose-500/10', label: 'Quá hạn' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'Hoàn thành' },
  success: { icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'Thành công' },
  info: { icon: Info, color: 'text-sky-500', bgColor: 'bg-sky-500/10', label: 'Thông tin' },
  warning: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-500/10', label: 'Cảnh báo' },
  account_pending: { icon: UserPlus, color: 'text-violet-500', bgColor: 'bg-violet-500/10', label: 'Tài khoản' },
  account_approved: { icon: UserCheck, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'Đã duyệt' },
  account_rejected: { icon: UserX, color: 'text-rose-500', bgColor: 'bg-rose-500/10', label: 'Từ chối' },
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export function NotificationsView() {
  const { user, notifications, setNotifications, unreadCount, setUnreadCount } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    async function fetchNotifications() {
      try {
        const res = await fetch(`/api/notifications?userId=${userId}`);
        const data = await readApiJson<Notification[]>(res, 'Không thể tải thông báo');
        setNotifications(data);
        const unread = data.filter((n: Notification) => !n.read).length;
        setUnreadCount(unread);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, [user?.id, setNotifications, setUnreadCount]);

  async function handleMarkRead(notification: Notification) {
    if (notification.read) return;
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      await ensureApiSuccess(response, 'Không thể đánh dấu đã đọc');
      setNotifications(
        notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch {
      toast.error('Không thể đánh dấu đã đọc');
    }
  }

  async function handleMarkAllRead() {
    const unreadNotifications = notifications.filter((n) => !n.read);
    if (unreadNotifications.length === 0) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, markAll: true }),
      });
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  }

  const displayedNotifications = useMemo(() => {
    if (filterMode === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filterMode]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Trung tâm thông báo</h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs font-mono h-5 px-2 bg-primary">
                {unreadCount} chưa đọc
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cập nhật tức thì về phân công công việc, phê duyệt và thời hạn
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 px-3 text-xs font-medium gap-1.5 shadow-2xs"
            >
              <CheckCheck className="h-3.5 w-3.5 text-primary" />
              <span>Đọc tất cả</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs / Filter */}
      <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-muted-foreground w-fit">
        <Button
          variant={filterMode === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 px-3 text-xs font-medium rounded-md transition-all',
            filterMode === 'all' && 'bg-background text-foreground shadow-2xs'
          )}
          onClick={() => setFilterMode('all')}
        >
          Tất cả ({notifications.length})
        </Button>
        <Button
          variant={filterMode === 'unread' ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 px-3 text-xs font-medium rounded-md transition-all',
            filterMode === 'unread' && 'bg-background text-foreground shadow-2xs'
          )}
          onClick={() => setFilterMode('unread')}
        >
          Chưa đọc ({unreadCount})
        </Button>
      </div>

      {/* Notifications List */}
      {displayedNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border/70 bg-card/40">
          <BellOff className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            {filterMode === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {filterMode === 'unread'
              ? 'Tuyệt vời! Bạn đã xem hết tất cả thông báo mới nhất.'
              : 'Khi có nhiệm vụ mới được giao hoặc có phản hồi từ Leader, thông báo sẽ xuất hiện tại đây.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedNotifications.map((notification) => {
            const config = typeConfig[notification.type] || typeConfig.info;
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                onClick={() => handleMarkRead(notification)}
                className={cn(
                  'cursor-pointer transition-all border-border/60 rounded-xl overflow-hidden',
                  notification.read
                    ? 'bg-card/50 opacity-75 hover:opacity-100 hover:bg-card/80'
                    : 'bg-card/95 border-primary/30 shadow-2xs hover:shadow-sm'
                )}
              >
                <CardContent className="p-3.5 flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', config.bgColor, config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <h4 className={cn('text-xs font-semibold truncate', !notification.read ? 'text-foreground' : 'text-muted-foreground')}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
