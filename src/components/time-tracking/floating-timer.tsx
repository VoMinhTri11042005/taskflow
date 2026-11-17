'use client';

import * as React from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { toast } from 'sonner';
import type { TimeLog } from '@/types';
import { readApiJson } from '@/lib/client-api';

export function FloatingTimer() {
  const { user, currentView, setCurrentView, activeTimeLog, setActiveTimeLog } = useAppStore();
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [minimized, setMinimized] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const requestSequence = React.useRef(0);
  const checkoutInProgress = React.useRef(false);

  React.useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || checkoutInProgress.current || useAppStore.getState().currentView === 'time-tracking') return;
      const sequence = ++requestSequence.current;
      try {
        const response = await fetch('/api/time-logs?mode=active', { cache: 'no-store' });
        const summary = await readApiJson<{ activeTimeLog: TimeLog | null }>(response, 'Không thể tải phiên chấm công');
        if (active && sequence === requestSequence.current && !checkoutInProgress.current && useAppStore.getState().user?.id === userId && useAppStore.getState().currentView !== 'time-tracking') setActiveTimeLog(summary.activeTimeLog);
      } catch {}
    };
    void refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { active = false; requestSequence.current++; window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [user?.id, setActiveTimeLog]);

  // Live timer interval
  React.useEffect(() => {
    const checkIn = activeTimeLog?.checkIn;
    let animationFrameId: number | null = null;
    let intervalId: number | null = null;

    if (!checkIn) {
      // Defer the reset until after the effect commits. This keeps the effect
      // asynchronous while ensuring a newly started session never reuses an
      // elapsed value from the previous one.
      animationFrameId = window.requestAnimationFrame(() => setElapsedSeconds(0));
      return () => {
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      };
    }

    const startTime = new Date(checkIn).getTime();
    const updateElapsed = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(diff > 0 ? diff : 0);
    };

    animationFrameId = window.requestAnimationFrame(updateElapsed);
    intervalId = window.setInterval(updateElapsed, 1000);
    return () => {
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [activeTimeLog?.checkIn]);

  if (!user || !activeTimeLog) return null;

  // Don't show floating widget if already in time-tracking view
  if (currentView === 'time-tracking') return null;

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleQuickCheckOut = async () => {
    if (checkoutInProgress.current) return;
    checkoutInProgress.current = true;
    requestSequence.current++;
    const userId = user.id;
    setLoading(true);
    try {
      const res = await fetch('/api/time-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'check-out',
        }),
      });

      if (useAppStore.getState().user?.id !== userId) return;
      if (res.ok) {
        setActiveTimeLog(null);
        toast.success('Đã kết thúc ca làm việc thành công!');
      } else {
        toast.error('Lỗi khi check-out.');
      }
    } catch {
      toast.error('Lỗi kết nối.');
    } finally {
      checkoutInProgress.current = false;
      setLoading(false);
    }
  };

  return (
    <aside aria-label="Bộ đếm giờ làm việc" className="fixed bottom-20 md:bottom-5 right-3 md:right-5 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-2 p-2 px-3 rounded-2xl bg-card/95 text-card-foreground border border-emerald-500/40 shadow-xl backdrop-blur-xl transition-all">
        {/* Pulse Green Indicator */}
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </div>

        {/* Live Timer Text */}
        <div
          onClick={() => setCurrentView('time-tracking')}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          title="Nhấn để xem chi tiết chấm công"
        >
          <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
            Đang làm việc
          </div>
          <div className="text-sm font-extrabold font-mono tracking-wider">{timeString}</div>
        </div>

        {/* Quick Checkout Button */}
        <Button
          size="sm"
          variant="destructive"
          onClick={handleQuickCheckOut}
          disabled={loading}
          className="h-7 text-xs px-2.5 ml-2 gap-1 rounded-lg font-medium shadow-xs"
          title="Kết thúc ca làm"
        >
          <Square className="h-3 w-3 fill-current" />
          <span className="hidden sm:inline">Check out</span>
        </Button>
      </div>
    </aside>
  );
}
