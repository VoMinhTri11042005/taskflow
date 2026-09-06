'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, Plus, QrCode, RefreshCw, Trash2, UserPlus, Users, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import type { Project, TeamMember } from '@/types';
import { readApiJson } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ProjectMembership = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    color: string;
    avatar?: string | null;
    teamMemberId?: string | null;
  };
};

type ProjectInvite = {
  id: string;
  token: string;
  label: string | null;
  active: boolean;
  useCount: number;
  createdAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ProjectMembersDialog({ project, onChanged }: { project: Project; onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ProjectMembership[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<ProjectInvite | null>(null);

  const availableMembers = useMemo(() => {
    const occupied = new Set(members.filter((member) => member.status !== 'rejected').map((member) => member.user.id));
    return teamMembers.filter((member) => member.role === 'member' && member.userId && !occupied.has(member.userId));
  }, [members, teamMembers]);

  function buildInviteUrl(token: string) {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    return `${origin}/join?projectInvite=${encodeURIComponent(token)}`;
  }

  const selectedInviteUrl = selectedInvite ? buildInviteUrl(selectedInvite.token) : '';

  async function load() {
    setLoading(true);
    try {
      const [membershipResponse, rosterResponse, inviteResponse] = await Promise.all([
        fetch(`/api/projects/${project.id}/members`, { cache: 'no-store' }),
        fetch('/api/members', { cache: 'no-store' }),
        fetch(`/api/project-invites?projectId=${encodeURIComponent(project.id)}`, { cache: 'no-store' }),
      ]);
      const membershipData = await readApiJson<{ members: ProjectMembership[] }>(membershipResponse, 'Không thể tải thành viên dự án');
      const rosterData = await readApiJson<TeamMember[]>(rosterResponse, 'Không thể tải đội thành viên');
      const inviteData = await readApiJson<ProjectInvite[]>(inviteResponse, 'Không thể tải link mời dự án');
      setMembers(Array.isArray(membershipData.members) ? membershipData.members : []);
      setTeamMembers(Array.isArray(rosterData) ? rosterData : []);
      setInvites(Array.isArray(inviteData) ? inviteData : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu dự án');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(load);
  }, [open, project.id]);

  async function addMember() {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      await readApiJson(response, 'Không thể thêm Member vào dự án');
      setSelectedUserId('');
      toast.success('Đã thêm Member vào dự án');
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm Member');
    } finally {
      setSaving(false);
    }
  }

  async function reviewMember(userId: string, status: 'approved' | 'rejected') {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      });
      await readApiJson(response, 'Không thể cập nhật yêu cầu tham gia');
      toast.success(status === 'approved' ? 'Đã duyệt Member vào dự án' : 'Đã từ chối yêu cầu tham gia');
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu');
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(userId: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      await readApiJson(response, 'Không thể gỡ Member khỏi dự án');
      toast.success('Đã gỡ Member khỏi dự án');
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gỡ Member');
    } finally {
      setSaving(false);
    }
  }

  async function createInvite() {
    setSaving(true);
    try {
      const response = await fetch('/api/project-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, label: label.trim() || undefined }),
      });
      const invite = await readApiJson<ProjectInvite>(response, 'Không thể tạo link mời dự án');
      setInvites((current) => [invite, ...current]);
      setLabel('');
      setSelectedInvite(invite);
      toast.success('Đã tạo link mời dự án');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo link mời');
    } finally {
      setSaving(false);
    }
  }

  async function copyInvite(invite: ProjectInvite) {
    try {
      const url = buildInviteUrl(invite.token);
      await navigator.clipboard.writeText(url);
      toast.success('Đã sao chép link mời dự án');
    } catch {
      toast.error('Không thể sao chép link. Hãy dùng mã QR.');
    }
  }

  async function setInviteActive(invite: ProjectInvite, active: boolean) {
    setSaving(true);
    try {
      const response = await fetch(`/api/project-invites/${invite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const updated = await readApiJson<ProjectInvite>(response, 'Không thể cập nhật link mời dự án');
      setInvites((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (selectedInvite?.id === updated.id) setSelectedInvite(updated);
      toast.success(active ? 'Đã mở lại link mời' : 'Đã thu hồi link mời');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật link mời');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" /> Thành viên
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {project.name}</DialogTitle>
          <DialogDescription>Quản lý roster, yêu cầu tham gia và QR/link riêng của dự án này.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Thành viên</TabsTrigger>
            <TabsTrigger value="invite">Mời bằng QR/link</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Thêm từ đội của bạn</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger><SelectValue placeholder="Chọn Member" /></SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 ? (
                      <SelectItem value="__none__" disabled>Không còn Member có thể thêm</SelectItem>
                    ) : availableMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId!}>{member.name} · {member.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => void addMember()} disabled={!selectedUserId || saving}>
                <Plus className="mr-2 h-4 w-4" /> Thêm vào dự án
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải...</div>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Chưa có Member trong dự án. Thêm từ đội chung hoặc gửi QR/link mời.</div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: member.user.color }}>
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{member.user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Badge variant={member.status === 'approved' ? 'secondary' : member.status === 'pending' ? 'outline' : 'destructive'}>
                        {member.status === 'approved' ? 'Đang tham gia' : member.status === 'pending' ? 'Chờ duyệt' : 'Đã từ chối'}
                      </Badge>
                      {member.status === 'pending' ? (
                        <>
                          <Button size="icon" variant="outline" className="text-emerald-600" title="Duyệt" disabled={saving} onClick={() => void reviewMember(member.user.id, 'approved')}><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant="outline" className="text-destructive" title="Từ chối" disabled={saving} onClick={() => void reviewMember(member.user.id, 'rejected')}><X className="h-4 w-4" /></Button>
                        </>
                      ) : member.status === 'approved' ? (
                        <Button size="icon" variant="outline" className="text-destructive" title="Gỡ khỏi dự án" disabled={saving} onClick={() => void removeMember(member.user.id)}><Trash2 className="h-4 w-4" /></Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`project-invite-${project.id}`}>Tên gợi nhớ (không bắt buộc)</Label>
                <Input id={`project-invite-${project.id}`} value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} placeholder="Ví dụ: Nhóm thiết kế dự án" />
              </div>
              <Button onClick={() => void createInvite()} disabled={saving || project.status !== 'active'}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Tạo QR/link
              </Button>
            </div>

            {project.status !== 'active' && (
              <p className="text-xs text-muted-foreground">Dự án đã lưu trữ nên không thể tạo hoặc mở lại link mời.</p>
            )}

            {selectedInvite && selectedInviteUrl && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
                <p className="mb-3 text-sm font-medium">QR mời vào dự án {project.name}</p>
                <div className="inline-flex rounded-xl bg-white p-3 shadow-sm"><QRCodeSVG value={selectedInviteUrl} size={190} level="M" includeMargin /></div>
                <p className="mt-3 break-all text-xs text-muted-foreground">{selectedInviteUrl}</p>
              </div>
            )}

            {invites.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Chưa có link mời riêng cho dự án này.</div>
            ) : (
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div key={invite.id} className={cn('rounded-xl border p-3', !invite.active && 'opacity-60')}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{invite.label || 'Link mời dự án'}</p><Badge variant={invite.active ? 'secondary' : 'outline'}>{invite.active ? 'Đang mở' : 'Đã thu hồi'}</Badge></div>
                        <p className="mt-1 text-xs text-muted-foreground">{invite.useCount} lượt dùng · tạo {formatDate(invite.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void copyInvite(invite)}><Copy className="mr-1.5 h-3.5 w-3.5" /> Sao chép</Button>
                        <Button size="sm" variant="outline" onClick={() => setSelectedInvite(invite)}><QrCode className="mr-1.5 h-3.5 w-3.5" /> QR</Button>
                        <Button size="sm" variant={invite.active ? 'destructive' : 'outline'} disabled={saving || (!invite.active && project.status !== 'active')} onClick={() => void setInviteActive(invite, !invite.active)}>
                          {invite.active ? 'Thu hồi' : <><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Mở lại</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
