'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { MemberWorkHours } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { readApiJson } from '@/lib/client-api';
import { Clock3, Loader2 } from 'lucide-react';
import { MemberTimeHistoryDialog } from '@/components/views/leader/member-time-history-dialog';

function formatMinutes(value: number) {
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export function LeaderTimeView() {
  const userId = useAppStore((state) => state.user?.id);
  const [summary, setSummary] = useState<MemberWorkHours[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorForUserId, setErrorForUserId] = useState<string | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [selection, setSelection] = useState<{ leaderId: string; memberId: string } | null>(null);
  const historyTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let requestSequence = 0;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (!active || document.visibilityState !== 'visible') return;
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      const sequence = ++requestSequence;
      const isCurrent = () => {
        const currentUser = useAppStore.getState().user;
        return active && !requestController.signal.aborted && sequence === requestSequence && currentUser?.id === userId && currentUser.role === 'leader';
      };
      try {
        const response = await fetch('/api/time-logs?mode=admin-summary', { cache: 'no-store', signal: requestController.signal });
        if (response.status === 401 || response.status === 403) {
          if (isCurrent()) {
            setSummary([]); setSelection(null); setLoadedForUserId(userId);
            setError('Bạn không còn quyền xem dữ liệu chấm công.'); setErrorForUserId(userId);
          }
          return;
        }
        const data = await readApiJson<MemberWorkHours[]>(response, 'Không thể tải dữ liệu chấm công');
        if (!Array.isArray(data)) throw new Error('Dữ liệu chấm công không hợp lệ');
        if (isCurrent()) {
          setSummary(data);
          setSelection((current) => current && (current.leaderId !== userId || !data.some((member) => member.userId === current.memberId)) ? null : current);
          setLoadedForUserId(userId);
          setError(null);
          setErrorForUserId(null);
        }
      } catch (cause) {
        if (isCurrent()) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải dữ liệu chấm công');
          setErrorForUserId(userId);
        }
      }
    };
    queueMicrotask(() => { void refresh(); });
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, retryVersion]);

  const visibleSummary = loadedForUserId === userId ? summary : [];
  const currentError = errorForUserId === userId ? error : null;
  const selectedMember = selection && userId && selection.leaderId === userId ? visibleSummary.find((member) => member.userId === selection.memberId) : undefined;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Thời gian làm việc của nhóm</h1><p className="text-muted-foreground">Theo dõi check-in/check-out của các thành viên trong nhóm bạn quản lý.</p></div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4 text-blue-600" />Tổng hợp hôm nay</CardTitle><CardDescription>Dữ liệu tự cập nhật mỗi 30 giây khi mở trang. Thống kê theo giờ Việt Nam (UTC+7).</CardDescription></CardHeader>
        <CardContent>
          {currentError && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>{currentError}{visibleSummary.length > 0 ? ' Dữ liệu bên dưới có thể chưa mới.' : ''}</span><Button size="sm" variant="outline" onClick={() => setRetryVersion((value) => value + 1)}>Thử lại</Button></div>}
          {!currentError && loadedForUserId !== userId ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : visibleSummary.length === 0 ? (!currentError && <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu thời gian từ thành viên.</p>) : (
            <div className="space-y-3">
              {visibleSummary.map((member) => (
                <div key={member.userId} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: member.userColor }}>{member.userName.charAt(0)}</div>
                    <div className="min-w-0"><p className="truncate font-medium">{member.userName}</p><p className="truncate text-xs text-muted-foreground">{member.userEmail}</p></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <div className="text-xs text-muted-foreground sm:text-right">
                      <p><span className="font-semibold text-foreground">{formatMinutes(member.todayMinutes)}</span> hôm nay · <span className="font-semibold text-foreground">{formatMinutes(member.weekMinutes)}</span> tuần này</p>
                      <p className="mt-1">Tổng cộng: <span className="font-semibold text-foreground">{formatMinutes(member.totalMinutes)}</span></p>
                    </div>
                    <Badge variant={member.isCurrentlyWorking ? 'default' : 'secondary'}>{member.isCurrentlyWorking ? 'Đang chấm công' : 'Không chấm công'}</Badge>
                    <Button size="sm" variant="outline" aria-label={`Xem lịch sử chấm công của ${member.userName}`} onClick={(event) => { if (!userId) return; historyTrigger.current = event.currentTarget; setSelection({ leaderId: userId, memberId: member.userId }); }}>Xem lịch sử</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedMember && userId && <MemberTimeHistoryDialog key={`${userId}:${selectedMember.userId}`} member={selectedMember} leaderId={userId} onClose={() => { setSelection(null); requestAnimationFrame(() => historyTrigger.current?.focus()); }} />}
    </div>
  );
}
