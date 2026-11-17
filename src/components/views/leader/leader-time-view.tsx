'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { MemberWorkHours } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { readApiJson } from '@/lib/client-api';
import { Clock3, Loader2 } from 'lucide-react';

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
        const data = await readApiJson<MemberWorkHours[]>(response, 'Không thể tải dữ liệu chấm công');
        if (!Array.isArray(data)) throw new Error('Dữ liệu chấm công không hợp lệ');
        if (isCurrent()) {
          setSummary(data);
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

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Thời gian làm việc của nhóm</h1><p className="text-muted-foreground">Theo dõi check-in/check-out của các thành viên trong nhóm bạn quản lý.</p></div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4 text-blue-600" />Tổng hợp hôm nay</CardTitle><CardDescription>Dữ liệu tự cập nhật mỗi 30 giây khi mở trang. Thống kê theo giờ Việt Nam (UTC+7).</CardDescription></CardHeader>
        <CardContent>
          {currentError && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>{currentError}{visibleSummary.length > 0 ? ' Dữ liệu bên dưới có thể chưa mới.' : ''}</span><Button size="sm" variant="outline" onClick={() => setRetryVersion((value) => value + 1)}>Thử lại</Button></div>}
          {!currentError && loadedForUserId !== userId ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : visibleSummary.length === 0 ? (!currentError && <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu thời gian từ thành viên.</p>) : <div className="space-y-3">{visibleSummary.map((member) => <div key={member.userId} className="flex items-center justify-between rounded-xl border p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: member.userColor }}>{member.userName.charAt(0)}</div><div><p className="font-medium">{member.userName}</p><p className="text-xs text-muted-foreground">{member.userEmail}</p></div></div><div className="text-right"><Badge variant={member.isCurrentlyWorking ? 'default' : 'secondary'}>{member.isCurrentlyWorking ? 'Đang chấm công' : 'Không chấm công'}</Badge><p className="mt-1 text-sm font-semibold">{formatMinutes(member.todayMinutes)} hôm nay</p></div></div>)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
