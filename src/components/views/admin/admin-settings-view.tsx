'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { toast } from 'sonner';

export function AdminSettingsView() {
  const { user, members, projects, tasks } = useAppStore();
  const [seeding, setSeeding] = useState(false);

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

      {/* Account card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Tài khoản
          </CardTitle>
          <CardDescription>
            Thông tin tài khoản đang đăng nhập
          </CardDescription>
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
                  <p className="text-sm font-medium">{user.name}</p>
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
