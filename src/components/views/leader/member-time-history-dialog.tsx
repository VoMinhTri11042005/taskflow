'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemberWorkHours, TimeLog } from '@/types';
import { useAppStore } from '@/stores/app-store';
import { readApiJson } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

type HistoryPage = { logs: TimeLog[]; nextCursor: string | null };

function formatInstant(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(log: TimeLog) {
  const end = log.checkOut ? new Date(log.checkOut).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - new Date(log.checkIn).getTime()) / 60_000));
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

export function MemberTimeHistoryDialog({ member, leaderId, onClose }: {
  member: MemberWorkHours;
  leaderId: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (nextCursor: string | null) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const requestController = new AbortController();
    controller.current = requestController;
    if (nextCursor) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ mode: 'history', limit: '50', userId: member.userId });
      if (nextCursor) params.set('cursor', nextCursor);
      const response = await fetch(`/api/time-logs?${params}`, { cache: 'no-store', signal: requestController.signal });
      if (response.status === 401 || response.status === 403) {
        if (mounted.current && useAppStore.getState().user?.id === leaderId) {
          setLogs([]); setCursor(null); setForbidden(true);
          setError('Bạn không còn quyền xem lịch sử của thành viên này.');
        }
        return;
      }
      const page = await readApiJson<HistoryPage>(response, 'Không thể tải lịch sử chấm công');
      if (!page || !Array.isArray(page.logs) || !(typeof page.nextCursor === 'string' || page.nextCursor === null)) throw new Error('Dữ liệu lịch sử không hợp lệ');
      const currentUser = useAppStore.getState().user;
      if (!mounted.current || requestController.signal.aborted || currentUser?.id !== leaderId || currentUser.role !== 'leader') return;
      setLogs((previous) => {
        if (!nextCursor) return page.logs;
        const existing = new Set(previous.map((log) => log.id));
        return [...previous, ...page.logs.filter((log) => !existing.has(log.id))];
      });
      setCursor(page.nextCursor);
      setForbidden(false);
    } catch (cause) {
      if (mounted.current && !requestController.signal.aborted && useAppStore.getState().user?.id === leaderId) {
        setError(cause instanceof Error ? cause.message : 'Không thể tải lịch sử chấm công');
      }
    } finally {
      if (controller.current === requestController) inFlight.current = false;
      if (mounted.current && controller.current === requestController && !requestController.signal.aborted && useAppStore.getState().user?.id === leaderId) {
        setLoading(false); setLoadingMore(false);
      }
    }
  }, [leaderId, member.userId]);

  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => { if (mounted.current) void load(null); });
    return () => { mounted.current = false; controller.current?.abort(); controller.current = null; inFlight.current = false; };
  }, [load]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pr-6">
          <DialogTitle>Lịch sử chấm công: {member.userName}</DialogTitle>
          <DialogDescription>Thời gian hiển thị theo giờ Việt Nam (UTC+7). Mỗi lần tải tối đa 50 phiên.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" aria-label="Đang tải lịch sử" /></div> : logs.length === 0 ? (
          !error && <p className="py-6 text-center text-sm text-muted-foreground">Thành viên chưa có phiên chấm công.</p>
        ) : (
          <div className="max-h-[50dvh] space-y-2 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><span>{formatInstant(log.checkIn)} → {log.checkOut ? formatInstant(log.checkOut) : 'Đang chấm công'}</span><span className="font-semibold">{formatDuration(log)}</span></div>
                {log.note && <p className="mt-1 break-words text-xs text-muted-foreground">{log.note}</p>}
              </div>
            ))}
          </div>
        )}
        {!loading && !forbidden && (error || cursor) && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => void load(cursor)} disabled={loadingMore}>
              {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loadingMore ? 'Đang tải...' : error ? 'Thử lại' : 'Tải thêm phiên cũ'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
