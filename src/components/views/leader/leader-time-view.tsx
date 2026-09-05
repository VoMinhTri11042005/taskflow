'use client';

import { useEffect, useState } from 'react';
import type { MemberWorkHours } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock3, Loader2 } from 'lucide-react';

function formatMinutes(value: number) {
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export function LeaderTimeView() {
  const [summary, setSummary] = useState<MemberWorkHours[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/time-logs?mode=admin-summary')
      .then((response) => response.json())
      .then((data) => setSummary(Array.isArray(data) ? data : []))
      .catch(() => setSummary([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Thời gian làm việc của nhóm</h1><p className="text-muted-foreground">Theo dõi check-in/check-out của các thành viên trong nhóm bạn quản lý.</p></div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4 text-amber-600" />Tổng hợp hôm nay</CardTitle><CardDescription>Dữ liệu được cập nhật khi thành viên check-in hoặc check-out.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : summary.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu thời gian từ thành viên.</p> : <div className="space-y-3">{summary.map((member) => <div key={member.userId} className="flex items-center justify-between rounded-xl border p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: member.userColor }}>{member.userName.charAt(0)}</div><div><p className="font-medium">{member.userName}</p><p className="text-xs text-muted-foreground">{member.userEmail}</p></div></div><div className="text-right"><Badge variant={member.isCurrentlyWorking ? 'default' : 'secondary'}>{member.isCurrentlyWorking ? 'Đang làm việc' : 'Ngoại tuyến'}</Badge><p className="mt-1 text-sm font-semibold">{formatMinutes(member.todayMinutes)} hôm nay</p></div></div>)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
