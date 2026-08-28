'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { TimeLog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  PlayCircle,
  StopCircle,
  Clock,
  Timer,
  Calendar,
  TrendingUp,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} phút`;
  return `${h} giờ ${m} phút`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(d);
  targetDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - targetDate.getTime()) / 86400000);

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function TimeTrackingView() {
  const { user } = useAppStore();

  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [currentSession, setCurrentSession] = useState<TimeLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [noteInput, setNoteInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* Fetch time logs */
  const fetchLogs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/time-logs?userId=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTimeLogs(data);
        const open = data.find((l: TimeLog) => !l.checkOut);
        setIsWorking(!!open);
        setCurrentSession(open || null);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* Live timer for current session */
  useEffect(() => {
    if (!isWorking || !currentSession) return;
    const checkInTime = new Date(currentSession.checkIn).getTime();
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - checkInTime) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isWorking, currentSession]);

  /* Calculate stats from logs */
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  const todayLogs = timeLogs.filter((l) => new Date(l.checkIn) >= todayStart);
  const weekLogs = timeLogs.filter((l) => new Date(l.checkIn) >= weekStart);

  const todayMinutes = todayLogs.reduce((acc, l) => {
    const end = l.checkOut ? new Date(l.checkOut).getTime() : now.getTime();
    return acc + (end - new Date(l.checkIn).getTime()) / 60000;
  }, 0);

  const weekMinutes = weekLogs.reduce((acc, l) => {
    const end = l.checkOut ? new Date(l.checkOut).getTime() : now.getTime();
    return acc + (end - new Date(l.checkIn).getTime()) / 60000;
  }, 0);

  const totalMinutes = timeLogs.reduce((acc, l) => {
    const end = l.checkOut ? new Date(l.checkOut).getTime() : now.getTime();
    return acc + (end - new Date(l.checkIn).getTime()) / 60000;
  }, 0);

  /* Handlers */
  async function handleCheckIn() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/time-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-in', note: noteInput || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Không thể check-in');
        return;
      }
      toast.success(data.message || 'Check-in thành công!');
      setNoteInput('');
      fetchLogs();
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/time-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-out', note: noteInput || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Không thể check-out');
        return;
      }
      toast.success(data.message || 'Check-out thành công!');
      setNoteInput('');
      fetchLogs();
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  }

  /* Format live timer */
  const timerHours = Math.floor(elapsedSeconds / 3600);
  const timerMinutes = Math.floor((elapsedSeconds % 3600) / 60);
  const timerSeconds = elapsedSeconds % 60;
  const timerDisplay = `${String(timerHours).padStart(2, '0')}:${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;

  const statCards = [
    { label: 'Hôm nay', value: formatDuration(Math.round(todayMinutes)), icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Tuần này', value: formatDuration(Math.round(weekMinutes)), icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Tổng cộng', value: formatDuration(Math.round(totalMinutes)), icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
    { label: 'Số phiên', value: String(timeLogs.length), icon: Timer, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Đang tải dữ liệu chấm công...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chấm công</h1>
        <p className="text-muted-foreground">Quản lý thời gian làm việc của bạn</p>
      </div>

      {/* Check-in / Check-out card */}
      <Card className={cn(
        'border-2',
        isWorking ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Live timer */}
            <div className="relative">
              <div className={cn(
                'h-28 w-28 rounded-full flex items-center justify-center border-4',
                isWorking ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-300 bg-slate-50'
              )}>
                {isWorking ? (
                  <>
                    <span className="text-2xl font-mono font-bold text-emerald-700">{timerDisplay}</span>
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  </>
                ) : (
                  <Clock className="h-10 w-10 text-slate-400" />
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <h2 className="text-lg font-semibold">
                {isWorking ? 'Đang làm việc' : 'Chưa bắt đầu'}
              </h2>
              {isWorking && currentSession && (
                <p className="text-sm text-muted-foreground mt-1">
                  Bắt đầu từ {formatTime(currentSession.checkIn)}
                </p>
              )}
              {!isWorking && (
                <p className="text-sm text-muted-foreground mt-1">
                  Nhấn nút bên dưới để bắt đầu chấm công
                </p>
              )}
            </div>

            {/* Note input */}
            <div className="w-full max-w-sm">
              <Input
                placeholder="Ghi chú (không bắt buộc)..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isWorking) handleCheckIn();
                  if (e.key === 'Enter' && isWorking) handleCheckOut();
                }}
              />
            </div>

            {/* Action button */}
            <Button
              size="lg"
              onClick={isWorking ? handleCheckOut : handleCheckIn}
              disabled={actionLoading}
              className={cn(
                'min-w-[200px] text-base gap-2',
                isWorking
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              )}
            >
              {actionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isWorking ? (
                <StopCircle className="h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
              {isWorking ? 'Check-out (Kết thúc)' : 'Check-in (Bắt đầu)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={cn('border', stat.bg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('h-4 w-4', stat.color)} />
                  <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                </div>
                <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Lịch sử chấm công
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeLogs.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu chấm công</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {timeLogs.map((log) => {
                const duration = log.checkOut
                  ? (new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime()) / 60000
                  : (Date.now() - new Date(log.checkIn).getTime()) / 60000;
                const isToday = new Date(log.checkIn) >= todayStart;

                return (
                  <div
                    key={log.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      !log.checkOut ? 'border-emerald-200 bg-emerald-50/50' : 'hover:bg-muted/50'
                    )}
                  >
                    {/* Status indicator */}
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                      !log.checkOut ? 'bg-emerald-100' : 'bg-slate-100'
                    )}>
                      {!log.checkOut ? (
                        <PlayCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-slate-500" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatDate(log.checkIn)}
                        </span>
                        {!log.checkOut && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50 h-5">
                            Đang làm việc
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(log.checkIn)}
                        {log.checkOut ? ` → ${formatTime(log.checkOut)}` : ' → đang tiếp tục...'}
                      </p>
                      {log.note && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                          📝 {log.note}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="text-right shrink-0">
                      <p className={cn(
                        'text-sm font-semibold',
                        !log.checkOut ? 'text-emerald-600' : 'text-foreground'
                      )}>
                        {formatDuration(Math.round(duration))}
                      </p>
                      {!isToday && (
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(log.checkIn).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
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
