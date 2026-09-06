'use client';

import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Link2, Loader2, Plus, QrCode, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { readApiJson } from '@/lib/client-api';

type MemberInvite = {
  id: string;
  token: string;
  label: string | null;
  active: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function MemberInvitesPanel() {
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [selectedInvite, setSelectedInvite] = useState<MemberInvite | null>(null);

  useEffect(() => {
    void loadInvites();
  }, []);

  const selectedInviteUrl = useMemo(
    () => (selectedInvite ? buildInviteUrl(selectedInvite.token) : ''),
    [selectedInvite]
  );

  function buildInviteUrl(token: string) {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    return `${origin}/?invite=${encodeURIComponent(token)}`;
  }

  async function loadInvites() {
    setLoading(true);
    try {
      const response = await fetch('/api/member-invites', { cache: 'no-store' });
      const data = await readApiJson<MemberInvite[]>(response, 'Không thể tải link mời');
      setInvites(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không thể tải link mời');
    } finally {
      setLoading(false);
    }
  }

  async function createInvite() {
    setCreating(true);
    try {
      const response = await fetch('/api/member-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      const invite = await readApiJson<MemberInvite>(response, 'Không thể tạo link mời');
      setInvites((current) => [invite, ...current]);
      setLabel('');
      setSelectedInvite(invite);
      toast.success('Đã tạo link mời mới');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo link mời');
    } finally {
      setCreating(false);
    }
  }

  async function copyInvite(invite: MemberInvite) {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(invite.token));
      toast.success('Đã sao chép link mời');
    } catch {
      toast.error('Không thể sao chép link. Hãy mở mã QR hoặc sao chép thủ công.');
    }
  }

  async function setInviteActive(invite: MemberInvite, active: boolean) {
    setUpdatingId(invite.id);
    try {
      const response = await fetch(`/api/member-invites/${invite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const updated = await readApiJson<MemberInvite>(response, 'Không thể cập nhật link mời');
      setInvites((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedInvite?.id === updated.id) setSelectedInvite(updated);
      toast.success(active ? 'Link mời đã được mở lại' : 'Link mời đã được thu hồi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật link mời');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/80 via-background to-background">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-amber-700" />
            Mời thành viên vào nhóm
          </CardTitle>
          <CardDescription>
            Thành viên đăng ký từ link hoặc QR này sẽ tự thuộc nhóm của bạn và chỉ bạn mới duyệt được.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadInvites()} disabled={loading} className="shrink-0">
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Làm mới
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-label">Tên gợi nhớ cho link (không bắt buộc)</Label>
            <Input
              id="invite-label"
              value={label}
              maxLength={80}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ví dụ: Nhóm dự án Website"
            />
          </div>
          <Button onClick={() => void createInvite()} disabled={creating} className="sm:w-auto">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Tạo link mời
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải link mời...
          </div>
        ) : invites.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Chưa có link mời nào. Tạo link đầu tiên để mời Thành viên vào nhóm của bạn.
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => {
              const inviteUrl = buildInviteUrl(invite.token);
              const isUpdating = updatingId === invite.id;
              return (
                <div
                  key={invite.id}
                  className={cn(
                    'rounded-xl border bg-background p-3 transition-colors sm:p-4',
                    !invite.active && 'border-dashed bg-muted/30 opacity-80'
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{invite.label || 'Link mời thành viên'}</p>
                        <Badge variant={invite.active ? 'default' : 'secondary'}>
                          {invite.active ? 'Đang hoạt động' : 'Đã thu hồi'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Đã dùng {invite.useCount} lần · Tạo ngày {formatDate(invite.createdAt)}
                      </p>
                      <p className="max-w-full truncate font-mono text-xs text-muted-foreground" title={inviteUrl}>
                        {inviteUrl}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Button type="button" size="sm" variant="outline" onClick={() => void copyInvite(invite)}>
                        <Copy className="mr-1.5 h-4 w-4" /> Sao chép
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setSelectedInvite(invite)}>
                        <QrCode className="mr-1.5 h-4 w-4" /> QR
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={invite.active ? 'destructive' : 'outline'}
                        onClick={() => void setInviteActive(invite, !invite.active)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : invite.active ? <Link2 className="mr-1.5 h-4 w-4" /> : <Check className="mr-1.5 h-4 w-4" />}
                        {invite.active ? 'Thu hồi' : 'Mở lại'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(selectedInvite)} onOpenChange={(open) => !open && setSelectedInvite(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedInvite?.label || 'Mã QR mời thành viên'}</DialogTitle>
            <DialogDescription>
              Người quét mã sẽ đăng ký vào nhóm của bạn và chờ bạn duyệt.
            </DialogDescription>
          </DialogHeader>
          {selectedInvite && (
            <div className="space-y-4 py-2">
              <div className="mx-auto flex w-fit rounded-2xl border bg-white p-4 shadow-sm">
                <QRCodeSVG value={selectedInviteUrl} size={220} level="M" includeMargin />
              </div>
              <p className="break-all rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
                {selectedInviteUrl}
              </p>
              <Button className="w-full" onClick={() => void copyInvite(selectedInvite)}>
                <Copy className="mr-2 h-4 w-4" /> Sao chép link mời
              </Button>
              {!selectedInvite.active && (
                <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <ShieldCheck className="h-4 w-4 shrink-0" /> Link này đã bị thu hồi và không thể dùng để đăng ký.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
