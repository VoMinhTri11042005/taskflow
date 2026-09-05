'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { TeamMember, ActivityLog } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Users, Mail, Shield, Key, KeyRound, Loader2, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ensureApiSuccess, readApiJson } from '@/lib/client-api';

const roleLabels: Record<string, string> = {
  admin: 'Quản trị viên',
leader: 'Leader',
manager: 'Quản lý',
member: 'Thành viên',
};

const memberColors = [
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
  '#e11d48', '#0891b2', '#7c3aed', '#059669', '#d97706',
];

type ManagedRole = 'leader' | 'member';

interface MembersViewProps {
  /** Admin uses this to keep Leader and Member accounts on separate screens. */
  roleFilter?: ManagedRole;
}

export function MembersView({ roleFilter }: MembersViewProps) {
  const { members, setMembers, user } = useAppStore();
  const [pendingAccounts, setPendingAccounts] = useState<Array<{ id: string; name: string; email: string; role: string; status: string }>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('member');
  const [formColor, setFormColor] = useState('#10b981');
  const [formPassword, setFormPassword] = useState('');

  // Credential dialog
  const [credOpen, setCredOpen] = useState(false);
  const [credMemberId, setCredMemberId] = useState<string | null>(null);
  const [credEmail, setCredEmail] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMemberId, setResetMemberId] = useState<string | null>(null);
  const [resetName, setResetName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Online status tracking
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

  const visibleMembers = roleFilter
    ? members.filter((member) => member.role === roleFilter)
    : members;
  const visiblePendingAccounts = roleFilter
    ? pendingAccounts.filter((account) => account.role === roleFilter)
    : pendingAccounts;
  const entityLabel = roleFilter === 'leader' ? 'Leader' : 'Thành viên';
  const entityLabelLower = roleFilter === 'leader' ? 'leader' : 'thành viên';

  const fetchMembers = useCallback(async () => {
    const res = await fetch('/api/members');
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setMembers(data);
  }, [setMembers]);

  const fetchPendingAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?status=pending');
      if (!res.ok) return;
      const data = await res.json();
      setPendingAccounts(Array.isArray(data) ? data : []);
    } catch {
      setPendingAccounts([]);
    }
  }, []);

  const checkOnlineStatus = useCallback(async (memberId: string) => {
    try {
      const res = await fetch(`/api/activity-logs?userId=${memberId}`);
      const logs: ActivityLog[] = await res.json();
      if (logs.length === 0) {
        setOnlineStatus((prev) => ({ ...prev, [memberId]: false }));
        return;
      }
      const now = new Date();
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const recentLogs = logs.filter(
        (log) => new Date(log.createdAt) >= thirtyMinAgo
      );
      // Check if last login was more recent than last logout
      const lastLogin = recentLogs
        .filter((l) => l.action === 'login')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const lastLogout = recentLogs
        .filter((l) => l.action === 'logout')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const isOnline = lastLogin && (!lastLogout || new Date(lastLogin.createdAt) > new Date(lastLogout.createdAt));
      setOnlineStatus((prev) => ({ ...prev, [memberId]: !!isOnline }));
    } catch {
      setOnlineStatus((prev) => ({ ...prev, [memberId]: false }));
    }
  }, []);

  useEffect(() => {
    const run = () => {
      void fetchMembers();
      void fetchPendingAccounts();
    };
    queueMicrotask(run);
  }, [fetchMembers, fetchPendingAccounts]);

  useEffect(() => {
    members.forEach((m) => {
      checkOnlineStatus(m.id);
    });
  }, [members, checkOnlineStatus]);

  function openCreateDialog() {
    setEditingMember(null);
    setFormName('');
    setFormEmail('');
    setFormRole(roleFilter || 'member');
    setFormColor(memberColors[Math.floor(Math.random() * memberColors.length)]);
    setFormPassword('');
    setDialogOpen(true);
  }

  function openEditDialog(member: TeamMember) {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRole(member.role);
    setFormColor(member.color);
    setFormPassword('');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim() || !formEmail.trim()) return;
    try {
      if (editingMember) {
        const response = await fetch(`/api/members/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, email: formEmail, role: formRole, color: formColor }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể cập nhật thành viên');
        toast.success('Đã cập nhật thành viên');
      } else {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, email: formEmail, role: formRole, color: formColor, password: formPassword || undefined }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed');
        }
        toast.success(`Đã tạo tài khoản ${formRole === 'leader' ? 'Leader' : 'Member'} thành công`);
      }
      setDialogOpen(false);
      fetchMembers();
      fetchPendingAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      await ensureApiSuccess(response, 'Không thể xóa thành viên');
      toast.success('Đã xóa thành viên');
      await fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  }

  async function handleApproval(id: string, status: 'approved' | 'rejected') {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể cập nhật trạng thái');
      toast.success(status === 'approved' ? 'Đã duyệt tài khoản' : 'Đã từ chối tài khoản');
      await Promise.all([fetchMembers(), fetchPendingAccounts()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  }

  // View credentials
  async function openCredDialog(member: TeamMember) {
    if (user?.role !== 'admin') {
      toast.error('Chỉ Admin mới được xem thông tin đăng nhập');
      return;
    }
    setCredMemberId(member.id);
    setCredEmail('');
    setCredLoading(true);
    setCredOpen(true);
    try {
      const res = await fetch(`/api/members/credentials?userId=${member.userId || member.id}`);
      const data = await readApiJson<{ email?: string }>(res, 'Không thể tải thông tin đăng nhập');
      setCredEmail(data.email || member.email);
    } catch {
      setCredEmail(member.email);
      toast.error('Không thể tải thông tin đăng nhập');
    } finally {
      setCredLoading(false);
    }
  }

  // Reset password
  function openResetDialog(member: TeamMember) {
    setResetMemberId(member.id);
    setResetName(member.name);
    setNewPassword('');
    setResetOpen(true);
  }

  async function handleResetPassword() {
    if (!resetMemberId || !newPassword.trim()) {
      toast.error('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: members.find((member) => member.id === resetMemberId)?.userId || resetMemberId, newPassword: newPassword.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Có lỗi xảy ra');
        return;
      }
      toast.success('Đã đặt lại mật khẩu thành công');
      setResetOpen(false);
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{roleFilter ? entityLabel : 'Thành viên'}</h1>
          <p className="text-muted-foreground">
            {roleFilter
              ? `Quản lý ${entityLabelLower} (${visibleMembers.length} người)`
              : `Quản lý đội ngũ (${visibleMembers.length} người)`}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm {roleFilter ? entityLabelLower : 'thành viên'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMember ? `Chỉnh sửa ${entityLabelLower}` : `Thêm ${roleFilter ? entityLabelLower : 'thành viên'} mới`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tên *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Họ và tên..."
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <Select
                  value={formRole}
                  onValueChange={setFormRole}
                  disabled={editingMember?.role === 'admin' || Boolean(roleFilter)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editingMember?.role === 'admin' && (
                      <SelectItem value="admin">Quản trị viên duy nhất</SelectItem>
                    )}
                    {roleFilter === 'leader' ? (
                      <SelectItem value="leader">Leader</SelectItem>
                    ) : roleFilter === 'member' ? (
                      <SelectItem value="member">Thành viên</SelectItem>
                    ) : (
                      <>
                        {user?.role === 'admin' && <SelectItem value="leader">Leader</SelectItem>}
                        <SelectItem value="member">Thành viên</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {!editingMember && (
                <div className="space-y-2">
                  <Label>Mật khẩu ban đầu *</Label>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                  />
                  <p className="text-xs text-muted-foreground">Gửi mật khẩu này cho người dùng và yêu cầu đổi sau lần đăng nhập đầu.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Màu sắc</Label>
                <div className="flex flex-wrap gap-2">
                  {memberColors.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-full transition-all ${
                        formColor === color
                          ? 'ring-2 ring-offset-2 ring-primary scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Hủy</Button>
              </DialogClose>
              <Button onClick={handleSave} disabled={!formName.trim() || !formEmail.trim() || (!editingMember && formPassword.length < 6)}>
                {editingMember ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {visiblePendingAccounts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="font-semibold">Tài khoản chờ duyệt ({visiblePendingAccounts.length})</h2>
                <p className="text-sm text-muted-foreground">Kiểm tra thông tin trước khi cho phép đăng nhập hệ thống.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {visiblePendingAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{account.email} · {roleLabels[account.role] || account.role}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="outline" className="text-emerald-600" title="Duyệt" onClick={() => handleApproval(account.id, 'approved')}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="text-destructive" title="Từ chối" onClick={() => handleApproval(account.id, 'rejected')}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      {visibleMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Chưa có {roleFilter ? entityLabelLower : 'thành viên'}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Thêm {roleFilter ? entityLabelLower : 'thành viên'} đầu tiên để bắt đầu quản lý tài khoản
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMembers.map((member) => (
            <Card key={member.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Online indicator */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                          onlineStatus[member.id] ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                        title={onlineStatus[member.id] ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{member.name}</h3>
                        {onlineStatus[member.id] && (
                          <span className="text-[10px] text-emerald-600 font-medium">Trực tuyến</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {user?.role === 'admin' && <>
                      {/* Passwords are never displayed; Admin can view the login email and reset it. */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openCredDialog(member)}
                        title="Xem thông tin đăng nhập"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openResetDialog(member)}
                        title="Đặt lại mật khẩu"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </>}
                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(member)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {member.name} sẽ bị xóa khỏi nhóm. Các công việc đang gán sẽ được bỏ gán.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    <Shield className="mr-1 h-3 w-3" />
                    {roleLabels[member.role] || member.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {member._count?.tasks || 0} việc
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Credentials Dialog */}
      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xem thông tin đăng nhập</DialogTitle>
          </DialogHeader>
          {credLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email đăng nhập</Label>
                <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono font-medium">{credEmail}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Đóng</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Đặt mật khẩu mới cho <span className="font-medium text-foreground">{resetName}</span>
            </p>
            <div className="space-y-2">
              <Label>Mật khẩu mới *</Label>
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
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword.trim() || newPassword.length < 6 || resetLoading}
            >
              {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
