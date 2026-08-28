'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Info,
  User,
  Database,
  HardDrive,
  Users,
  FolderKanban,
  RefreshCcw,
  Shield,
  Mail,
  Pencil,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export function AdminSettingsView() {
  const { user, setUser, members, projects, tasks } = useAppStore();
  const [seeding, setSeeding] = useState(false);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  async function handleReseed() {
    setSeeding(true);
    try {
      await fetch('/api/auth/seed', { method: 'POST' });
      toast.success('Đã nạp lại dữ liệu mẫu thành công');
    } catch {
      toast.error('Có lỗi xảy ra khi nạp dữ liệu mẫu');
    } finally {
      setSeeding(false);
    }
  }

  // Profile edit handlers
  function startEditProfile() {
    setEditName(user?.name || '');
    setEditingProfile(true);
  }

  function cancelEditProfile() {
    setEditingProfile(false);
    setEditName('');
  }

  async function saveProfile() {
    if (!user || !editName.trim()) {
      toast.error('Vui lòng nhập tên');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: editName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Có lỗi xảy ra');
        return;
      }
      const updatedUser = { ...user, name: editName.trim() };
      setUser(updatedUser);
      setEditingProfile(false);
      toast.success('Đã cập nhật hồ sơ thành công');
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setSavingProfile(false);
    }
  }

  // Password change handler
  async function handleChangePassword() {
    if (!user) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Có lỗi xảy ra');
        return;
      }
      toast.success('Đã thay đổi mật khẩu thành công');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-muted-foreground">Quản lý hệ thống và tài khoản</p>
      </div>

      {/* System info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Thông tin hệ thống
          </CardTitle>
          <CardDescription>
            Thông tin chi tiết về phiên bản và cấu hình hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Ứng dụng</p>
                <p className="text-sm font-medium">TaskFlow</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phiên bản</p>
                <p className="text-sm font-medium">v2.0</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Cơ sở dữ liệu</p>
                <p className="text-sm font-medium">PostgreSQL</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Tổng người dùng</p>
                <p className="text-sm font-medium">{members.length} thành viên</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Tổng dự án</p>
                <p className="text-sm font-medium">{projects.length} dự án</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Tổng công việc</p>
                <p className="text-sm font-medium">{tasks.length} việc</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account card with inline edit */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Tài khoản
              </CardTitle>
              <CardDescription>
                Thông tin tài khoản đang đăng nhập
              </CardDescription>
            </div>
            {!editingProfile && user && (
              <Button variant="outline" size="sm" onClick={startEditProfile}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Chỉnh sửa
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
                  style={{ backgroundColor: user.color || '#6366f1' }}
                >
                  {userInitials}
                </div>
                <Badge
                  variant={user.role === 'admin' ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  <Shield className="h-3 w-3" />
                  {user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </Badge>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Họ và tên</p>
                  {editingProfile ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Họ và tên..."
                        className="max-w-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveProfile();
                          if (e.key === 'Escape') cancelEditProfile();
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={saveProfile} disabled={!editName.trim() || savingProfile}>
                        {savingProfile && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Lưu
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditProfile}>
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">{user.name}</p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Vai trò</p>
                  <p className="text-sm font-medium">
                    {user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ID tài khoản</p>
                  <p className="text-sm font-mono text-muted-foreground">{user.id}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Chưa đăng nhập
            </p>
          )}
        </CardContent>
      </Card>

      {/* Password change card */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Đổi mật khẩu
            </CardTitle>
            <CardDescription>
              Thay đổi mật khẩu đăng nhập của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label>Mật khẩu hiện tại</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                />
                {newPassword && newPassword.length < 6 && (
                  <p className="text-xs text-destructive">Mật khẩu phải có ít nhất 6 ký tự</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Xác nhận mật khẩu mới</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Mật khẩu xác nhận không khớp</p>
                )}
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword ||
                  changingPassword
                }
              >
                {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cập nhật
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seed data card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Dữ liệu mẫu
          </CardTitle>
          <CardDescription>
            Nạp lại dữ liệu mẫu để kiểm tra hệ thống. Lưu ý: điều này sẽ thay thế tất cả dữ liệu hiện tại.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Tạo lại các dự án, thành viên và công việc mẫu. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleReseed}
              disabled={seeding}
              className="shrink-0"
            >
              <RefreshCcw className={seeding ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
              {seeding ? 'Đang nạp...' : 'Nạp lại dữ liệu mẫu'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
