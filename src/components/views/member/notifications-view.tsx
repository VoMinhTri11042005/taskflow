'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Notification } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  task_assigned: { icon: ClipboardList, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  deadline: { icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  overdue: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  success: { icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  info: { icon: Info, color: 'text-slate-500', bgColor: 'bg-slate-50' },
  warning: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-50' },
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  if (diffWeek < 4) return `${diffWeek} tuần trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export function NotificationsView() {
  const { user, notifications, setNotifications, unreadCount, setUnreadCount } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchNotifications() {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        const data = await res.json();
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
  }, [user, setNotifications, setUnreadCount]);

  async function handleMarkRead(notification: Notification) {
    if (notification.read) return;
    try {
      await fetch(`/api/notifications/${notification.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
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
      await Promise.all(
        unreadNotifications.map((n) =>
          fetch(`/api/notifications/${n.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true }),
          })
        )
      );
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả đã đọc');
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Đang tải thông báo...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `Bạn có ${unreadCount} thông báo chưa đọc`
                : 'Không có thông báo mới'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge className="h-6 px-2">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Đánh dấu đã đọc tất cả
          </Button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BellOff className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Không có thông báo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Thông báo mới sẽ xuất hiện ở đây
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const config = typeConfig[notification.type] || typeConfig.info;
            const Icon = config.icon;
            const isOverdue = notification.type === 'overdue';

            return (
              <Card
               key={notification.id}
                className={cn(
                  'transition-all cursor-pointer hover:shadow-sm',
                  isOverdue && 'border-l-4 border-l-red-500 bg-red-50',
                  !notification.read && !isOverdue && 'border-l-4 border-l-primary bg-primary/[0.02]'
                )}
                onClick={() => handleMarkRead(notification)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn('text-sm font-medium', !notification.read && 'font-semibold')}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
