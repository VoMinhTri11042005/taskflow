'use client';

import * as React from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Timer, Square, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function FloatingTimer() {
  const { user, currentView, setCurrentView, activeTimeLog, setActiveTimeLog } = useAppStore();
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [minimized, setMinimized] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Fetch active time log on mount / user change
  const checkActiveSession = React.useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/time-logs?userId=${user.id}`);
      if (res.ok) {
        const logs = await res.json();
        const active = logs.find((l: any) => !l.checkOut);
        if (active) {
          setActiveTimeLog(active);
        } else {
          setActiveTimeLog(null);
        }
      }
    } catch {}
  }, [user, setActiveTimeLog]);

  React.useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  // Live timer interval
  React.useEffect(() => {
    if (!activeTimeLog || !activeTimeLog.checkIn) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(activeTimeLog.checkIn).getTime();
    const updateElapsed = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(diff > 0 ? diff : 0);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimeLog]);

  if (!user || !activeTimeLog) return null;

  // Don't show floating widget if already in time-tracking view
  if (currentView === 'time-tracking') return null;

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleQuickCheckOut = async () => {
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

      if (res.ok) {
        setActiveTimeLog(null);
        toast.success('Đã kết thúc ca làm việc thành công!');
      } else {
        toast.error('Lỗi khi check-out.');
      }
    } catch {
      toast.error('Lỗi kết nối.');
    } finally {
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
