'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Poll } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, X, BarChart3, Lock, Trash2, CheckCircle2, Unlock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function AdminPollsView() {
  const { polls, setPolls } = useAppStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '']);
  const [allowMultipleChoices, setAllowMultipleChoices] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Poll | null>(null);

  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch('/api/polls');
      const data = await res.json();
      setPolls(data);
    } catch {
      toast.error('Không thể tải danh sách bình chọn');
    }
  }, [setPolls]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  function openCreateDialog() {
    setFormTitle('');
    setFormDesc('');
    setFormOptions(['', '']);
    setAllowMultipleChoices(false);
    setCreateOpen(true);
  }

  function addOption() {
    if (formOptions.length >= 10) {
      toast.error('Tối đa 10 lựa chọn');
      return;
    }
    setFormOptions([...formOptions, '']);
  }

  function removeOption(index: number) {
    if (formOptions.length <= 2) {
      toast.error('Cần ít nhất 2 lựa chọn');
      return;
    }
    setFormOptions(formOptions.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    const updated = [...formOptions];
    updated[index] = value;
    setFormOptions(updated);
  }

  async function handleCreate() {
    const validOptions = formOptions.filter((o) => o.trim());
    if (!formTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }
    if (validOptions.length < 2) {
      toast.error('Cần ít nhất 2 lựa chọn không trống');
      return;
    }
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          options: validOptions,
          allowMultipleChoices,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Có lỗi xảy ra');
        return;
      }
      toast.success('Đã tạo bình chọn thành công');
      setCreateOpen(false);
      fetchPolls();
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  }

  async function handleToggleStatus(id: string, newStatus: 'active' | 'closed') {
    const isClosing = newStatus === 'closed';
    setClosingId(id);
    try {
      const res = await fetch(`/api/polls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Có lỗi xảy ra');
        return;
      }
      toast.success(isClosing ? 'Đã đóng bình chọn' : 'Đã mở lại bình chọn');
      fetchPolls();
    } catch {
      toast.error('Lỗi kết nối mạng');
    } finally {
      setClosingId(null);
    }
  }

  function openDeleteDialog(poll: Poll) {
    setDeleteTarget(poll);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/polls/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Không thể xóa bình chọn');
        return;
      }
      toast.success('Đã xóa bình chọn');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchPolls();
    } catch {
      toast.error('Lỗi kết nối mạng');
    } finally {
      setDeletingId(null);
    }
  }

  function getOptionStats(poll: Poll) {
    if (!poll.options || poll.options.length === 0) return [];
    const totalVotes = poll.options.reduce(
      (sum, opt) => sum + ((opt as any)._count?.votes || 0),
      0
    );
    return poll.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      voteCount: (opt as any)._count?.votes || 0,
      percentage: totalVotes > 0 ? Math.round((((opt as any)._count?.votes || 0) / totalVotes) * 100) : 0,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bình chọn</h1>
          <p className="text-muted-foreground">Quản lý các cuộc bình chọn ({polls.length})</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo bình chọn
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tạo bình chọn mới</DialogTitle>
              <DialogDescription>Tạo cuộc bình chọn mới cho nhóm</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tiêu đề *</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Nhập câu hỏi bình chọn..."
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Mô tả thêm (không bắt buộc)..."
                  rows={2}
                />
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="allow-multiple-choices" className="cursor-pointer">Cho phép chọn nhiều phương án</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bật để mỗi Thành viên có thể tick nhiều lựa chọn, giống Bình chọn Zalo.
                    </p>
                  </div>
                  <Switch
                    id="allow-multiple-choices"
                    checked={allowMultipleChoices}
                    onCheckedChange={setAllowMultipleChoices}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lựa chọn * (2-10)</Label>
                  <span className="text-xs text-muted-foreground">
                    {formOptions.filter((o) => o.trim()).length} / 10
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Lựa chọn ${idx + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9"
                        onClick={() => removeOption(idx)}
                        disabled={formOptions.length <= 2}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {formOptions.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Thêm lựa chọn
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Hủy</Button>
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={!formTitle.trim() || formOptions.filter((o) => o.trim()).length < 2}
              >
                Tạo bình chọn
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteTarget(null);
        }
        setDeleteDialogOpen(open);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa bình chọn?</DialogTitle>
            <DialogDescription>
              Bình chọn &quot;{deleteTarget?.title}&quot; sẽ bị xóa vĩnh viễn cùng với tất cả kết quả.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={deletingId !== null}>Hủy</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Poll cards list */}
      {polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Chưa có bình chọn</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tạo cuộc bình chọn đầu tiên để thu thập ý kiến nhóm
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const optionStats = getOptionStats(poll);
            const totalVotes = optionStats.reduce((s, o) => s + o.voteCount, 0);
            const isActive = poll.status === 'active';

            return (
              <Card key={poll.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base truncate">{poll.title}</CardTitle>
                        <Badge
                          variant={isActive ? 'default' : 'secondary'}
                          className={isActive ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : ''}
                        >
                          {isActive ? 'Đang mở' : 'Đã đóng'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {poll.allowMultipleChoices ? 'Chọn nhiều' : 'Chọn một'}
                        </Badge>
                      </div>
                      {poll.description && (
                        <p className="text-sm text-muted-foreground">{poll.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(poll.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      {isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(poll.id, 'closed')}
                          disabled={closingId === poll.id}
                        >
                          {closingId === poll.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Lock className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Đóng
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(poll.id, 'active')}
                          disabled={closingId === poll.id}
                        >
                          {closingId === poll.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Unlock className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Mở lại
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog(poll)}
                        disabled={deletingId !== null}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Xóa
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Final result label for closed polls */}
                  {!isActive && (
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Kết quả cuối cùng
                    </div>
                  )}

                  {/* Results bars */}
                  <div className="space-y-3">
                    {optionStats.map((opt) => (
                      <div key={opt.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate mr-4">{opt.label}</span>
                          <span className="text-muted-foreground shrink-0">
                            {opt.voteCount} phiếu ({opt.percentage}%)
                          </span>
                        </div>
                        <div className="relative h-3 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className={cn(
                              'h-3 rounded-full transition-all duration-500',
                              isActive ? 'bg-cyan-500' : 'bg-muted-foreground/40'
                            )}
                            style={{ width: `${Math.max(opt.percentage, 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total votes */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Tổng lượt chọn</span>
                    <Badge variant="outline" className="font-semibold">
                      {totalVotes}
                    </Badge>
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
