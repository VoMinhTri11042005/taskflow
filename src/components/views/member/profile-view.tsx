'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { ActivityLog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  ListTodo,
  Clock,
  TrendingUp,
  Mail,
  Pencil,
  X,
  Save,
  LogIn,
  LogOut,
  Timer,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ProfileView() {
  const { user, tasks, setUser } = useAppStore();

  /* Profile edit state */
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  /* Password change state */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  /* Activity logs state */
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  /* Stats calculated from assigned tasks */
  const myTasks = tasks.filter((t) => t.assigneeId === user?.teamMemberId);
  const totalAssigned = myTasks.length;
  const completedTasks = myTasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress').length;
  const completionRate = totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  const statCards = [
    {
      label: 'Việc được giao',
      value: totalAssigned,
      icon: ListTodo,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
    },
    {
      label: 'Đã hoàn thành',
      value: completedTasks,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      label: 'Đang thực hiện',
      value: inProgressTasks,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      label: 'Tỷ lệ hoàn thành',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
  ];

  /* Fetch activity logs */
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/activity-logs?userId=${userId}`);
        const data = await res.json();
        setActivityLogs(data);
      } catch {
        /* silent */
      } finally {
        setLoadingActivity(false);
      }
    }
    fetchActivity();
  }, [user?.id]);

  /* Profile edit handlers */
  function startEditing() {
    setEditName(user?.name || '');
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditName('');
  }

  async function saveName() {
    if (!editName.trim()) {
      toast.error('Tên không được để trống');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, name: editName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Không thể cập nhật tên');
        return;
      }
      setUser({ ...user!, name: editName.trim() });
      toast.success('Đã cập nhật tên thành công');
      setIsEditing(false);
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  }

  /* Password change handler */
  async function handleChangePassword() {
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu không khớp');
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Không thể đổi mật khẩu');
        return;
      }
      toast.success('Đổi mật khẩu thành công');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setChangingPw(false);
    }
  }

  /* Calculate working time today from login/logout pairs */
  function getTodayWorkTime() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    /* Get today's login/logout logs sorted by time */
    const todayLogs = activityLogs
      .filter((log) => new Date(log.createdAt).getTime() >= todayStart)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let totalMs = 0;
    let lastLoginTime: number | null = null;

    for (const log of todayLogs) {
      const logTime = new Date(log.createdAt).getTime();
      if (log.action === 'login') {
        lastLoginTime = logTime;
      } else if (log.action === 'logout' && lastLoginTime !== null) {
        totalMs += logTime - lastLoginTime;
        lastLoginTime = null;
      }
    }

    /* If currently logged in (has login without matching logout), count to now */
    if (lastLoginTime !== null) {
      totalMs += Date.now() - lastLoginTime;
    }

    const totalMinutes = Math.floor(totalMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  }

  /* Format relative time for activity log */
  function formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /* Format time of day */
  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const workTime = getTodayWorkTime();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hồ sơ</h1>
        <p className="text-muted-foreground">Thông tin cá nhân và thống kê</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{ backgroundColor: user?.color || '#6b7280' }}
            >
              {initials}
            </div>
            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="max-w-[250px]"
                    placeholder="Nhập tên mới"
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={saveName}
                      disabled={saving}
                      className="h-8"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      <span className="ml-1">Lưu</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="h-8"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="ml-1">Hủy</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{user?.name || 'Thành viên'}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditing}
                    className="h-7 w-7 p-0"
                    title="Chỉnh sửa tên"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Badge variant="secondary" className="w-fit">Thành viên</Badge>
                </div>
              )}
              {user?.email && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground mt-1">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', stat.bgColor)}>
                  <Icon className={cn('h-4 w-4', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Change password card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pw">Mật khẩu hiện tại</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPw(!showNewPw)}
              >
                {showNewPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPw}
            className="w-full sm:w-auto"
          >
            {changingPw && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Đổi mật khẩu
          </Button>
        </CardContent>
      </Card>

      {/* Activity / Working time card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Lịch sử hoạt động
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Today's working time summary */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Timer className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Tổng thời gian làm việc hôm nay</p>
              <p className="text-lg font-bold text-primary">
                {workTime.hours} giờ {workTime.minutes} phút
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Login/logout timeline */}
          {loadingActivity ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Đang tải lịch sử...</div>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Không có dữ liệu hoạt động
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {activityLogs
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((log) => {
                  const isLogin = log.action === 'login';
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                          isLogin ? 'bg-emerald-100' : 'bg-slate-100'
                        )}
                      >
                        {isLogin ? (
                          <LogIn className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <LogOut className="h-4 w-4 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {isLogin ? 'Đăng nhập' : 'Đăng xuất'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(log.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
